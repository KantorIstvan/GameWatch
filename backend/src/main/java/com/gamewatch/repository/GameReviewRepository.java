package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameReviewRepository extends JpaRepository<GameReview, Long> {

    Optional<GameReview> findByUserAndGame(User user, Game game);

    /**
     * {@code JOIN FETCH r.user} on both of these: every review's author fields (handle,
     * display name, picture) get read while building the response, and a lazy {@code user}
     * association would otherwise re-query per distinct author - one page of reviews turning
     * into one review query plus one query per author instead of two queries total.
     */
    @Query("SELECT r FROM GameReview r JOIN FETCH r.user WHERE r.game.id = :gameId "
        + "ORDER BY r.helpfulCount DESC, r.createdAt DESC")
    List<GameReview> findMostHelpful(@Param("gameId") Long gameId);

    @Query("SELECT r FROM GameReview r JOIN FETCH r.user WHERE r.game.id = :gameId ORDER BY r.createdAt DESC")
    List<GameReview> findMostRecent(@Param("gameId") Long gameId);

    /**
     * One user's own reviews, newest first, capped by the pageable's size.
     *
     * The profile page's "Recent Reviews" tile - what this person has written, not what
     * was written about a single game, which is why this filters by author rather than
     * {@link #findMostRecent}'s per-game scope. {@code JOIN FETCH r.game} for the same
     * reason the sibling queries fetch the author: the game's name and banner get read
     * per row, and a lazy association would otherwise cost one query per review.
     */
    @Query("SELECT r FROM GameReview r JOIN FETCH r.game WHERE r.user.id = :userId ORDER BY r.createdAt DESC")
    List<GameReview> findMostRecentByUser(@Param("userId") Long userId, Pageable pageable);

    /**
     * Every review one user has written, keyed by game once the caller groups it - the
     * "did they also write something" half of the Ratings tab, fetched in one query rather
     * than one {@link #findByUserAndGame} per rated game.
     */
    @Query("SELECT r FROM GameReview r WHERE r.user.id = :userId")
    List<GameReview> findByUserId(@Param("userId") Long userId);

    /**
     * How many reviews this user has written since a cutoff. A person writing thirty
     * reviews in a minute is not reviewing, and this is the cheapest place to notice.
     */
    @Query("SELECT COUNT(r) FROM GameReview r WHERE r.user.id = :userId AND r.createdAt >= :since")
    long countWrittenSince(@Param("userId") Long userId, @Param("since") Instant since);
}
