package com.gamewatch.service;

import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameReviewRepository;
import com.gamewatch.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * A one-off empirical check that {@link GameReviewService#getReviews} does not re-introduce
 * the per-review N+1 pattern that made review loading slow. Runs against the real local
 * database rather than mocks, because the whole point is to count actual SQL statements
 * Hibernate issues - a mocked repository cannot tell you that.
 *
 * Skips itself (rather than failing) when the local data has no game with reviews from at
 * least two different authors, since the query-count assertion is meaningless below that.
 */
@SpringBootTest
class GameReviewServiceQueryCountIT {

    @Autowired
    private GameReviewService gameReviewService;

    @Autowired
    private GameReviewRepository gameReviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private EntityManager entityManager;

    private SessionFactory sessionFactory;
    private Statistics statistics;

    @BeforeEach
    void setUp() {
        sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        statistics = sessionFactory.getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
    }

    @Test
    @Transactional
    void loadingAGamesReviewsCostsAHandfulOfQueriesNotOnePerReview() {
        Map<Long, List<GameReview>> byGame = gameReviewRepository.findAll().stream()
            .collect(Collectors.groupingBy(r -> r.getGame().getId()));

        var candidate = byGame.entrySet().stream()
            .filter(e -> e.getValue().stream().map(r -> r.getUser().getId()).distinct().count() >= 2)
            .max(Comparator.comparingInt(e -> e.getValue().size()));

        assumeTrue(candidate.isPresent(),
            "No local game has reviews from 2+ distinct authors - nothing meaningful to count");

        Long gameId = candidate.get().getKey();
        int reviewCount = candidate.get().getValue().size();
        Long viewerId = userRepository.findAll().stream().findFirst().orElseThrow().getId();

        // The setup above (finding a candidate, picking a viewer) already pulled every
        // User and Game row into this session's persistence context and Hibernate's
        // second-level cache - which would silently mask exactly the N+1 this test exists
        // to catch, since a "lazy" author already sitting in either cache costs no query.
        // Clearing both forces the measured call to hit the database for real.
        entityManager.clear();
        sessionFactory.getCache().evictAllRegions();
        User viewer = entityManager.find(User.class, viewerId);

        statistics.clear();
        List<?> reviews = gameReviewService.getReviews(viewer, gameId, "recent", null);
        long queryCount = statistics.getPrepareStatementCount();

        assertThat(reviews).hasSize(reviewCount);
        // Fixed baseline regardless of review count: the review list itself, votes,
        // replies, a batched author-scores query and a batched author-playthroughs query -
        // five queries total. Anything above that means an association is being lazily
        // re-queried per review or per author again, which is exactly the N+1 this guards
        // against (confirmed manually: stripping the author JOIN FETCH pushes this to 6+
        // against the same local data).
        assertThat(queryCount)
            .as("query count for %d reviews (%d distinct authors) should stay at the fixed baseline",
                reviewCount, candidate.get().getValue().stream().map(r -> r.getUser().getId()).distinct().count())
            .isLessThanOrEqualTo(5);
    }
}
