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
import java.time.LocalDate;
import java.time.ZoneOffset;
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

    /** Drives the service with sessions on the given days-ago offsets from today. */
    private UserStatisticsDto statsForDaysAgo(int... daysAgo) {
        Playthrough playthrough = playthroughWithLifetimePlaytime(3_600L * daysAgo.length, Instant.now());

        List<SessionHistory> sessions = new java.util.ArrayList<>();
        int number = 1;
        for (int offset : daysAgo) {
            Instant start = LocalDate.now(ZoneOffset.UTC).minusDays(offset)
                .atTime(14, 0).toInstant(ZoneOffset.UTC);
            sessions.add(session(playthrough, number++, start, 3_600L));
        }

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(sessions);
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        return userStatisticsService.getUserStatistics(testUser, "year", null);
    }

    @Test
    void currentStreak_countsBackFromToday() {
        UserStatisticsDto stats = statsForDaysAgo(0, 1, 2);

        assertThat(stats.getConsistencyStats().getCurrentStreakDays()).isEqualTo(3);
        assertThat(stats.getConsistencyStats().getLongestStreakDays()).isEqualTo(3);
    }

    @Test
    void currentStreak_survivesAnUnplayedTodayButNotAnUnplayedYesterday() {
        // A streak breaks when a whole day passes unplayed, not the moment midnight
        // arrives - otherwise every streak in the app would read zero each morning.
        assertThat(statsForDaysAgo(1, 2, 3).getConsistencyStats().getCurrentStreakDays()).isEqualTo(3);

        org.mockito.Mockito.reset(playthroughRepository, userGameRepository, sessionHistoryRepository);

        assertThat(statsForDaysAgo(2, 3, 4).getConsistencyStats().getCurrentStreakDays()).isZero();
    }

    @Test
    void currentStreak_isAbsentForAPeriodThatHasAlreadyEnded() {
        Playthrough playthrough = playthroughWithLifetimePlaytime(3_600L, Instant.now());
        Instant start = Instant.parse("2026-03-10T14:00:00Z");

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of(session(playthrough, 1, start, 3_600L)));
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "month", "2026-03-10");

        // "Currently on a 3 day streak" is meaningless when looking at last March.
        assertThat(stats.getConsistencyStats().getCurrentStreakDays()).isNull();
        assertThat(stats.getConsistencyStats().getLongestStreakDays()).isEqualTo(1);
    }

    @Test
    void longestGap_ignoresTheRunUpToTheFirstDayEverPlayed() {
        // Days before the user's first session are the period starting early, not a lapse.
        UserStatisticsDto stats = statsForDaysAgo(0, 10, 11);

        assertThat(stats.getConsistencyStats().getLongestGapDays()).isEqualTo(9);
        assertThat(stats.getConsistencyStats().getDaysPlayed()).isEqualTo(3);
    }

    @Test
    void medianSessionLength_isNotDraggedAroundByOneMarathon() {
        // The mean this page already reports is 3h; the median describes a normal evening.
        Playthrough playthrough = playthroughWithLifetimePlaytime(43_200L, Instant.now());
        Instant base = LocalDate.now(ZoneOffset.UTC).minusDays(3).atTime(12, 0).toInstant(ZoneOffset.UTC);

        List<SessionHistory> sessions = List.of(
            session(playthrough, 1, base, 3_600L),
            session(playthrough, 2, base.plusSeconds(86_400), 3_600L),
            session(playthrough, 3, base.plusSeconds(172_800), 36_000L));

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(sessions);
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of(1L));

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "year", null);

        assertThat(stats.getAverageSessionPlaytimeSeconds()).isEqualTo(14_400.0);
        assertThat(stats.getConsistencyStats().getMedianSessionSeconds()).isEqualTo(3_600L);
        assertThat(stats.getConsistencyStats().getPercentile90SessionSeconds()).isEqualTo(36_000L);
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
