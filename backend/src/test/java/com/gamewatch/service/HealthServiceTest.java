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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
}
