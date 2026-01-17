package com.gamewatch;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class GameWatchIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlaythroughRepository playthroughRepository;

    private User testUser;
    private Game testGame;

    @BeforeEach
    void setUp() {
        playthroughRepository.deleteAll();
        gameRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
            .auth0UserId("auth0|integration")
            .email("integration@example.com")
            .username("integrationuser")
            .build();
        testUser = userRepository.save(testUser);

        testGame = Game.builder()
            .name("Integration Test Game")
            .externalId(99999)
            .build();
        testGame = gameRepository.save(testGame);
    }

    @Test
    void completeUserJourney_CreatePlaythroughAndComplete() {
        Playthrough playthrough = Playthrough.builder()
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
        playthrough = playthroughRepository.save(playthrough);

        List<Playthrough> userPlaythroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId());
        assertThat(userPlaythroughs).hasSize(1);

        playthrough.setIsCompleted(true);
        playthrough.setDurationSeconds(7200L);
        playthrough = playthroughRepository.save(playthrough);

        Playthrough completed = playthroughRepository.findByIdAndUserId(playthrough.getId(), testUser.getId()).orElseThrow();
        assertThat(completed.getIsCompleted()).isTrue();
        assertThat(completed.getDurationSeconds()).isEqualTo(7200L);
    }

    @Test
    void cascadeDelete_DeletingUserDeletesPlaythroughs() {
        Playthrough p1 = createPlaythrough("story");
        Playthrough p2 = createPlaythrough("100%");
        playthroughRepository.save(p1);
        playthroughRepository.save(p2);

        assertThat(playthroughRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId())).hasSize(2);

        playthroughRepository.deleteAll(playthroughRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId()));
        playthroughRepository.flush();

        userRepository.delete(testUser);
        userRepository.flush();

        assertThat(playthroughRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId())).isEmpty();
    }

    private Playthrough createPlaythrough(String type) {
        return Playthrough.builder()
            .user(testUser)
            .game(testGame)
            .playthroughType(type)
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
