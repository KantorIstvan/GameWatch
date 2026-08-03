package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** A time-boxed goal a group competes on. */
@Entity
@Table(name = "group_challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ChallengeMetric metric;

    @Column
    private Integer target;

    @Column(name = "starts_on", nullable = false)
    private LocalDate startsOn;

    @Column(name = "ends_on", nullable = false)
    private LocalDate endsOn;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * What a challenge can be scored on.
     *
     * There is no hours-played metric, and that is the point. The health feature exists to
     * discourage long unbroken sessions and late-night play; ranking people by time spent
     * would pay them to do exactly what the rest of the app asks them not to. Each of these
     * counts finishing, breadth or regularity, so competing hard means playing more
     * deliberately rather than simply more.
     */
    public enum ChallengeMetric {
        /** Playthroughs completed inside the window. */
        GAMES_FINISHED,
        /** Distinct games touched - rewards breadth, not depth. */
        DISTINCT_GAMES_PLAYED,
        /** Days with any play at all - rewards showing up, not marathons. */
        DAYS_PLAYED,
        /** Games finished that were already in the library before the window opened. */
        BACKLOG_CLEARED
    }
}
