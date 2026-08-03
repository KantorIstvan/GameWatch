package com.gamewatch.service;

import com.gamewatch.entity.DailyHealthMetrics;
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
