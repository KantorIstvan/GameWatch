package com.gamewatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthSettingsDto {
    
    // Notification settings
    private Boolean notificationsEnabled;
    private Boolean soundsEnabled;
    private Boolean hydrationReminderEnabled;
    private Integer hydrationIntervalMinutes;
    private Boolean standReminderEnabled;
    private Integer standIntervalMinutes;
    private Boolean breakReminderEnabled;
    private Integer breakIntervalMinutes;
    private Integer breakDurationMinutes;
    
    // Goal settings
    private Boolean goalsEnabled;
    private Boolean maxHoursPerDayEnabled;
    private Double maxHoursPerDay;
    private Boolean maxSessionsPerDayEnabled;
    private Integer maxSessionsPerDay;
    private Boolean maxHoursPerWeekEnabled;
    private Double maxHoursPerWeek;
    private Boolean goalNotificationsEnabled;
    
    // Mood prompt settings
    private Boolean moodPromptEnabled;
    private Boolean moodPromptRequired;
}
