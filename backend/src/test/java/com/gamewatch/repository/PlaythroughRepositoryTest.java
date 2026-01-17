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
import java.util.Optional;

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
}
