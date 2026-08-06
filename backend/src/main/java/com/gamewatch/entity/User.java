package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auth0_user_id", nullable = false, unique = true)
    private String auth0UserId;

    @Column
    private String email;

    /**
     * Copied from the Auth0 nickname claim: not chosen, not unique, not editable.
     * {@link #handle} is the addressable identity; this stays for existing display paths.
     */
    @Column(length = 100)
    private String username;

    /** Unique, case-insensitively, and chosen by the user. Null until they claim one. */
    @Column(length = 30)
    private String handle;

    @Column(name = "display_name", length = 50)
    private String displayName;

    @Column(length = 300)
    private String bio;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_visibility", nullable = false, length = 20)
    @Builder.Default
    private Visibility profileVisibility = Visibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "library_visibility", nullable = false, length = 20)
    @Builder.Default
    private Visibility libraryVisibility = Visibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "wishlist_visibility", nullable = false, length = 20)
    @Builder.Default
    private Visibility wishlistVisibility = Visibility.PRIVATE;

    @Column(name = "profile_picture_url", length = 500)
    private String profilePictureUrl;

    @Column(name = "age")
    private Integer age;

    @Column(length = 100)
    private String timezone;

    @Column(name = "first_day_of_week", length = 10)
    @Builder.Default
    private String firstDayOfWeek = "MONDAY";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
