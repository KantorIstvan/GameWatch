package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class SessionHistoryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private SessionHistoryRepository sessionHistoryRepository;

    private User testUser;
    private Playthrough testPlaythrough;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .auth0UserId("auth0|test123")
            .email("test@example.com")
            .username("testuser")
            .build();
        entityManager.persist(testUser);

        Game testGame = Game.builder().name("Test Game").externalId(12345).build();
        entityManager.persist(testGame);

        testPlaythrough = Playthrough.builder()
            .user(testUser)
            .game(testGame)
            .playthroughType("story")
            .startDate(LocalDate.now())
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .durationSeconds(0L).sessionCount(0).pauseCount(0)
            .sessionStartDurationSeconds(0L).importedDurationSeconds(0L)
            .build();
        entityManager.persist(testPlaythrough);
        entityManager.flush();
    }

    private void persistSession(int sessionNumber, Instant startedAt, Instant endedAt) {
        entityManager.persist(SessionHistory.builder()
            .playthrough(testPlaythrough)
            .sessionNumber(sessionNumber)
            .durationSeconds(endedAt.getEpochSecond() - startedAt.getEpochSecond())
            .pauseCount(0)
            .startedAt(startedAt)
            .endedAt(endedAt)
            .build());
        entityManager.flush();
    }

    private Instant utc(int year, int month, int day, int hour) {
        return LocalDate.of(year, month, day).atTime(hour, 0).toInstant(ZoneOffset.UTC);
    }

    @Test
    void sessionSpanningMidnight_belongsOnlyToTheDayItStarted() {
        // 23:00 on the 10th through 01:00 on the 11th. Overlap-based bounds returned this
        // for both days, and since callers sum whole durations it was counted twice.
        persistSession(1, utc(2026, 3, 10, 23), utc(2026, 3, 11, 1));

        List<SessionHistory> tenth = sessionHistoryRepository.findSessionsStartedByUserBetween(
            testUser.getId(), utc(2026, 3, 10, 0), utc(2026, 3, 11, 0));
        List<SessionHistory> eleventh = sessionHistoryRepository.findSessionsStartedByUserBetween(
            testUser.getId(), utc(2026, 3, 11, 0), utc(2026, 3, 12, 0));

        assertThat(tenth).hasSize(1);
        assertThat(eleventh).isEmpty();
    }

    @Test
    void rangeBoundsAreInclusiveOfStartAndExclusiveOfEnd() {
        persistSession(1, utc(2026, 3, 10, 0), utc(2026, 3, 10, 1));   // exactly on start
        persistSession(2, utc(2026, 3, 11, 0), utc(2026, 3, 11, 1));   // exactly on end

        List<SessionHistory> tenth = sessionHistoryRepository.findSessionsStartedByUserBetween(
            testUser.getId(), utc(2026, 3, 10, 0), utc(2026, 3, 11, 0));

        assertThat(tenth).hasSize(1);
        assertThat(tenth.get(0).getSessionNumber()).isEqualTo(1);
    }

    @Test
    void findPlaythroughIdsWithAnySession_distinguishesSessionlessPlaythroughs() {
        Long withSessions = testPlaythrough.getId();
        persistSession(1, utc(2026, 3, 10, 12), utc(2026, 3, 10, 13));

        Playthrough sessionless = Playthrough.builder()
            .user(testUser)
            .game(testPlaythrough.getGame())
            .playthroughType("story")
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .durationSeconds(7200L).sessionCount(0).pauseCount(0)
            .sessionStartDurationSeconds(0L).importedDurationSeconds(0L)
            .build();
        entityManager.persist(sessionless);
        entityManager.flush();

        Set<Long> result = sessionHistoryRepository.findPlaythroughIdsWithAnySession(
            List.of(withSessions, sessionless.getId()));

        assertThat(result).containsExactly(withSessions);
    }
}
