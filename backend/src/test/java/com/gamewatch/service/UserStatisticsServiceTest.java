package com.gamewatch.service;

import com.gamewatch.dto.UserStatisticsDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserGameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserStatisticsServiceTest {

    @Mock
    private PlaythroughRepository playthroughRepository;

    @Mock
    private SessionHistoryRepository sessionHistoryRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @Mock
    private RawgApiService rawgApiService;

    @InjectMocks
    private UserStatisticsService userStatisticsService;

    private User testUser;
    private Game testGame;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .username("testuser")
            .timezone("UTC")
            .firstDayOfWeek("MONDAY")
            .build();

        testGame = Game.builder()
            .id(1L)
            .name("Test Game")
            .genres("Action")
            .build();
    }

    private Playthrough playthroughWithLifetimePlaytime(long durationSeconds, Instant lastPlayedAt) {
        return Playthrough.builder()
            .id(1L)
            .user(testUser)
            .game(testGame)
            .playthroughType("story")
            .durationSeconds(durationSeconds)
            .importedDurationSeconds(0L)
            .sessionCount(20)
            .isActive(false)
            .isCompleted(false)
            .isDropped(false)
            .isPaused(true)
            .lastPlayedAt(lastPlayedAt)
            .build();
    }

    @Test
    void weeklyTotal_ExcludesPlaythroughWhoseSessionsAllPredateTheWindow() {
        // 100 hours recorded across earlier months, then merely touched today - pausing is
        // enough, since pause moves lastPlayedAt. The playthrough used to be pulled into
        // this week purely on lastPlayedAt and then, having no session inside the window,
        // was classified as "manual only" and contributed its entire lifetime playtime.
        Playthrough playthrough = playthroughWithLifetimePlaytime(360_000L, Instant.now());

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of());
        // It does have session rows - they simply sit in other periods.
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "week", null);

        assertThat(stats.getTotalPlaytimeSeconds()).isZero();
    }

    @Test
    void weeklyTotal_CountsSessionTimeInsideTheWindow() {
        Playthrough playthrough = playthroughWithLifetimePlaytime(360_000L, Instant.now());
        SessionHistory sessionThisWeek = SessionHistory.builder()
            .id(1L)
            .playthrough(playthrough)
            .sessionNumber(21)
            .durationSeconds(5_400L)
            .pauseCount(0)
            .startedAt(Instant.now().minus(2, ChronoUnit.HOURS))
            .endedAt(Instant.now().minus(30, ChronoUnit.MINUTES))
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of(sessionThisWeek));
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "week", null);

        // Only the 90 minutes actually played this week, not the 100 lifetime hours.
        assertThat(stats.getTotalPlaytimeSeconds()).isEqualTo(5_400L);
    }

    @Test
    void weeklyTotal_StillCountsPlaythroughsThatHaveNoSessionRowsAtAll() {
        // Legacy rows and hand-edited totals carry no per-session timestamps, so
        // lastPlayedAt is the only thing available to place them by. The fallback has to
        // keep working for these - it just must not apply to playthroughs that do have
        // sessions elsewhere in time.
        Playthrough playthrough = playthroughWithLifetimePlaytime(7_200L, Instant.now());

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of());

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "week", null);

        assertThat(stats.getTotalPlaytimeSeconds()).isEqualTo(7_200L);
    }

    @Test
    void genreDistribution_splitsPlaytimeAcrossGenresInsteadOfDuplicatingIt() {
        // A game tagged with three genres used to contribute its full playtime to each of
        // them, so the distribution described three times the time actually played and
        // heavily-tagged games crowded out single-genre ones on tag count alone.
        Game multiGenre = Game.builder()
            .id(1L).name("Three Genres").genres("Action, RPG, Adventure").build();
        Playthrough playthrough = Playthrough.builder()
            .id(1L).user(testUser).game(multiGenre).playthroughType("story")
            .durationSeconds(9_000L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .sessionCount(0).lastPlayedAt(Instant.now())
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(multiGenre));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(List.of(1L)))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of());

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "all", null);

        assertThat(stats.getGenreDistribution())
            .containsEntry("Action", 3_000L)
            .containsEntry("RPG", 3_000L)
            .containsEntry("Adventure", 3_000L);
        // The whole point: the parts add back up to the time actually played.
        assertThat(stats.getGenreDistribution().values().stream().mapToLong(Long::longValue).sum())
            .isEqualTo(9_000L);
    }

    @Test
    void timeOfDay_countsTimePlayedRatherThanTimeElapsed() {
        // 20:00-01:00 on the clock, but only two hours of it were played - the rest was
        // paused. Spreading the raw five-hour span put time the user never spent playing
        // into the evening and night buckets.
        Instant start = Instant.parse("2026-03-10T20:00:00Z");
        Instant end = Instant.parse("2026-03-11T01:00:00Z");

        Playthrough playthrough = playthroughWithLifetimePlaytime(7_200L, end);
        SessionHistory pausedSession = SessionHistory.builder()
            .id(1L).playthrough(playthrough).sessionNumber(1)
            .durationSeconds(7_200L).pauseCount(1)
            .startedAt(start).endedAt(end)
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(List.of(1L)))
            .thenReturn(List.of(pausedSession));
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "all", null);

        long hourlyTotal = stats.getTimeOfDayStats().getHourlyDistribution()
            .values().stream().mapToLong(Long::longValue).sum();
        long bucketTotal = stats.getTimeOfDayStats().getEveningSeconds()
            + stats.getTimeOfDayStats().getNightSeconds()
            + stats.getTimeOfDayStats().getDawnSeconds()
            + stats.getTimeOfDayStats().getMorningSeconds()
            + stats.getTimeOfDayStats().getNoonSeconds()
            + stats.getTimeOfDayStats().getAfternoonSeconds();

        assertThat(hourlyTotal).isEqualTo(7_200L);
        assertThat(bucketTotal).isEqualTo(7_200L);
    }

    @Test
    void inProgressCount_excludesDroppedPlaythroughs() {
        Playthrough dropped = playthroughWithLifetimePlaytime(3_600L, Instant.now());
        dropped.setIsDropped(true);
        dropped.setIsPaused(false);

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(dropped));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(List.of(1L)))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of());

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "all", null);

        assertThat(stats.getGamesInProgress()).isZero();
    }

    @Test
    void dayOfWeekAverage_dividesByHowManyOfThatWeekdayOccurred() {
        // Four hours played across two Mondays, in three sessions, inside a month that
        // contains five Mondays. The average is 4h over the 5 Mondays in the period, not
        // 4h over the 3 sessions - dividing by session count made the line fall as the
        // user played more often, which is backwards.
        Instant firstMonday = Instant.parse("2026-03-02T18:00:00Z");
        Instant secondMonday = Instant.parse("2026-03-09T18:00:00Z");

        Playthrough playthrough = playthroughWithLifetimePlaytime(14_400L, secondMonday);
        List<SessionHistory> sessions = List.of(
            session(playthrough, 1, firstMonday, 3_600L),
            session(playthrough, 2, firstMonday.plusSeconds(7_200), 3_600L),
            session(playthrough, 3, secondMonday, 7_200L));

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(sessions);
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "month", "2026-03-09");

        Double mondayAverage = stats.getDayOfWeekPlaytime().get("MONDAY");
        Long mondayTotal = stats.getDayOfWeekTotalPlaytime().get("MONDAY");

        assertThat(mondayTotal).isEqualTo(14_400L);
        // March 2026 is a completed month with Mondays on the 2nd, 9th, 16th, 23rd and
        // 30th, so the honest answer is 4 hours spread over 5 Mondays - 48 minutes each.
        // The old divisor gave 14400/3 sessions = 80 minutes.
        assertThat(mondayAverage).isEqualTo(2_880.0);
    }

    private SessionHistory session(Playthrough playthrough, int number, Instant startedAt, long duration) {
        return SessionHistory.builder()
            .id((long) number).playthrough(playthrough).sessionNumber(number)
            .durationSeconds(duration).pauseCount(0)
            .startedAt(startedAt).endedAt(startedAt.plusSeconds(duration))
            .build();
    }

    @Test
    void allTimeTotal_IsUnaffectedByTheWindowingRules() {
        Playthrough playthrough = playthroughWithLifetimePlaytime(360_000L, Instant.now());

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(List.of(1L)))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "all", null);

        assertThat(stats.getTotalPlaytimeSeconds()).isEqualTo(360_000L);
    }
}
