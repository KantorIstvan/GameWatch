package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_health_metrics", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "metric_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyHealthMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "metric_date", nullable = false)
    private LocalDate metricDate;

    @Column(name = "health_score")
    private Integer healthScore; // 0-100

    @Column(name = "total_hours")
    private Double totalHours;

    @Column(name = "session_count")
    @Builder.Default
    private Integer sessionCount = 0;

    @Column(name = "average_mood")
    private Double averageMood; // 1-5

    @Column(name = "late_night_minutes")
    @Builder.Default
    private Long lateNightMinutes = 0L;

    @Column(name = "break_compliance_ratio")
    private Double breakComplianceRatio; // 0.0 - 1.0

    @Column(name = "sessions_with_breaks")
    @Builder.Default
    private Integer sessionsWithBreaks = 0;

    @Column(name = "morning_sessions")
    @Builder.Default
    private Integer morningSessions = 0;

    @Column(name = "afternoon_sessions")
    @Builder.Default
    private Integer afternoonSessions = 0;

    @Column(name = "evening_sessions")
    @Builder.Default
    private Integer eveningSessions = 0;

    @Column(name = "night_sessions")
    @Builder.Default
    private Integer nightSessions = 0;

    @Column(name = "late_night_sessions")
    @Builder.Default
    private Integer lateNightSessions = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
