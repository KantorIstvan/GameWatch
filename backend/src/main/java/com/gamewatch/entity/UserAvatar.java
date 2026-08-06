package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * An uploaded profile picture, addressed by an unguessable key rather than by user id.
 *
 * Deliberately not a column on {@link User}: that entity is second-level cached and read on
 * nearly every request, and the image bytes have no business travelling with it.
 */
@Entity
@Table(name = "user_avatars")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAvatar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /**
     * Random per upload, and rotated whenever the picture changes.
     *
     * Unguessable because the endpoint serving it cannot require a token - an img tag has
     * nowhere to put one - so the key is what stands between "reachable" and "enumerable".
     * Rotation is also what lets the response be cached indefinitely: a changed picture is
     * a different URL, so nothing has to be invalidated.
     */
    @Column(name = "avatar_key", nullable = false, unique = true, length = 36)
    private String avatarKey;

    /** Derived from the bytes themselves, never from what the client claimed to send. */
    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    // Plain byte[] rather than @Lob: on PostgreSQL, @Lob maps to a large-object OID column,
    // which would not match the BYTEA the migration creates and fails ddl-auto validation.
    @Column(name = "image_data", nullable = false, columnDefinition = "BYTEA")
    private byte[] imageData;

    @Column(name = "byte_size", nullable = false)
    private Integer byteSize;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
