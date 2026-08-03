package com.gamewatch.service;

import com.gamewatch.dto.UserStatisticsDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.entity.UserGame;
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

    private UserGame libraryEntry(Game game, Instant addedAt) {
        return UserGame.builder().id(game.getId()).user(testUser).game(game).createdAt(addedAt).build();
    }

    @Test
    void backlog_reportsTheFunnelFromOwnedThroughStartedToFinished() {
        Game unplayed = Game.builder().id(2L).name("Still Shrink-Wrapped").genres("RPG").build();
        Game barelyTouched = Game.builder().id(3L).name("Twenty Minutes In").genres("RPG").build();

        Playthrough finished = Playthrough.builder()
            .id(1L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .endDate(LocalDate.now().minusDays(10)).lastPlayedAt(Instant.now())
            .build();
        Playthrough underAnHour = Playthrough.builder()
            .id(2L).user(testUser).game(barelyTouched).playthroughType("story")
            .durationSeconds(1_200L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false)
            .lastPlayedAt(Instant.now())
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L))
            .thenReturn(List.of(finished, underAnHour));
        when(userGameRepository.findGamesByUser(testUser))
            .thenReturn(List.of(testGame, unplayed, barelyTouched));
        when(userGameRepository.findByUser(testUser)).thenReturn(List.of(
            libraryEntry(testGame, Instant.now().minus(60, ChronoUnit.DAYS)),
            libraryEntry(unplayed, Instant.now().minus(30, ChronoUnit.DAYS)),
            libraryEntry(barelyTouched, Instant.now().minus(10, ChronoUnit.DAYS))));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(any())).thenReturn(Set.of());
        when(sessionHistoryRepository.findFirstSessionStartPerGame(1L)).thenReturn(List.of());

        UserStatisticsDto.BacklogStats backlog =
            userStatisticsService.getUserStatistics(testUser, "all", null).getBacklogStats();

        assertThat(backlog.getGamesInLibrary()).isEqualTo(3);
        assertThat(backlog.getGamesStarted()).isEqualTo(2);
        // 20 minutes does not clear the first hour.
        assertThat(backlog.getGamesPastFirstHour()).isEqualTo(1);
        assertThat(backlog.getGamesFinished()).isEqualTo(1);
        assertThat(backlog.getGamesNeverStarted()).isEqualTo(1);
    }

    @Test
    void backlog_isStillReportedForALibraryWithNothingPlayedYet() {
        // The early return for "no playthroughs in this period" used to swallow everything,
        // so a new user with forty unplayed games was told only that they had no data -
        // exactly the case the backlog view exists for.
        Game unplayed = Game.builder().id(2L).name("Still Shrink-Wrapped").build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(unplayed));
        when(userGameRepository.findByUser(testUser))
            .thenReturn(List.of(libraryEntry(unplayed, Instant.now().minus(5, ChronoUnit.DAYS))));
        when(sessionHistoryRepository.findFirstSessionStartPerGame(1L)).thenReturn(List.of());

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "week", null);

        assertThat(stats.getBacklogStats()).isNotNull();
        assertThat(stats.getBacklogStats().getGamesInLibrary()).isEqualTo(1);
        assertThat(stats.getBacklogStats().getGamesNeverStarted()).isEqualTo(1);
        assertThat(stats.getTotalGamesCount()).isEqualTo(1);
    }

    @Test
    void backlog_medianShelfTimeMeasuresFromWhenTheUserAddedTheGame() {
        Game second = Game.builder().id(2L).name("Second").build();
        Instant addedFirst = Instant.parse("2026-01-01T00:00:00Z");
        Instant addedSecond = Instant.parse("2026-01-01T00:00:00Z");

        Playthrough playthrough = playthroughWithLifetimePlaytime(3_600L, Instant.now());

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame, second));
        when(userGameRepository.findByUser(testUser)).thenReturn(List.of(
            libraryEntry(testGame, addedFirst),
            libraryEntry(second, addedSecond)));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(any())).thenReturn(Set.of());
        when(sessionHistoryRepository.findFirstSessionStartPerGame(1L)).thenReturn(List.of(
            new Object[]{1L, Instant.parse("2026-01-04T00:00:00Z")},   // 3 days on the shelf
            new Object[]{2L, Instant.parse("2026-01-11T00:00:00Z")})); // 10 days on the shelf

        UserStatisticsDto.BacklogStats backlog =
            userStatisticsService.getUserStatistics(testUser, "all", null).getBacklogStats();

        // Nearest-rank median of [3, 10] is 3.
        assertThat(backlog.getMedianShelfTimeDays()).isEqualTo(3L);
    }

    @Test
    void backlog_listsPlaythroughsAbandonedWithoutEverBeingDropped() {
        Playthrough stale = Playthrough.builder()
            .id(1L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(7_200L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false)
            .lastPlayedAt(Instant.now().minus(200, ChronoUnit.DAYS))
            .build();
        Playthrough recentlyPlayed = Playthrough.builder()
            .id(2L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(7_200L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false)
            .lastPlayedAt(Instant.now().minus(5, ChronoUnit.DAYS))
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L))
            .thenReturn(List.of(stale, recentlyPlayed));
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(userGameRepository.findByUser(testUser))
            .thenReturn(List.of(libraryEntry(testGame, Instant.now().minus(300, ChronoUnit.DAYS))));
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(any())).thenReturn(Set.of());
        when(sessionHistoryRepository.findFirstSessionStartPerGame(1L)).thenReturn(List.of());

        UserStatisticsDto.BacklogStats backlog =
            userStatisticsService.getUserStatistics(testUser, "all", null).getBacklogStats();

        assertThat(backlog.getStalePlaythroughs()).hasSize(1);
        assertThat(backlog.getStalePlaythroughs().get(0).getDaysSinceLastPlayed()).isEqualTo(200L);
    }

    @Test
    void varietyScore_separatesAMonogamerFromASampler() {
        // Both users can have the same total hours and even the same top-three share; what
        // differs is how the rest of the library is used, which is what entropy captures.
        Game second = Game.builder().id(2L).name("Second").build();
        Game third = Game.builder().id(3L).name("Third").build();

        Playthrough onlyGame = Playthrough.builder()
            .id(1L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(30_000L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .lastPlayedAt(Instant.now())
            .build();

        UserStatisticsDto concentrated = trendStatsFor(List.of(onlyGame));
        assertThat(concentrated.getTrendStats().getVarietyScore()).isZero();
        assertThat(concentrated.getTrendStats().getTopThreeSharePercentage()).isEqualTo(100.0);

        org.mockito.Mockito.reset(playthroughRepository, userGameRepository, sessionHistoryRepository);

        List<Playthrough> spread = List.of(
            onlyGame,
            Playthrough.builder().id(2L).user(testUser).game(second).playthroughType("story")
                .durationSeconds(30_000L).importedDurationSeconds(0L)
                .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
                .lastPlayedAt(Instant.now()).build(),
            Playthrough.builder().id(3L).user(testUser).game(third).playthroughType("story")
                .durationSeconds(30_000L).importedDurationSeconds(0L)
                .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
                .lastPlayedAt(Instant.now()).build());

        UserStatisticsDto varied = trendStatsFor(spread);
        // Three games played equally is a perfectly even spread across what was played.
        // Compared with a tolerance because normalised entropy lands a float's breadth
        // under 1.0 for an exactly even split.
        assertThat(varied.getTrendStats().getVarietyScore())
            .isCloseTo(100.0, org.assertj.core.api.Assertions.within(0.001));
    }

    @Test
    void dropRate_measuresAgainstPlaythroughsThatActuallyEnded() {
        // In-progress playthroughs have not decided yet, so counting them in the
        // denominator would make every active user look like they never abandon anything.
        Playthrough dropped = Playthrough.builder()
            .id(1L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(7_200L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(false).isDropped(true).isPaused(false)
            .lastPlayedAt(Instant.now()).build();
        Playthrough finished = Playthrough.builder()
            .id(2L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(true).isDropped(false).isPaused(false)
            .lastPlayedAt(Instant.now()).build();
        Playthrough stillGoing = Playthrough.builder()
            .id(3L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(1_800L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .lastPlayedAt(Instant.now()).build();

        UserStatisticsDto stats = trendStatsFor(List.of(dropped, finished, stillGoing));

        assertThat(stats.getTrendStats().getPlaythroughsDropped()).isEqualTo(1);
        assertThat(stats.getTrendStats().getPlaythroughsCompleted()).isEqualTo(1);
        assertThat(stats.getTrendStats().getDropRatePercentage()).isEqualTo(50.0);
        assertThat(stats.getTrendStats().getMedianSecondsBeforeDropping()).isEqualTo(7_200L);
    }

    @Test
    void rollingAverage_startsWithTheChartRatherThanAWeekIntoIt() {
        UserStatisticsDto stats = statsForDaysAgo(0, 1, 2);
        List<UserStatisticsDto.DailyPlaytime> days = stats.getDailyPlaytime();

        // Every point carries a value, including the first, which averages over the one
        // day that precedes it rather than being left blank.
        assertThat(days).isNotEmpty();
        assertThat(days).allSatisfy(day ->
            assertThat(day.getRollingAverageSeconds()).isNotNull());
    }

    private UserStatisticsDto trendStatsFor(List<Playthrough> playthroughs) {
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(playthroughs);
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(userGameRepository.findByUser(testUser)).thenReturn(List.of());
        when(sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(any())).thenReturn(Set.of());
        when(sessionHistoryRepository.findFirstSessionStartPerGame(1L)).thenReturn(List.of());

        return userStatisticsService.getUserStatistics(testUser, "all", null);
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
