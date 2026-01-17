package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "health_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Notification settings
    @Column(name = "notifications_enabled")
    @Builder.Default
    private Boolean notificationsEnabled = false;

    @Column(name = "sounds_enabled")
    @Builder.Default
    private Boolean soundsEnabled = false;

    @Column(name = "hydration_reminder_enabled")
    @Builder.Default
    private Boolean hydrationReminderEnabled = false;

    @Column(name = "hydration_interval_minutes")
    @Builder.Default
    private Integer hydrationIntervalMinutes = 30;

    @Column(name = "stand_reminder_enabled")
    @Builder.Default
    private Boolean standReminderEnabled = false;

    @Column(name = "stand_interval_minutes")
    @Builder.Default
    private Integer standIntervalMinutes = 60;

    @Column(name = "break_reminder_enabled")
    @Builder.Default
    private Boolean breakReminderEnabled = false;

    @Column(name = "break_interval_minutes")
    @Builder.Default
    private Integer breakIntervalMinutes = 50;

    @Column(name = "break_duration_minutes")
    @Builder.Default
    private Integer breakDurationMinutes = 10;

    // Goal settings
    @Column(name = "goals_enabled")
    @Builder.Default
    private Boolean goalsEnabled = false;

    @Column(name = "max_hours_per_day_enabled")
    @Builder.Default
    private Boolean maxHoursPerDayEnabled = false;

    @Column(name = "max_hours_per_day")
    private Double maxHoursPerDay;

    @Column(name = "max_sessions_per_day_enabled")
    @Builder.Default
    private Boolean maxSessionsPerDayEnabled = false;

    @Column(name = "max_sessions_per_day")
    private Integer maxSessionsPerDay;

    @Column(name = "max_hours_per_week_enabled")
    @Builder.Default
    private Boolean maxHoursPerWeekEnabled = false;

    @Column(name = "max_hours_per_week")
    private Double maxHoursPerWeek;

    @Column(name = "goal_notifications_enabled")
    @Builder.Default
    private Boolean goalNotificationsEnabled = false;

    // Mood prompt settings
    @Column(name = "mood_prompt_enabled")
    @Builder.Default
    private Boolean moodPromptEnabled = true;

    @Column(name = "mood_prompt_required")
    @Builder.Default
    private Boolean moodPromptRequired = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
