package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.User;
import com.gamewatch.entity.WishlistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistEntryRepository extends JpaRepository<WishlistEntry, Long> {

    Optional<WishlistEntry> findByUserAndGame(User user, Game game);

    boolean existsByUserAndGame(User user, Game game);

    /**
     * One user's wishlist with the game eagerly fetched, so rendering the list does not pay
     * for one query per row. {@link WishlistEntry#getGame()} is a lazy association and every
     * row reads several of its fields, which without this fetch is a select per entry - the
     * same N+1 the ratings list was given
     * {@link GameRatingRepository#findByUserIdWithGameOrderByScoreDesc} to avoid.
     */
    @Query("SELECT w FROM WishlistEntry w JOIN FETCH w.game WHERE w.user = :user "
        + "ORDER BY w.addedAt DESC")
    List<WishlistEntry> findByUserWithGameOrderByAddedAtDesc(@Param("user") User user);
}
