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
        when(sessionHistoryRepository.findSessionsByUserAndDateRange(anyLong(), any(), any()))
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
        when(sessionHistoryRepository.findSessionsByUserAndDateRange(anyLong(), any(), any()))
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
        when(sessionHistoryRepository.findSessionsByUserAndDateRange(anyLong(), any(), any()))
            .thenReturn(List.of());
        when(sessionHistoryRepository.findPlaythroughIdsWithAnySession(List.of(1L))).thenReturn(Set.of());

        UserStatisticsDto stats = userStatisticsService.getUserStatistics(testUser, "week", null);

        assertThat(stats.getTotalPlaytimeSeconds()).isEqualTo(7_200L);
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
