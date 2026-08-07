package com.gamewatch.service;

import com.gamewatch.dto.CreatePlaythroughRequest;
import com.gamewatch.dto.LogManualSessionRequest;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserGameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaythroughServiceTest {

    @Mock
    private PlaythroughRepository playthroughRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @Mock
    private SessionHistoryRepository sessionHistoryRepository;

    @Mock
    private HealthService healthService;

    @Mock
    private ColorExtractionService colorExtractionService;

    @InjectMocks
    private PlaythroughService playthroughService;

    private User testUser;
    private Game testGame;
    private Playthrough testPlaythrough;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .email("test@example.com")
            .username("testuser")
            .build();

        testGame = Game.builder()
            .id(1L)
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .build();

        testPlaythrough = Playthrough.builder()
            .id(1L)
            .user(testUser)
            .game(testGame)
            .playthroughType("story")
            .title("First Playthrough")
            .platform("PC")
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

    @Test
    void createPlaythrough_Success() {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .gameId(1L)
            .playthroughType("story")
            .title("First Playthrough")
            .platform("PC")
            .startDate(LocalDate.now())
            .build();

        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.existsByUserAndGame(testUser, testGame)).thenReturn(true);
        when(colorExtractionService.extractDominantColors(anyString())).thenReturn(new String[]{"#FF5733", "#33C4FF"});
        when(playthroughRepository.save(any(Playthrough.class))).thenReturn(testPlaythrough);

        PlaythroughDto result = playthroughService.createPlaythrough(testUser, request);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getGameId()).isEqualTo(1L);
        assertThat(result.getGameName()).isEqualTo("Test Game");
        assertThat(result.getPlaythroughType()).isEqualTo("story");
        assertThat(result.getIsActive()).isFalse();
        assertThat(result.getIsCompleted()).isFalse();

        verify(gameRepository).findById(1L);
        verify(colorExtractionService).extractDominantColors("https://example.com/banner.jpg");
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void createPlaythrough_GameNotFound_ThrowsException() {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .gameId(999L)
            .playthroughType("story")
            .build();

        when(gameRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playthroughService.createPlaythrough(testUser, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Game not found");

        verify(gameRepository).findById(999L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void createPlaythrough_GameNotInUserLibrary_ThrowsException() {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .gameId(1L)
            .playthroughType("story")
            .build();

        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.existsByUserAndGame(testUser, testGame)).thenReturn(false);

        assertThatThrownBy(() -> playthroughService.createPlaythrough(testUser, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Game not found");

        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void startPlaythrough_Success() {
        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.startPlaythrough(testUser, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getIsActive()).isTrue();
        assertThat(result.getIsPaused()).isFalse();
        assertThat(testPlaythrough.getStartedAt()).isNotNull();
        assertThat(testPlaythrough.getPauseCount()).isEqualTo(0);

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void startPlaythrough_AlreadyActive_ThrowsException() {
        testPlaythrough.setIsActive(true);
        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.startPlaythrough(testUser, 1L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("already active");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void startPlaythrough_DroppedPlaythrough_ThrowsException() {
        testPlaythrough.setIsDropped(true);
        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.startPlaythrough(testUser, 1L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot start a session on a dropped playthrough");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void pausePlaythrough_Success() {
        testPlaythrough.setIsActive(true);
        testPlaythrough.setStartedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        testPlaythrough.setDurationSeconds(3600L);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.pausePlaythrough(testUser, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getIsActive()).isFalse();
        assertThat(result.getIsPaused()).isTrue();
        assertThat(testPlaythrough.getDurationSeconds()).isGreaterThan(3600L);
        assertThat(testPlaythrough.getPauseCount()).isEqualTo(1);

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void pausePlaythrough_NotActive_ThrowsException() {
        testPlaythrough.setIsActive(false);
        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.pausePlaythrough(testUser, 1L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not active");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void stopPlaythrough_Success() {
        testPlaythrough.setIsActive(true);
        testPlaythrough.setStartedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        testPlaythrough.setDurationSeconds(7200L);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.stopPlaythrough(testUser, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getIsActive()).isFalse();
        assertThat(result.getIsCompleted()).isTrue();
        assertThat(result.getIsDropped()).isFalse();
        assertThat(testPlaythrough.getStoppedAt()).isNotNull();
        assertThat(testPlaythrough.getEndDate()).isNotNull();
        assertThat(testPlaythrough.getDurationSeconds()).isGreaterThanOrEqualTo(7200L);

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void dropPlaythrough_Success() {
        testPlaythrough.setIsActive(true);
        testPlaythrough.setStartedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        testPlaythrough.setDurationSeconds(3600L);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.dropPlaythrough(testUser, 1L);

        assertThat(result).isNotNull();
        assertThat(result.getIsActive()).isFalse();
        assertThat(result.getIsCompleted()).isFalse();
        assertThat(result.getIsDropped()).isTrue();
        assertThat(testPlaythrough.getStoppedAt()).isNotNull();
        assertThat(testPlaythrough.getEndDate()).isNotNull();

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void stopPlaythrough_PausedSession_RecordsSessionHistory() {
        // A paused session's time is already banked into durationSeconds, but finishing
        // never wrote a session_history row for it. The time then existed only as a total:
        // absent from the per-game session list, the calendar and every health metric, and
        // treated by the period statistics as a playthrough with no sessions at all.
        testPlaythrough.setIsActive(false);
        testPlaythrough.setIsPaused(true);
        testPlaythrough.setDurationSeconds(5400L);
        testPlaythrough.setSessionStartDurationSeconds(1800L);
        testPlaythrough.setSessionStartTime(Instant.now().minus(1, ChronoUnit.HOURS));
        testPlaythrough.setSessionCount(2);
        testPlaythrough.setPauseCount(3);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));
        when(sessionHistoryRepository.save(any(SessionHistory.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.stopPlaythrough(testUser, 1L);

        ArgumentCaptor<SessionHistory> captor = ArgumentCaptor.forClass(SessionHistory.class);
        verify(sessionHistoryRepository).save(captor.capture());
        SessionHistory recorded = captor.getValue();

        assertThat(recorded.getSessionNumber()).isEqualTo(3);
        assertThat(recorded.getDurationSeconds()).isEqualTo(3600L); // 5400 total - 1800 at session start
        assertThat(recorded.getPauseCount()).isEqualTo(3);

        assertThat(testPlaythrough.getSessionCount()).isEqualTo(3);
        assertThat(testPlaythrough.getSessionStartTime()).isNull();
        assertThat(testPlaythrough.getPauseCount()).isZero();
        assertThat(testPlaythrough.getIsCompleted()).isTrue();
    }

    @Test
    void stopPlaythrough_ActiveSession_BanksStillRunningTime() {
        // stopPlaythrough cleared isActive before testing it, so the branch that folds the
        // still-running elapsed time into the total could never fire and that time was lost.
        testPlaythrough.setIsActive(true);
        testPlaythrough.setStartedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        testPlaythrough.setDurationSeconds(1800L);
        testPlaythrough.setSessionStartDurationSeconds(1800L);
        testPlaythrough.setSessionStartTime(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));
        when(sessionHistoryRepository.save(any(SessionHistory.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.stopPlaythrough(testUser, 1L);

        // 30 min previously banked + the hour that was still running when Finish was hit
        assertThat(testPlaythrough.getDurationSeconds()).isBetween(5395L, 5405L);

        ArgumentCaptor<SessionHistory> captor = ArgumentCaptor.forClass(SessionHistory.class);
        verify(sessionHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().getDurationSeconds()).isBetween(3595L, 3605L);
    }

    @Test
    void dropPlaythrough_PausedSession_RecordsSessionHistory() {
        // Abandoning a playthrough does not un-play the session that was in progress.
        testPlaythrough.setIsActive(false);
        testPlaythrough.setIsPaused(true);
        testPlaythrough.setDurationSeconds(2700L);
        testPlaythrough.setSessionStartDurationSeconds(0L);
        testPlaythrough.setSessionStartTime(Instant.now().minus(45, ChronoUnit.MINUTES));
        testPlaythrough.setSessionCount(0);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));
        when(sessionHistoryRepository.save(any(SessionHistory.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.dropPlaythrough(testUser, 1L);

        ArgumentCaptor<SessionHistory> captor = ArgumentCaptor.forClass(SessionHistory.class);
        verify(sessionHistoryRepository).save(captor.capture());

        assertThat(captor.getValue().getSessionNumber()).isEqualTo(1);
        assertThat(captor.getValue().getDurationSeconds()).isEqualTo(2700L);
        assertThat(testPlaythrough.getSessionCount()).isEqualTo(1);
        assertThat(testPlaythrough.getIsDropped()).isTrue();
    }

    @Test
    void endSession_WithManuallyEditedTime_DerivesEndFromTheSessionNotTheLifetimeTotal() {
        // Hand-editing the duration mid-session detaches the recorded time from the wall
        // clock, so the session end is derived from its start. Deriving it from the
        // playthrough's lifetime total instead put the end of a 30-minute session on a
        // 50-hour playthrough two days into the future.
        Instant sessionStart = Instant.now().minus(2, ChronoUnit.HOURS);
        testPlaythrough.setIsPaused(true);
        testPlaythrough.setManualTimeSet(true);
        testPlaythrough.setSessionStartTime(sessionStart);
        testPlaythrough.setSessionStartDurationSeconds(180_000L); // 50 h already recorded
        testPlaythrough.setDurationSeconds(181_800L);             // + 30 min this session

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));
        when(sessionHistoryRepository.save(any(SessionHistory.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.endSessionPlaythrough(testUser, 1L);

        ArgumentCaptor<SessionHistory> captor = ArgumentCaptor.forClass(SessionHistory.class);
        verify(sessionHistoryRepository).save(captor.capture());
        SessionHistory recorded = captor.getValue();

        assertThat(recorded.getDurationSeconds()).isEqualTo(1_800L);
        assertThat(recorded.getEndedAt()).isEqualTo(sessionStart.plusSeconds(1_800L));
        assertThat(recorded.getEndedAt()).isBefore(Instant.now());
    }

    @Test
    void endSession_WithoutOpenSession_DoesNotIncrementSessionCount() {
        // sessionCount was incremented before the null check guarding the row write, so a
        // playthrough with no open session drifted permanently out of step with the number
        // of session_history rows actually behind it.
        testPlaythrough.setIsPaused(true);
        testPlaythrough.setSessionStartTime(null);
        testPlaythrough.setSessionCount(4);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));

        PlaythroughDto result = playthroughService.endSessionPlaythrough(testUser, 1L);

        assertThat(testPlaythrough.getSessionCount()).isEqualTo(4);
        assertThat(result.getLastSessionHistoryId()).isNull();
        verify(sessionHistoryRepository, never()).save(any(SessionHistory.class));
    }

    @Test
    void deleteSession_RecalculatesTheHealthMetricsForThatDay() {
        // Deleting a session never triggered a recalculation, so its hours stayed in the
        // heatmap, the weekly totals and the day's score indefinitely.
        Instant startedAt = Instant.parse("2026-03-10T20:00:00Z");
        SessionHistory session = SessionHistory.builder()
            .id(7L)
            .playthrough(testPlaythrough)
            .sessionNumber(1)
            .durationSeconds(3600L)
            .pauseCount(0)
            .startedAt(startedAt)
            .endedAt(startedAt.plusSeconds(3600L))
            .build();

        testPlaythrough.setSessionCount(1);
        testPlaythrough.setDurationSeconds(3600L);
        testUser.setTimezone("UTC");

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findById(7L)).thenReturn(Optional.of(session));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L)).thenReturn(List.of());

        playthroughService.deleteSession(testUser, 1L, 7L);

        verify(sessionHistoryRepository).delete(session);
        verify(healthService).recalculateMetricsForDate(testUser, LocalDate.of(2026, 3, 10));
        assertThat(testPlaythrough.getSessionCount()).isZero();
        assertThat(testPlaythrough.getDurationSeconds()).isZero();
    }

    @Test
    void deletePlaythrough_RecalculatesEveryDayItContributedTo() {
        Instant dayOne = Instant.parse("2026-03-10T20:00:00Z");
        Instant dayTwo = Instant.parse("2026-03-12T09:00:00Z");
        testUser.setTimezone("UTC");

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L)).thenReturn(List.of(
            SessionHistory.builder().id(1L).playthrough(testPlaythrough).sessionNumber(1)
                .durationSeconds(3600L).pauseCount(0).startedAt(dayOne).endedAt(dayOne.plusSeconds(3600)).build(),
            SessionHistory.builder().id(2L).playthrough(testPlaythrough).sessionNumber(2)
                .durationSeconds(1800L).pauseCount(0).startedAt(dayTwo).endedAt(dayTwo.plusSeconds(1800)).build()
        ));

        playthroughService.deletePlaythrough(testUser, 1L);

        verify(playthroughRepository).delete(testPlaythrough);
        verify(healthService).recalculateMetricsForDate(testUser, LocalDate.of(2026, 3, 10));
        verify(healthService).recalculateMetricsForDate(testUser, LocalDate.of(2026, 3, 12));
    }

    @Test
    void logManualSession_Success() {
        Instant sessionStart = Instant.now().minus(2, ChronoUnit.HOURS);
        Instant sessionEnd = Instant.now().minus(1, ChronoUnit.HOURS);
        
        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(sessionStart);
        request.setEndedAt(sessionEnd);

        testPlaythrough.setDurationSeconds(1000L);
        testPlaythrough.setSessionCount(1);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L)).thenReturn(List.of());
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.logManualSession(testUser, 1L, request);

        assertThat(result).isNotNull();
        assertThat(testPlaythrough.getSessionCount()).isEqualTo(2);
        assertThat(testPlaythrough.getDurationSeconds()).isEqualTo(1000L + 3600L); // Original + 1 hour

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(sessionHistoryRepository).findByPlaythroughIdOrderBySessionNumberAsc(1L);
        verify(sessionHistoryRepository).saveAndFlush(any(SessionHistory.class));
        verify(playthroughRepository).save(any(Playthrough.class));
    }

    @Test
    void logManualSession_SetsLastSessionHistoryIdInsteadOfFabricatingMood() {
        Instant sessionStart = Instant.now().minus(2, ChronoUnit.HOURS);
        Instant sessionEnd = Instant.now().minus(1, ChronoUnit.HOURS);

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(sessionStart);
        request.setEndedAt(sessionEnd);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L)).thenReturn(List.of());
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionHistoryRepository.saveAndFlush(any(SessionHistory.class))).thenAnswer(invocation -> {
            SessionHistory session = invocation.getArgument(0);
            session.setId(42L);
            return session;
        });

        PlaythroughDto result = playthroughService.logManualSession(testUser, 1L, request);

        // The frontend uses lastSessionHistoryId to open the same mood-prompt modal
        // shown after an automatically-tracked session, instead of the backend
        // fabricating a 5/5 mood rating on the user's behalf.
        assertThat(result.getLastSessionHistoryId()).isEqualTo(42L);
        verify(healthService, never()).saveMoodEntry(any());
        verify(healthService).recalculateMetricsForDate(eq(testUser), any(LocalDate.class));
    }

    @Test
    void logManualSession_WhileActive_ThrowsException() {
        testPlaythrough.setIsActive(true);
        
        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        request.setEndedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.logManualSession(testUser, 1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot log manual session while a session is open");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(sessionHistoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void logManualSession_WhilePaused_ThrowsException() {
        // A paused session has no session_history row yet, so it cannot be overlap-checked
        // against - the open session has to be closed before backfilling around it.
        testPlaythrough.setIsPaused(true);

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        request.setEndedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.logManualSession(testUser, 1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot log manual session while a session is open");

        verify(sessionHistoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void logManualSession_OnCompletedPlaythrough_ThrowsException() {
        testPlaythrough.setIsCompleted(true);
        testPlaythrough.setEndDate(LocalDate.now().minusDays(3));
        testUser.setTimezone("UTC");

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        request.setEndedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.logManualSession(testUser, 1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot log a manual session for a completed or dropped playthrough");

        verify(sessionHistoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void logManualSession_OnDroppedPlaythrough_ThrowsException() {
        testPlaythrough.setIsDropped(true);
        testPlaythrough.setEndDate(LocalDate.now().minusDays(3));
        testUser.setTimezone("UTC");

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        request.setEndedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.logManualSession(testUser, 1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot log a manual session for a completed or dropped playthrough");

        verify(sessionHistoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void logManualSession_OverlappingAnExistingSession_ThrowsException() {
        // The same evening could be logged any number of times, each copy counting in full
        // towards the playthrough total, the day's health hours and the statistics.
        Instant existingStart = Instant.now().minus(3, ChronoUnit.HOURS);
        SessionHistory existing = SessionHistory.builder()
            .id(1L).playthrough(testPlaythrough).sessionNumber(1)
            .durationSeconds(7200L).pauseCount(0)
            .startedAt(existingStart).endedAt(existingStart.plusSeconds(7200))
            .build();

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(existingStart.plusSeconds(3600));  // starts inside the existing one
        request.setEndedAt(existingStart.plusSeconds(10800));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L))
            .thenReturn(List.of(existing));

        assertThatThrownBy(() -> playthroughService.logManualSession(testUser, 1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("overlaps one already recorded");

        verify(sessionHistoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void logManualSession_AbuttingAnExistingSession_IsAllowed() {
        // Ending exactly when another begins is contiguous play, not an overlap.
        Instant existingStart = Instant.now().minus(3, ChronoUnit.HOURS);
        SessionHistory existing = SessionHistory.builder()
            .id(1L).playthrough(testPlaythrough).sessionNumber(1)
            .durationSeconds(3600L).pauseCount(0)
            .startedAt(existingStart).endedAt(existingStart.plusSeconds(3600))
            .build();

        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(existingStart.plusSeconds(3600));
        request.setEndedAt(existingStart.plusSeconds(7200));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L))
            .thenReturn(List.of(existing));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.logManualSession(testUser, 1L, request);

        verify(sessionHistoryRepository).saveAndFlush(any(SessionHistory.class));
    }

    @Test
    void deletingAnImportSource_LeavesTheImportedTimeCountingOnTheTarget() {
        // The imported chunk is deducted from the target only to stop the source counting
        // it twice. The deduction used to be unconditional, so deleting the source made
        // those hours vanish from every total: the source no longer contributed them, and
        // the target went on subtracting them from the only surviving record of them.
        Playthrough target = Playthrough.builder()
            .id(2L).user(testUser).game(testGame).playthroughType("100%")
            .durationSeconds(10_000L)
            .importedFromPlaythrough(testPlaythrough)
            .importedDurationSeconds(4_000L)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .sessionCount(0).pauseCount(0).sessionStartDurationSeconds(0L)
            .build();

        assertThat(target.effectivePlaytimeSeconds()).isEqualTo(6_000L);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(1L)).thenReturn(List.of());
        when(playthroughRepository.findByImportedFromPlaythroughId(1L)).thenReturn(List.of(target));

        playthroughService.deletePlaythrough(testUser, 1L);

        assertThat(target.getImportedFromPlaythrough()).isNull();
        assertThat(target.getImportedDurationSeconds()).isZero();
        // All 10 000 seconds now count, because nothing else reports them any more.
        assertThat(target.effectivePlaytimeSeconds()).isEqualTo(10_000L);
    }

    @Test
    void pickupPlaythrough_ClearsTheDropTimestamp() {
        testPlaythrough.setIsDropped(true);
        testPlaythrough.setDroppedAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(i -> i.getArgument(0));

        playthroughService.pickupPlaythrough(testUser, 1L);

        assertThat(testPlaythrough.getIsDropped()).isFalse();
        // droppedAt used to outlive the drop it recorded, leaving a playthrough that
        // reports itself as not dropped while still carrying the moment it was dropped.
        assertThat(testPlaythrough.getDroppedAt()).isNull();
    }

    @Test
    void importSessions_Success() {
        Playthrough sourcePlaythrough = Playthrough.builder()
            .id(2L)
            .user(testUser)
            .game(testGame)
            .playthroughType("story")
            .durationSeconds(10000L)
            .lastPlayedAt(Instant.now())
            .build();

        testPlaythrough.setPlaythroughType("100%");
        testPlaythrough.setDurationSeconds(5000L);
        testPlaythrough.setIsActive(false);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(sourcePlaythrough));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlaythroughDto result = playthroughService.importSessions(testUser, 1L, 2L);

        assertThat(result).isNotNull();
        assertThat(testPlaythrough.getDurationSeconds()).isEqualTo(15000L); // 5000 + 10000
        assertThat(testPlaythrough.getImportedFromPlaythrough()).isEqualTo(sourcePlaythrough);
        assertThat(testPlaythrough.getImportedDurationSeconds()).isEqualTo(10000L);

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository).findByIdAndUserId(2L, 1L);
        verify(playthroughRepository).save(testPlaythrough);
    }

    @Test
    void importSessions_NotHundredPercent_ThrowsException() {
        testPlaythrough.setPlaythroughType("story");

        Playthrough sourcePlaythrough = Playthrough.builder()
            .id(2L)
            .user(testUser)
            .game(testGame)
            .durationSeconds(10000L)
            .build();

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.importSessions(testUser, 1L, 2L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Can only import sessions to a 100% playthrough");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void importSessions_AlreadyImported_ThrowsException() {
        Playthrough previousSource = Playthrough.builder()
            .id(3L)
            .user(testUser)
            .game(testGame)
            .build();

        testPlaythrough.setPlaythroughType("100%");
        testPlaythrough.setImportedFromPlaythrough(previousSource);

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));

        assertThatThrownBy(() -> playthroughService.importSessions(testUser, 1L, 2L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("already imported from another playthrough");

        verify(playthroughRepository).findByIdAndUserId(1L, 1L);
        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void importSessions_DifferentGame_ThrowsException() {
        Game differentGame = Game.builder()
            .id(2L)
            .name("Different Game")
            .build();

        Playthrough sourcePlaythrough = Playthrough.builder()
            .id(2L)
            .user(testUser)
            .game(differentGame)
            .durationSeconds(10000L)
            .build();

        testPlaythrough.setPlaythroughType("100%");

        when(playthroughRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testPlaythrough));
        when(playthroughRepository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(sourcePlaythrough));

        assertThatThrownBy(() -> playthroughService.importSessions(testUser, 1L, 2L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Cannot import sessions from a different game");

        verify(playthroughRepository, never()).save(any());
    }

    @Test
    void playthroughNotFound_ThrowsException() {
        when(playthroughRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> playthroughService.startPlaythrough(testUser, 999L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not found or access denied");

        verify(playthroughRepository).findByIdAndUserId(999L, 1L);
    }
}
