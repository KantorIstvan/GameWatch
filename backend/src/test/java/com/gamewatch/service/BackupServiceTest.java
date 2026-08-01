package com.gamewatch.service;

import com.gamewatch.dto.BackupDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.HealthSettingsRepository;
import com.gamewatch.repository.MoodEntryRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for the backup-import health-metrics gap: DailyHealthMetrics
 * (which drives the health heatmap) is a cache derived from SessionHistory, not raw
 * backed-up data, so importing sessions must trigger a recalculation or the heatmap
 * comes back empty after a full account restore.
 */
@ExtendWith(MockitoExtension.class)
class BackupServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private PlaythroughRepository playthroughRepository;

    @Mock
    private SessionHistoryRepository sessionHistoryRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @Mock
    private HealthSettingsRepository healthSettingsRepository;

    @Mock
    private MoodEntryRepository moodEntryRepository;

    @Mock
    private HealthService healthService;

    @InjectMocks
    private BackupService backupService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder().id(1L).auth0UserId("auth0|123").build();
    }

    @Test
    void importBackup_recalculatesHealthMetricsAcrossImportedSessionDateRange() {
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));
        when(playthroughRepository.save(any(Playthrough.class))).thenAnswer(inv -> inv.getArgument(0));
        when(sessionHistoryRepository.save(any(SessionHistory.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant oldestSessionStart = Instant.now().minus(40, ChronoUnit.DAYS);
        Instant newestSessionEnd = Instant.now().minus(2, ChronoUnit.DAYS);

        BackupDto backup = BackupDto.builder()
            .version("1.0")
            .timestamp(Instant.now())
            .data(BackupDto.BackupDataDto.builder()
                .games(List.of(BackupDto.BackupGameDto.builder()
                    .originalId(100L)
                    .name("Test Game")
                    .build()))
                .playthroughs(List.of(BackupDto.BackupPlaythroughDto.builder()
                    .originalId(200L)
                    .gameOriginalId(100L)
                    .build()))
                .sessions(List.of(
                    BackupDto.BackupSessionDto.builder()
                        .originalId(300L)
                        .playthroughOriginalId(200L)
                        .durationSeconds(3600L)
                        .startedAt(oldestSessionStart)
                        .endedAt(oldestSessionStart.plus(1, ChronoUnit.HOURS))
                        .build(),
                    BackupDto.BackupSessionDto.builder()
                        .originalId(301L)
                        .playthroughOriginalId(200L)
                        .durationSeconds(1800L)
                        .startedAt(newestSessionEnd.minus(30, ChronoUnit.MINUTES))
                        .endedAt(newestSessionEnd)
                        .build()
                ))
                .build())
            .build();

        backupService.importBackup(testUser, backup);

        LocalDate expectedMinDate = oldestSessionStart.atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        LocalDate expectedMaxDate = newestSessionEnd.atZone(java.time.ZoneId.systemDefault()).toLocalDate();

        verify(healthService).backfillMissingMetrics(testUser, expectedMinDate, expectedMaxDate);
    }

    @Test
    void importBackup_withNoSessions_doesNotTriggerHealthMetricsRecalculation() {
        BackupDto backup = BackupDto.builder()
            .version("1.0")
            .timestamp(Instant.now())
            .data(BackupDto.BackupDataDto.builder()
                .games(Collections.emptyList())
                .playthroughs(Collections.emptyList())
                .sessions(Collections.emptyList())
                .build())
            .build();

        backupService.importBackup(testUser, backup);

        verify(healthService, never()).backfillMissingMetrics(any(), any(), any());
    }
}
