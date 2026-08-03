package com.gamewatch.service;

import com.gamewatch.entity.DailyHealthMetrics;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.DailyHealthMetricsRepository;
import com.gamewatch.repository.HealthSettingsRepository;
import com.gamewatch.repository.MoodEntryRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

    @Mock
    private HealthSettingsRepository healthSettingsRepository;

    @Mock
    private MoodEntryRepository moodEntryRepository;

    @Mock
    private DailyHealthMetricsRepository dailyHealthMetricsRepository;

    @Mock
    private SessionHistoryRepository sessionHistoryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private HealthService healthService;

    @Test
    void getYearlyHeatmap_returnsScoresKeyedByDateForRequestedYear() {
        User user = User.builder().id(1L).auth0UserId("auth0|123").build();

        DailyHealthMetrics jan1 = DailyHealthMetrics.builder()
            .user(user).metricDate(LocalDate.of(2024, 1, 1)).healthScore(80).build();
        DailyHealthMetrics jan2 = DailyHealthMetrics.builder()
            .user(user).metricDate(LocalDate.of(2024, 1, 2)).healthScore(null).build();

        when(dailyHealthMetricsRepository.findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
                anyLong(), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(List.of(jan1, jan2));

        Map<LocalDate, Integer> heatmap = healthService.getYearlyHeatmap(user, 2024);

        assertThat(heatmap).hasSize(2);
        assertThat(heatmap.get(LocalDate.of(2024, 1, 1))).isEqualTo(80);
        // A day with sessions but no computed score yet falls back to a neutral 50,
        // matching the same fallback the main dashboard heatmap already uses.
        assertThat(heatmap.get(LocalDate.of(2024, 1, 2))).isEqualTo(50);
    }

    @Test
    void getYearlyHeatmap_forPastYear_queriesFullJanuaryToDecemberRange() {
        User user = User.builder().id(1L).auth0UserId("auth0|123").build();
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
                anyLong(), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(List.of());

        healthService.getYearlyHeatmap(user, 2023);

        org.mockito.Mockito.verify(dailyHealthMetricsRepository)
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
                user.getId(), LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31));
    }

    @Test
    void recalculateMetricsForDate_bucketsTheDayInTheUsersZoneNotTheServers() {
        // Health used to bucket days in the server's zone while the statistics page used
        // the user's, so the two pages disagreed about which day a session belonged to.
        User user = User.builder()
            .id(1L).auth0UserId("auth0|123").timezone("Pacific/Auckland").build();

        ArgumentCaptor<Instant> start = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> end = ArgumentCaptor.forClass(Instant.class);
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(
                anyLong(), start.capture(), end.capture()))
            .thenReturn(List.of());

        healthService.recalculateMetricsForDate(user, LocalDate.of(2026, 3, 10));

        ZoneId auckland = ZoneId.of("Pacific/Auckland");
        assertThat(start.getValue())
            .isEqualTo(LocalDate.of(2026, 3, 10).atStartOfDay(auckland).toInstant());
        assertThat(end.getValue())
            .isEqualTo(LocalDate.of(2026, 3, 11).atStartOfDay(auckland).toInstant());
    }

    @Test
    void recalculateMetricsForDate_clearsTheStoredRowWhenNothingIsLeftOnTheDay() {
        // Recalculation used to bail out as soon as a day had no sessions, so it could only
        // ever raise or restate a day's metrics, never clear them. Deleting every session
        // from a day left its hours and score in the heatmap permanently.
        User user = User.builder().id(1L).auth0UserId("auth0|123").timezone("UTC").build();
        DailyHealthMetrics stale = DailyHealthMetrics.builder()
            .user(user).metricDate(LocalDate.of(2026, 3, 10)).healthScore(72).totalHours(4.0).build();

        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of());
        when(moodEntryRepository.calculateAverageMood(anyLong(), any(), any())).thenReturn(null);
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDate(1L, LocalDate.of(2026, 3, 10)))
            .thenReturn(Optional.of(stale));

        healthService.recalculateMetricsForDate(user, LocalDate.of(2026, 3, 10));

        org.mockito.Mockito.verify(dailyHealthMetricsRepository).delete(stale);
        org.mockito.Mockito.verify(dailyHealthMetricsRepository, org.mockito.Mockito.never())
            .save(any(DailyHealthMetrics.class));
    }

    @Test
    void recalculateMetricsForDate_keepsADayThatHasAMoodButNoSessions() {
        // Mood can be logged without a session attached, and a day like that is still a day
        // worth scoring - clearing it would throw away real data.
        User user = User.builder().id(1L).auth0UserId("auth0|123").timezone("UTC").build();

        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of());
        when(moodEntryRepository.calculateAverageMood(anyLong(), any(), any())).thenReturn(4.0);
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDate(anyLong(), any()))
            .thenReturn(Optional.empty());

        healthService.recalculateMetricsForDate(user, LocalDate.of(2026, 3, 10));

        org.mockito.Mockito.verify(dailyHealthMetricsRepository).save(any(DailyHealthMetrics.class));
        org.mockito.Mockito.verify(dailyHealthMetricsRepository, org.mockito.Mockito.never())
            .delete(any(DailyHealthMetrics.class));
    }

    /** A short, well-broken, mid-afternoon session - nothing about it should cost points. */
    private SessionHistory unremarkableAfternoonSession() {
        Instant start = LocalDate.of(2026, 3, 10).atTime(14, 0).toInstant(ZoneOffset.UTC);
        return SessionHistory.builder()
            .id(1L)
            .playthrough(Playthrough.builder().id(1L).build())
            .sessionNumber(1)
            .durationSeconds(3600L)
            .pauseCount(1)
            .startedAt(start)
            .endedAt(start.plusSeconds(3600L))
            .build();
    }

    private Integer scoreFor(User user, SessionHistory session, Double averageMood) {
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of(session));
        when(moodEntryRepository.calculateAverageMood(anyLong(), any(), any())).thenReturn(averageMood);
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDate(anyLong(), any()))
            .thenReturn(Optional.empty());

        ArgumentCaptor<DailyHealthMetrics> saved = ArgumentCaptor.forClass(DailyHealthMetrics.class);
        healthService.recalculateMetricsForDate(user, LocalDate.of(2026, 3, 10));
        org.mockito.Mockito.verify(dailyHealthMetricsRepository).save(saved.capture());
        return saved.getValue().getHealthScore();
    }

    @Test
    void healthScore_isNotReducedForSkippingTheMoodPrompt() {
        // Scoring an absent mood as a neutral 3/5 charged a 0.25-weight penalty of 0.5 just
        // for saying nothing, capping an otherwise flawless day at 87. Dismissing a dialog
        // is not a health outcome.
        User adult = User.builder().id(1L).auth0UserId("auth0|123").timezone("UTC").age(30).build();

        assertThat(scoreFor(adult, unremarkableAfternoonSession(), null)).isEqualTo(100);
    }

    @Test
    void healthScore_stillReflectsMoodWhenOneWasLogged() {
        User adult = User.builder().id(1L).auth0UserId("auth0|123").timezone("UTC").age(30).build();

        assertThat(scoreFor(adult, unremarkableAfternoonSession(), 5.0)).isEqualTo(100);
        org.mockito.Mockito.reset(sessionHistoryRepository, moodEntryRepository, dailyHealthMetricsRepository);
        assertThat(scoreFor(adult, unremarkableAfternoonSession(), 1.0)).isEqualTo(75);
    }

    @Test
    void lateNightWindow_followsTheAgeBandRatherThanAHardcodedHour() {
        // A 22:30 session is late night for a 10-year-old (band starts 22:00) but not yet
        // for a 15-year-old (band starts 23:00). The per-band value existed but was never
        // read, so both used to be measured against a hardcoded 22:00.
        Instant start = LocalDate.of(2026, 3, 10).atTime(22, 30).toInstant(ZoneOffset.UTC);
        SessionHistory lateSession = SessionHistory.builder()
            .id(1L).playthrough(Playthrough.builder().id(1L).build()).sessionNumber(1)
            .durationSeconds(1800L).pauseCount(1)
            .startedAt(start).endedAt(start.plusSeconds(1800L))
            .build();

        User teenager = User.builder().id(1L).auth0UserId("auth0|t").timezone("UTC").age(15).build();
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of(lateSession));
        when(moodEntryRepository.calculateAverageMood(anyLong(), any(), any())).thenReturn(null);
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDate(anyLong(), any()))
            .thenReturn(Optional.empty());

        ArgumentCaptor<DailyHealthMetrics> saved = ArgumentCaptor.forClass(DailyHealthMetrics.class);
        healthService.recalculateMetricsForDate(teenager, LocalDate.of(2026, 3, 10));
        org.mockito.Mockito.verify(dailyHealthMetricsRepository).save(saved.capture());

        assertThat(saved.getValue().getLateNightMinutes()).isZero();
    }

    @Test
    void getHealthDashboard_startsTheWeekOnTheUsersPreferredDay() {
        // The statistics page already honours this preference. A dashboard that always
        // started its week on Monday made the two pages' weekly totals irreconcilable for
        // anyone using a Sunday week.
        User user = User.builder()
            .id(1L).auth0UserId("auth0|123").timezone("UTC").firstDayOfWeek("SUNDAY").build();

        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of());
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDate(anyLong(), any()))
            .thenReturn(Optional.empty());
        when(dailyHealthMetricsRepository.findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
                anyLong(), any(), any()))
            .thenReturn(List.of());
        when(moodEntryRepository.findByUserIdAndRecordedAtBetweenOrderByRecordedAtDesc(
                anyLong(), any(), any()))
            .thenReturn(List.of());
        when(healthSettingsRepository.findByUserId(anyLong())).thenReturn(Optional.empty());

        healthService.getHealthDashboard(user);

        ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
        org.mockito.Mockito.verify(dailyHealthMetricsRepository, org.mockito.Mockito.atLeastOnce())
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
                anyLong(), from.capture(), any(LocalDate.class));

        assertThat(from.getAllValues())
            .filteredOn(d -> d.getYear() == LocalDate.now(ZoneId.of("UTC")).getYear())
            .anyMatch(d -> d.getDayOfWeek() == DayOfWeek.SUNDAY);
    }
}
