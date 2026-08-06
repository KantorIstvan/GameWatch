package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class PlaythroughRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PlaythroughRepository playthroughRepository;

    private User testUser;
    private Game testGame;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .auth0UserId("auth0|test123")
            .email("test@example.com")
            .username("testuser")
            .build();
        entityManager.persist(testUser);

        testGame = Game.builder()
            .name("Test Game")
            .externalId(12345)
            .build();
        entityManager.persist(testGame);

        entityManager.flush();
    }

    @Test
    void findByIdAndUserId_ExistingPlaythrough_ReturnsPlaythrough() {
        Playthrough playthrough = createPlaythrough();
        entityManager.persist(playthrough);
        entityManager.flush();

        Optional<Playthrough> result = playthroughRepository.findByIdAndUserId(playthrough.getId(), testUser.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(playthrough.getId());
    }

    @Test
    void findByUserIdOrderByCreatedAtDesc_ReturnsPlaythroughs() {
        Playthrough p1 = createPlaythrough();
        Playthrough p2 = createPlaythrough();
        entityManager.persist(p1);
        entityManager.persist(p2);
        entityManager.flush();

        List<Playthrough> results = playthroughRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId());

        assertThat(results).hasSize(2);
    }

    @Test
    void save_PersistsPlaythrough() {
        Playthrough playthrough = createPlaythrough();

        Playthrough saved = playthroughRepository.save(playthrough);
        entityManager.flush();

        assertThat(saved.getId()).isNotNull();
    }

    private Playthrough createPlaythrough() {
        return Playthrough.builder()
            .user(testUser)
            .game(testGame)
            .playthroughType("story")
            .startDate(LocalDate.now())
            .isActive(false)
            .isCompleted(false)
            .isDropped(false)
            .isPaused(false)
            .durationSeconds(0L)
            .sessionCount(0)
            .pauseCount(0)
            .sessionStartDurationSeconds(0L)
            .importedDurationSeconds(0L)
            .build();
    }

    private Playthrough completedPlaythrough(User user, String type, long seconds) {
        return Playthrough.builder()
            .user(user)
            .game(testGame)
            .playthroughType(type)
            .startDate(LocalDate.now())
            .isActive(false)
            .isCompleted(true)
            .isDropped(false)
            .isPaused(false)
            .durationSeconds(seconds)
            .sessionCount(1)
            .pauseCount(0)
            .sessionStartDurationSeconds(0L)
            .importedDurationSeconds(0L)
            .build();
    }

    private User persistUser(String suffix) {
        User user = User.builder()
            .auth0UserId("auth0|" + suffix)
            .email(suffix + "@example.com")
            .username(suffix)
            .build();
        entityManager.persist(user);
        return user;
    }

    @Test
    void findCompletionStatsByGameId_groupsByTypeAndExcludesUnfinishedPlaythroughs() {
        User secondUser = persistUser("second");
        User thirdUser = persistUser("third");

        entityManager.persist(completedPlaythrough(testUser, "story", 10_000L));
        entityManager.persist(completedPlaythrough(secondUser, "story", 20_000L));
        entityManager.persist(completedPlaythrough(thirdUser, "speedrun", 3_000L));

        // Still being played and dropped early - neither is a "time to beat" yet.
        Playthrough inProgress = createPlaythrough();
        inProgress.setIsCompleted(false);
        inProgress.setDurationSeconds(999_999L);
        entityManager.persist(inProgress);

        Playthrough dropped = createPlaythrough();
        dropped.setIsCompleted(false);
        dropped.setIsDropped(true);
        dropped.setDurationSeconds(500L);
        entityManager.persist(dropped);

        entityManager.flush();

        Map<String, Object[]> byType = playthroughRepository.findCompletionStatsByGameId(testGame.getId())
            .stream()
            .collect(Collectors.toMap(row -> (String) row[0], row -> row));

        assertThat(byType).containsOnlyKeys("story", "speedrun");

        Object[] story = byType.get("story");
        assertThat(((Number) story[1]).longValue()).isEqualTo(2L); // sample size
        assertThat(((Number) story[2]).longValue()).isEqualTo(2L); // distinct players
        assertThat(((Number) story[3]).doubleValue()).isEqualTo(15_000.0); // (10000 + 20000) / 2

        Object[] speedrun = byType.get("speedrun");
        assertThat(((Number) speedrun[1]).longValue()).isEqualTo(1L);
        assertThat(((Number) speedrun[3]).doubleValue()).isEqualTo(3_000.0);
    }

    @Test
    void findCompletionStatsByGameId_netsOutImportedDurationLikeEffectivePlaytimeSeconds() {
        Playthrough source = completedPlaythrough(testUser, "story", 5_000L);
        entityManager.persist(source);
        entityManager.flush();

        User secondUser = persistUser("importer");
        Playthrough imported = completedPlaythrough(secondUser, "story", 8_000L);
        imported.setImportedFromPlaythrough(source);
        imported.setImportedDurationSeconds(5_000L);
        entityManager.persist(imported);
        entityManager.flush();

        List<Object[]> rows = playthroughRepository.findCompletionStatsByGameId(testGame.getId());
        assertThat(rows).hasSize(1);

        Object[] story = rows.get(0);
        assertThat(((Number) story[1]).longValue()).isEqualTo(2L);
        // effective seconds: source keeps its own 5000; importer nets 8000 - 5000 = 3000.
        assertThat(((Number) story[3]).doubleValue()).isEqualTo(4_000.0);
    }
}
