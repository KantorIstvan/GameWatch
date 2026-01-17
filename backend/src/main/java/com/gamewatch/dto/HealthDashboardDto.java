package com.gamewatch.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthDashboardDto {
    
    // Current score and trend
    private Integer currentHealthScore;
    private LocalDate currentDate;
    private Double weeklyAverageScore;
    private List<Integer> last7DaysScores;
    
    // Heatmap data (date -> score)
    private Map<LocalDate, Integer> yearlyHeatmap;
    
    // Current metrics
    private DailyHealthMetricsDto todayMetrics;
    private WeeklyMetricsDto weekMetrics;
    
    // Recent mood entries
    private List<MoodEntryDto> recentMoods;
    
    // Recent sessions with mood
    private List<SessionWithMoodDto> recentSessions;
    
    // Goal progress
    private GoalProgressDto goalProgress;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WeeklyMetricsDto {
        private Double totalHours;
        private Integer totalSessions;
        private Double averageMood;
        private Double breakCompliance;
        private Long lateNightMinutes;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionWithMoodDto {
        private Long sessionId;
        private Long playthroughId;
        private String gameName;
        private Long durationSeconds;
        private Integer moodRating;
        private java.time.Instant endedAt;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GoalProgressDto {
        private Boolean goalsEnabled;
        private Double hoursToday;
        private Double maxHoursPerDay;
        private Boolean maxHoursPerDayEnabled;
        private Integer sessionsToday;
        private Integer maxSessionsPerDay;
        private Boolean maxSessionsPerDayEnabled;
        private Double hoursThisWeek;
        private Double maxHoursPerWeek;
        private Boolean maxHoursPerWeekEnabled;
    }
}
