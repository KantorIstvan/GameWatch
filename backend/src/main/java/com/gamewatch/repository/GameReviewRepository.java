package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.User;
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

    @Query("SELECT r FROM GameReview r WHERE r.game.id = :gameId "
        + "ORDER BY r.helpfulCount DESC, r.createdAt DESC")
    List<GameReview> findMostHelpful(@Param("gameId") Long gameId);

    @Query("SELECT r FROM GameReview r WHERE r.game.id = :gameId ORDER BY r.createdAt DESC")
    List<GameReview> findMostRecent(@Param("gameId") Long gameId);

    /**
     * How many reviews this user has written since a cutoff. A person writing thirty
     * reviews in a minute is not reviewing, and this is the cheapest place to notice.
     */
    @Query("SELECT COUNT(r) FROM GameReview r WHERE r.user.id = :userId AND r.createdAt >= :since")
    long countWrittenSince(@Param("userId") Long userId, @Param("since") Instant since);
}
