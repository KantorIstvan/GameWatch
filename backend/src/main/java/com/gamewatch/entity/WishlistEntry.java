package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A game one user wants to play, found the same way a game is added to the library - by
 * searching the catalog - but kept separate from {@link UserGame}: wanting to play something
 * is not the same claim as having it in your library, and the two need independent gating
 * ({@link User#getWishlistVisibility()} vs {@link User#getLibraryVisibility()}).
 */
@Entity
@Table(name = "wishlist_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishlistEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @CreationTimestamp
    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;
}
