package com.gamewatch.service;

import com.gamewatch.dto.*;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthService {

    private final HealthSettingsRepository healthSettingsRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final DailyHealthMetricsRepository dailyHealthMetricsRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final UserRepository userRepository;

    // Health score weights
    // Reduce hours weight, increase mood/breaks (what actually matters for health)
    private static final double WEIGHT_HOURS = 0.20;      // same
    private static final double WEIGHT_SESSIONS = 0.15;   // same
    private static final double WEIGHT_BREAKS = 0.15;     // reduced from 0.25
    private static final double WEIGHT_MOOD = 0.25;       // same
    private static final double WEIGHT_LATE_NIGHT = 0.25; // increased from 0.15

    @Transactional
    public HealthSettingsDto getHealthSettings(User user) {
        HealthSettings settings = healthSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> createDefaultHealthSettings(user));
        return mapToHealthSettingsDto(settings);
    }

    @Transactional
    public HealthSettingsDto updateHealthSettings(User user, HealthSettingsDto dto) {
        HealthSettings settings = healthSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> {
                HealthSettings newSettings = HealthSettings.builder()
                    .user(user)
                    .build();
                return newSettings;
            });

        // Update all fields
        settings.setNotificationsEnabled(dto.getNotificationsEnabled());
        settings.setSoundsEnabled(dto.getSoundsEnabled());
        settings.setHydrationReminderEnabled(dto.getHydrationReminderEnabled());
        settings.setHydrationIntervalMinutes(dto.getHydrationIntervalMinutes());
        settings.setStandReminderEnabled(dto.getStandReminderEnabled());
        settings.setStandIntervalMinutes(dto.getStandIntervalMinutes());
        settings.setBreakReminderEnabled(dto.getBreakReminderEnabled());
        settings.setBreakIntervalMinutes(dto.getBreakIntervalMinutes());
        settings.setBreakDurationMinutes(dto.getBreakDurationMinutes());
        settings.setGoalsEnabled(dto.getGoalsEnabled());
        settings.setMaxHoursPerDayEnabled(dto.getMaxHoursPerDayEnabled());
        settings.setMaxHoursPerDay(dto.getMaxHoursPerDay());
        settings.setMaxSessionsPerDayEnabled(dto.getMaxSessionsPerDayEnabled());
        settings.setMaxSessionsPerDay(dto.getMaxSessionsPerDay());
        settings.setMaxHoursPerWeekEnabled(dto.getMaxHoursPerWeekEnabled());
        settings.setMaxHoursPerWeek(dto.getMaxHoursPerWeek());
        settings.setGoalNotificationsEnabled(dto.getGoalNotificationsEnabled());
        settings.setMoodPromptEnabled(dto.getMoodPromptEnabled());
        settings.setMoodPromptRequired(dto.getMoodPromptRequired());

        settings = healthSettingsRepository.save(settings);
        log.info("Updated health settings for user {}", user.getId());
        return mapToHealthSettingsDto(settings);
    }

    @Transactional
    public MoodEntryDto submitMood(User user, SubmitMoodRequest request) {
        if (request.getMoodRating() < 1 || request.getMoodRating() > 5) {
            throw new RuntimeException("Mood rating must be between 1 and 5");
        }

        SessionHistory sessionHistory = null;
        if (request.getSessionHistoryId() != null) {
            sessionHistory = sessionHistoryRepository.findById(request.getSessionHistoryId())
                .orElse(null);
        }

        MoodEntry moodEntry = MoodEntry.builder()
            .user(user)
            .sessionHistory(sessionHistory)
            .moodRating(request.getMoodRating())
            .note(request.getNote())
            .recordedAt(Instant.now())
            .build();

        moodEntry = moodEntryRepository.save(moodEntry);
        log.info("Saved mood entry for user {}: rating={}", user.getId(), request.getMoodRating());

        // Recalculate today's metrics
        recalculateMetricsForDate(user, LocalDate.now());

        return mapToMoodEntryDto(moodEntry);
    }

    /**
     * Save a mood entry directly (used by other services for auto-logging).
     */
    @Transactional
    public MoodEntry saveMoodEntry(MoodEntry moodEntry) {
        moodEntry = moodEntryRepository.save(moodEntry);
        log.info("Saved mood entry for user {}: rating={}", moodEntry.getUser().getId(), moodEntry.getMoodRating());
        
        // Recalculate today's metrics
        LocalDate date = LocalDateTime.ofInstant(moodEntry.getRecordedAt(), ZoneId.systemDefault()).toLocalDate();
        recalculateMetricsForDate(moodEntry.getUser(), date);
        
        return moodEntry;
    }

    @Transactional
    public void recalculateMetricsForDate(User user, LocalDate date) {
        log.info("Recalculating health metrics for user {} on {}", user.getId(), date);

        // Get all sessions for this date
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
        Instant startInstant = startOfDay.atZone(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endOfDay.atZone(ZoneId.systemDefault()).toInstant();

        List<SessionHistory> sessions = sessionHistoryRepository
            .findSessionsByUserAndDateRange(user.getId(), startInstant, endInstant);

        if (sessions.isEmpty()) {
            log.debug("No sessions found for user {} on {}", user.getId(), date);
            return;
        }

        // Calculate metrics
        double totalHours = sessions.stream()
            .mapToLong(SessionHistory::getDurationSeconds)
            .sum() / 3600.0;

        int sessionCount = sessions.size();

        // Calculate average mood for the day
        Double averageMood = moodEntryRepository.calculateAverageMood(user.getId(), startInstant, endInstant);

        // Calculate late-night minutes and time-of-day breakdown
        long lateNightMinutes = 0;
        int morningSessions = 0;
        int afternoonSessions = 0;
        int eveningSessions = 0;
        int nightSessions = 0;
        int lateNightSessions = 0;

        for (SessionHistory session : sessions) {
            LocalTime startTime = LocalDateTime.ofInstant(session.getStartedAt(), ZoneId.systemDefault()).toLocalTime();
            LocalTime endTime = LocalDateTime.ofInstant(session.getEndedAt(), ZoneId.systemDefault()).toLocalTime();

            // Count late-night minutes (22:00 - 06:00)
            lateNightMinutes += calculateLateNightMinutes(session.getStartedAt(), session.getEndedAt());

            // Categorize by start time
            int hour = startTime.getHour();
            if (hour >= 6 && hour < 12) {
                morningSessions++;
            } else if (hour >= 12 && hour < 18) {
                afternoonSessions++;
            } else if (hour >= 18 && hour < 22) {
                eveningSessions++;
            } else if (hour >= 22 && hour < 24) {
                nightSessions++;
            } else { // 0-6
                lateNightSessions++;
            }
        }

        // Calculate break compliance (only for sessions > 50 minutes)
        List<SessionHistory> longSessions = sessions.stream()
            .filter(s -> s.getDurationSeconds() > 3000) // 50 minutes
            .collect(Collectors.toList());
        
        int longSessionCount = longSessions.size();
        int longSessionsWithBreaks = (int) longSessions.stream()
            .filter(s -> s.getPauseCount() > 0)
            .count();
        
        // Only calculate break compliance if there are sessions > 50 minutes
        // Otherwise, perfect compliance (no penalty)
        double breakComplianceRatio = longSessionCount > 0 
            ? (double) longSessionsWithBreaks / longSessionCount 
            : 1.0;

        // Calculate health score
        Integer healthScore = calculateHealthScore(user, totalHours, sessionCount, 
            averageMood, lateNightMinutes, breakComplianceRatio, date);

        // For statistics tracking, count all sessions with breaks (regardless of duration)
        int allSessionsWithBreaks = (int) sessions.stream()
            .filter(s -> s.getPauseCount() > 0)
            .count();

        // Save or update metrics
        DailyHealthMetrics metrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDate(user.getId(), date)
            .orElseGet(() -> DailyHealthMetrics.builder()
                .user(user)
                .metricDate(date)
                .build());

        metrics.setHealthScore(healthScore);
        metrics.setTotalHours(totalHours);
        metrics.setSessionCount(sessionCount);
        metrics.setAverageMood(averageMood);
        metrics.setLateNightMinutes(lateNightMinutes);
        metrics.setBreakComplianceRatio(breakComplianceRatio);
        metrics.setSessionsWithBreaks(allSessionsWithBreaks);
        metrics.setMorningSessions(morningSessions);
        metrics.setAfternoonSessions(afternoonSessions);
        metrics.setEveningSessions(eveningSessions);
        metrics.setNightSessions(nightSessions);
        metrics.setLateNightSessions(lateNightSessions);

        dailyHealthMetricsRepository.save(metrics);
        log.info("Saved health metrics for user {} on {}: score={}, hours={}, sessions={}", 
            user.getId(), date, healthScore, totalHours, sessionCount);
    }

    private long calculateLateNightMinutes(Instant startInstant, Instant endInstant) {
        LocalDateTime start = LocalDateTime.ofInstant(startInstant, ZoneId.systemDefault());
        LocalDateTime end = LocalDateTime.ofInstant(endInstant, ZoneId.systemDefault());
        
        long lateNightMinutes = 0;
        LocalDateTime current = start;
        
        while (current.isBefore(end)) {
            LocalTime time = current.toLocalTime();
            int hour = time.getHour();
            
            // Late night is 22:00-06:00
            if (hour >= 22 || hour < 6) {
                LocalDateTime nextHour = current.plusMinutes(1);
                if (nextHour.isAfter(end)) {
                    lateNightMinutes += ChronoUnit.MINUTES.between(current, end);
                    break;
                } else {
                    lateNightMinutes++;
                    current = nextHour;
                }
            } else {
                current = current.plusMinutes(1);
            }
        }
        
        return lateNightMinutes;
    }

    /**
     * Backfill missing health metrics for dates that have sessions but no metrics calculated
     */
    @Transactional
    public void backfillMissingMetrics(User user, LocalDate startDate, LocalDate endDate) {
        log.debug("Checking for missing health metrics for user {} from {} to {}", user.getId(), startDate, endDate);
        
        // Get all session dates in the range
        LocalDateTime startOfPeriod = startDate.atStartOfDay();
        LocalDateTime endOfPeriod = endDate.plusDays(1).atStartOfDay();
        Instant startInstant = startOfPeriod.atZone(ZoneId.systemDefault()).toInstant();
        Instant endInstant = endOfPeriod.atZone(ZoneId.systemDefault()).toInstant();
        
        List<SessionHistory> sessions = sessionHistoryRepository
            .findSessionsByUserAndDateRange(user.getId(), startInstant, endInstant);
        
        if (sessions.isEmpty()) {
            log.debug("No sessions found for user {} in the period", user.getId());
            return;
        }
        
        // Group sessions by date
        Map<LocalDate, List<SessionHistory>> sessionsByDate = sessions.stream()
            .collect(Collectors.groupingBy(session -> 
                LocalDateTime.ofInstant(session.getEndedAt(), ZoneOffset.UTC).toLocalDate()
            ));
        
        // Check each date for missing metrics
        for (LocalDate date : sessionsByDate.keySet()) {
            boolean hasMetrics = dailyHealthMetricsRepository
                .findByUserIdAndMetricDate(user.getId(), date)
                .isPresent();
            
            if (!hasMetrics) {
                log.info("Backfilling missing health metrics for user {} on {}", user.getId(), date);
                recalculateMetricsForDate(user, date);
            }
        }
    }

    private Integer calculateHealthScore(User user, double totalHours, int sessionCount, 
                                        Double averageMood, long lateNightMinutes, 
                                        double breakComplianceRatio, LocalDate date) {
        
        // Get age-based limits
        AgeLimits limits = getAgeLimits(user.getAge());
        
        // Calculate weekly hours for better context
        LocalDate weekStart = date.minusDays(6);
        List<DailyHealthMetrics> weekMetrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(user.getId(), weekStart, date);
        double weeklyHours = weekMetrics.stream()
            .mapToDouble(m -> m.getTotalHours() != null ? m.getTotalHours() : 0.0)
            .sum() + totalHours;

        // Only penalize hours when approaching/exceeding limit (80%+)
        double normHours = Math.max(0.0, (totalHours - 0.8 * limits.maxHoursPerDay) / (0.2 * limits.maxHoursPerDay));
        normHours = Math.min(1.0, normHours);

        // Only penalize sessions if too many (3+ for adults is fragmented)
        double normSessions = sessionCount <= 2 ? 0.0 : Math.min(1.0, (sessionCount - 2.0) / 3.0);
        
        // Break penalty (0 = perfect breaks, 1 = no breaks)
        double breakPenalty = 1.0 - breakComplianceRatio;
        
        // Mood penalty (0 = perfect mood 5, 1 = worst mood 1)
        double moodPenalty = averageMood != null ? (5.0 - averageMood) / 4.0 : 0.5;
        
        // Late night penalty (proportion of total time spent in late night)
        double totalMinutes = totalHours * 60;
        double latePenalty = totalMinutes > 0 ? Math.min(1.0, lateNightMinutes / totalMinutes) : 0.0;
        
        // Calculate weighted penalty
        double weightedPenalty = WEIGHT_HOURS * normHours
                               + WEIGHT_SESSIONS * normSessions
                               + WEIGHT_BREAKS * breakPenalty
                               + WEIGHT_MOOD * moodPenalty
                               + WEIGHT_LATE_NIGHT * latePenalty;
        
        // Calculate score (0-100)
        int healthScore = (int) Math.round(100 * (1.0 - weightedPenalty));
        
        log.debug("Health score calculation for user {}: normHours={}, normSessions={}, " +
                 "breakPenalty={}, moodPenalty={}, latePenalty={}, weightedPenalty={}, score={}", 
                 user.getId(), normHours, normSessions, breakPenalty, moodPenalty, 
                 latePenalty, weightedPenalty, healthScore);
        
        return Math.max(0, Math.min(100, healthScore));
    }

    private AgeLimits getAgeLimits(Integer age) {
        if (age == null) {
            age = 18; // Default to adult
        }
        
        if (age <= 2) {
            return new AgeLimits(0.0, 0, 0, 15, LocalTime.of(21, 0));
        } else if (age <= 5) {
            return new AgeLimits(1.0, 7.0, 2, 15, LocalTime.of(21, 0));
        } else if (age <= 12) {
            return new AgeLimits(2.0, 14.0, 3, 30, LocalTime.of(22, 0));
        } else if (age <= 17) {
            return new AgeLimits(2.0, 14.0, 3, 60, LocalTime.of(23, 0));
        } else {
            // Adults - use LocalTime.MAX (23:59:59) to effectively disable late night tracking
            return new AgeLimits(3.0, 21.0, 3, 60, LocalTime.MAX); // Adults
        }
    }

    @Data
    @AllArgsConstructor
    private static class AgeLimits {
        double maxHoursPerDay;
        double maxHoursPerWeek;
        int maxSessionsPerDay;
        int breakIntervalMinutes;
        LocalTime lateNightStart;
    }

    @Transactional
    public HealthDashboardDto getHealthDashboard(User user) {
        LocalDate today = LocalDate.now();
        
        // Calendar week: Monday of current week (ISO 8601)
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        
        // Calendar year: January 1st of current year
        LocalDate yearStart = LocalDate.of(today.getYear(), 1, 1);

        // Backfill missing metrics for recent dates
        backfillMissingMetrics(user, weekStart, today);

        // Get today's metrics
        DailyHealthMetrics todayMetrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDate(user.getId(), today)
            .orElse(null);

        // Get current week's data (Monday to today)
        List<DailyHealthMetrics> weekData = dailyHealthMetricsRepository
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(user.getId(), weekStart, today);

        List<Integer> weekScores = weekData.stream()
            .sorted(Comparator.comparing(DailyHealthMetrics::getMetricDate))
            .map(DailyHealthMetrics::getHealthScore)
            .collect(Collectors.toList());

        Double weeklyAverageScore = dailyHealthMetricsRepository
            .calculateAverageHealthScore(user.getId(), weekStart, today);

        // Get yearly data for heatmap
        List<DailyHealthMetrics> yearlyMetrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(user.getId(), yearStart, today);

        Map<LocalDate, Integer> yearlyHeatmap = yearlyMetrics.stream()
            .collect(Collectors.toMap(
                DailyHealthMetrics::getMetricDate,
                m -> m.getHealthScore() != null ? m.getHealthScore() : 50
            ));

        // Calculate weekly metrics (calendar week)
        HealthDashboardDto.WeeklyMetricsDto weekMetrics = calculateWeeklyMetrics(weekData);

        // Get recent moods (current week)
        Instant weekStartInstant = weekStart.atStartOfDay().atZone(ZoneId.systemDefault()).toInstant();
        List<MoodEntry> recentMoodEntries = moodEntryRepository
            .findByUserIdAndRecordedAtBetweenOrderByRecordedAtDesc(user.getId(), weekStartInstant, Instant.now());
        List<MoodEntryDto> recentMoods = recentMoodEntries.stream()
            .limit(10)
            .map(this::mapToMoodEntryDto)
            .collect(Collectors.toList());

        // Get recent sessions with mood (current week)
        List<HealthDashboardDto.SessionWithMoodDto> recentSessions = getRecentSessionsWithMood(user, weekStart, today);

        // Get goal progress
        HealthDashboardDto.GoalProgressDto goalProgress = calculateGoalProgress(user, today);

        return HealthDashboardDto.builder()
            .currentHealthScore(todayMetrics != null ? todayMetrics.getHealthScore() : null)
            .currentDate(today)
            .weeklyAverageScore(weeklyAverageScore)
            .last7DaysScores(weekScores)
            .yearlyHeatmap(yearlyHeatmap)
            .todayMetrics(todayMetrics != null ? mapToDailyHealthMetricsDto(todayMetrics) : null)
            .weekMetrics(weekMetrics)
            .recentMoods(recentMoods)
            .recentSessions(recentSessions)
            .goalProgress(goalProgress)
            .build();
    }

    private HealthDashboardDto.WeeklyMetricsDto calculateWeeklyMetrics(List<DailyHealthMetrics> weekData) {
        double totalHours = weekData.stream()
            .mapToDouble(m -> m.getTotalHours() != null ? m.getTotalHours() : 0.0)
            .sum();

        int totalSessions = weekData.stream()
            .mapToInt(DailyHealthMetrics::getSessionCount)
            .sum();

        double avgMood = weekData.stream()
            .filter(m -> m.getAverageMood() != null)
            .mapToDouble(DailyHealthMetrics::getAverageMood)
            .average()
            .orElse(0.0);

        double avgBreakCompliance = weekData.stream()
            .filter(m -> m.getBreakComplianceRatio() != null)
            .mapToDouble(DailyHealthMetrics::getBreakComplianceRatio)
            .average()
            .orElse(0.0);

        long totalLateNightMinutes = weekData.stream()
            .mapToLong(DailyHealthMetrics::getLateNightMinutes)
            .sum();

        return HealthDashboardDto.WeeklyMetricsDto.builder()
            .totalHours(totalHours)
            .totalSessions(totalSessions)
            .averageMood(avgMood > 0 ? avgMood : null)
            .breakCompliance(avgBreakCompliance)
            .lateNightMinutes(totalLateNightMinutes)
            .build();
    }

    private List<HealthDashboardDto.SessionWithMoodDto> getRecentSessionsWithMood(User user, LocalDate weekStart, LocalDate today) {
        Instant startInstant = weekStart.atStartOfDay().atZone(ZoneId.systemDefault()).toInstant();
        Instant endInstant = today.plusDays(1).atStartOfDay().atZone(ZoneId.systemDefault()).toInstant();
        
        List<SessionHistory> sessions = sessionHistoryRepository
            .findSessionsByUserAndDateRange(user.getId(), startInstant, endInstant);

        return sessions.stream()
            .sorted(Comparator.comparing(SessionHistory::getEndedAt).reversed())
            .limit(10)
            .map(session -> {
                // Find mood for this session
                Integer mood = moodEntryRepository.findBySessionHistoryId(session.getId())
                    .map(MoodEntry::getMoodRating)
                    .orElse(null);

                return HealthDashboardDto.SessionWithMoodDto.builder()
                    .sessionId(session.getId())
                    .playthroughId(session.getPlaythrough().getId())
                    .gameName(session.getPlaythrough().getGame().getName())
                    .durationSeconds(session.getDurationSeconds())
                    .moodRating(mood)
                    .endedAt(session.getEndedAt())
                    .build();
            })
            .collect(Collectors.toList());
    }

    private HealthDashboardDto.GoalProgressDto calculateGoalProgress(User user, LocalDate today) {
        HealthSettings settings = healthSettingsRepository.findByUserId(user.getId())
            .orElse(null);

        DailyHealthMetrics todayMetrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDate(user.getId(), today)
            .orElse(null);

        // Calendar week: Monday of current week
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        List<DailyHealthMetrics> weekMetrics = dailyHealthMetricsRepository
            .findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(user.getId(), weekStart, today);

        double hoursToday = todayMetrics != null && todayMetrics.getTotalHours() != null 
            ? todayMetrics.getTotalHours() : 0.0;
        int sessionsToday = todayMetrics != null ? todayMetrics.getSessionCount() : 0;
        double hoursThisWeek = weekMetrics.stream()
            .mapToDouble(m -> m.getTotalHours() != null ? m.getTotalHours() : 0.0)
            .sum();

        return HealthDashboardDto.GoalProgressDto.builder()
            .goalsEnabled(settings != null && settings.getGoalsEnabled())
            .hoursToday(hoursToday)
            .maxHoursPerDay(settings != null ? settings.getMaxHoursPerDay() : null)
            .maxHoursPerDayEnabled(settings != null && settings.getMaxHoursPerDayEnabled())
            .sessionsToday(sessionsToday)
            .maxSessionsPerDay(settings != null ? settings.getMaxSessionsPerDay() : null)
            .maxSessionsPerDayEnabled(settings != null && settings.getMaxSessionsPerDayEnabled())
            .hoursThisWeek(hoursThisWeek)
            .maxHoursPerWeek(settings != null ? settings.getMaxHoursPerWeek() : null)
            .maxHoursPerWeekEnabled(settings != null && settings.getMaxHoursPerWeekEnabled())
            .build();
    }

    private HealthSettings createDefaultHealthSettings(User user) {
        HealthSettings settings = HealthSettings.builder()
            .user(user)
            .build();
        return healthSettingsRepository.save(settings);
    }

    private HealthSettingsDto mapToHealthSettingsDto(HealthSettings settings) {
        return HealthSettingsDto.builder()
            .notificationsEnabled(settings.getNotificationsEnabled())
            .soundsEnabled(settings.getSoundsEnabled())
            .hydrationReminderEnabled(settings.getHydrationReminderEnabled())
            .hydrationIntervalMinutes(settings.getHydrationIntervalMinutes())
            .standReminderEnabled(settings.getStandReminderEnabled())
            .standIntervalMinutes(settings.getStandIntervalMinutes())
            .breakReminderEnabled(settings.getBreakReminderEnabled())
            .breakIntervalMinutes(settings.getBreakIntervalMinutes())
            .breakDurationMinutes(settings.getBreakDurationMinutes())
            .goalsEnabled(settings.getGoalsEnabled())
            .maxHoursPerDayEnabled(settings.getMaxHoursPerDayEnabled())
            .maxHoursPerDay(settings.getMaxHoursPerDay())
            .maxSessionsPerDayEnabled(settings.getMaxSessionsPerDayEnabled())
            .maxSessionsPerDay(settings.getMaxSessionsPerDay())
            .maxHoursPerWeekEnabled(settings.getMaxHoursPerWeekEnabled())
            .maxHoursPerWeek(settings.getMaxHoursPerWeek())
            .goalNotificationsEnabled(settings.getGoalNotificationsEnabled())
            .moodPromptEnabled(settings.getMoodPromptEnabled())
            .moodPromptRequired(settings.getMoodPromptRequired())
            .build();
    }

    private MoodEntryDto mapToMoodEntryDto(MoodEntry entry) {
        return MoodEntryDto.builder()
            .id(entry.getId())
            .sessionHistoryId(entry.getSessionHistory() != null ? entry.getSessionHistory().getId() : null)
            .moodRating(entry.getMoodRating())
            .note(entry.getNote())
            .recordedAt(entry.getRecordedAt())
            .build();
    }

    private DailyHealthMetricsDto mapToDailyHealthMetricsDto(DailyHealthMetrics metrics) {
        return DailyHealthMetricsDto.builder()
            .id(metrics.getId())
            .metricDate(metrics.getMetricDate())
            .healthScore(metrics.getHealthScore())
            .totalHours(metrics.getTotalHours())
            .sessionCount(metrics.getSessionCount())
            .averageMood(metrics.getAverageMood())
            .lateNightMinutes(metrics.getLateNightMinutes())
            .breakComplianceRatio(metrics.getBreakComplianceRatio())
            .sessionsWithBreaks(metrics.getSessionsWithBreaks())
            .morningSessions(metrics.getMorningSessions())
            .afternoonSessions(metrics.getAfternoonSessions())
            .eveningSessions(metrics.getEveningSessions())
            .nightSessions(metrics.getNightSessions())
            .lateNightSessions(metrics.getLateNightSessions())
            .build();
    }
}
