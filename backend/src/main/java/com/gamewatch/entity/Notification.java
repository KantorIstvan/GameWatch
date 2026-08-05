package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Something that happened to one user, waiting to be seen.
 *
 * Carries references rather than a written-out message: the wording lives in the frontend's
 * translation files, so an old notification still reads in whatever language is chosen today,
 * and a copy edit never has to be backfilled across rows.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /** Null for anything the system raised on its own rather than a person doing something. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id")
    private GameReview review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follow_id")
    private Follow follow;

    /**
     * When the recipient saw it; null while unread.
     *
     * A timestamp rather than a flag because "when did you see this" is what anything later -
     * a digest, a do-not-disturb window - would have to ask, and it costs the same to store.
     */
    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public enum NotificationType {
        /** Someone asked to follow a followers-only profile, and is waiting on an answer. */
        FOLLOW_REQUEST,
        /** A request the recipient sent was accepted. */
        FOLLOW_ACCEPTED,
        /** Someone followed a public profile, which needed no permission. */
        NEW_FOLLOWER,
        /** Someone answered the recipient's review. */
        REVIEW_REPLY,
        /** Someone marked the recipient's review helpful. */
        REVIEW_HELPFUL
    }
}
