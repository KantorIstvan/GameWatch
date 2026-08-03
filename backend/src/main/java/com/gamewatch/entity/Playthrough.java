package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "playthroughs")
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Playthrough {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "playthrough_type", nullable = false, length = 50)
    @Builder.Default
    private String playthroughType = "story";

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "platform", length = 100)
    private String platform;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "stopped_at")
    private Instant stoppedAt;

    @Column(name = "duration_seconds")
    @Builder.Default
    private Long durationSeconds = 0L;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "is_completed")
    @Builder.Default
    private Boolean isCompleted = false;

    @Column(name = "is_dropped")
    @Builder.Default
    private Boolean isDropped = false;

    @Column(name = "is_paused")
    @Builder.Default
    private Boolean isPaused = false;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "session_count")
    @Builder.Default
    private Integer sessionCount = 0;

    @Column(name = "pause_count")
    @Builder.Default
    private Integer pauseCount = 0;

    @Column(name = "last_played_at")
    private Instant lastPlayedAt;

    @Column(name = "dropped_at")
    private Instant droppedAt;

    @Column(name = "picked_up_at")
    private Instant pickedUpAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_from_playthrough_id")
    private Playthrough importedFromPlaythrough;

    @Column(name = "imported_duration_seconds")
    @Builder.Default
    private Long importedDurationSeconds = 0L;

    @Column(name = "session_start_duration_seconds")
    @Builder.Default
    private Long sessionStartDurationSeconds = 0L;

    @Column(name = "session_start_time")
    private Instant sessionStartTime;

    @Column(name = "manual_time_set")
    @Builder.Default
    private Boolean manualTimeSet = false;

    @Column(name = "dominant_color_1", length = 7)
    private String dominantColor1;

    @Column(name = "dominant_color_2", length = 7)
    private String dominantColor2;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * The playtime this playthrough contributes to any aggregate total.
     *
     * A playthrough that absorbed another one's timer value via a one-time import has that
     * chunk inside its own durationSeconds, while the source playthrough still reports the
     * same time under its own record - so the imported part is deducted here to keep it
     * from being counted twice.
     *
     * The deduction is conditional on the source still existing. It used to be
     * unconditional, which meant deleting the source made those hours disappear from every
     * total in the app: the source no longer contributed them, and the target went on
     * subtracting them from a duration that was now the only remaining record of them.
     */
    public long effectivePlaytimeSeconds() {
        long duration = durationSeconds != null ? durationSeconds : 0L;

        // A lazy association is a proxy reference; testing it for null reads the foreign
        // key that is already loaded and does not fetch the source row.
        if (importedFromPlaythrough == null) {
            return Math.max(0L, duration);
        }

        long imported = importedDurationSeconds != null ? importedDurationSeconds : 0L;
        return Math.max(0L, duration - imported);
    }
}
