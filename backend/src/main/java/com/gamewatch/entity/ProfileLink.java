package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * One link a user has chosen to show on their public profile - a social account, a
 * personal site, whatever they want people to find. Kept as its own entity rather than a
 * column on {@link User}, the same way {@link WishlistEntry} is kept separate from the
 * library: a profile can carry several of these, and the set needs to be replaced and
 * reordered as a whole rather than edited one field at a time.
 *
 * Stores only the URL - which platform it is gets worked out client-side from the host,
 * not persisted, so the detection rules can change without a migration.
 */
@Entity
@Table(name = "profile_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String url;

    /** Display order on the profile, lowest first. */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
