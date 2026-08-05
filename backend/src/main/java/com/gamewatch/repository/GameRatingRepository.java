package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameRating;
import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameRatingRepository extends JpaRepository<GameRating, Long> {

    Optional<GameRating> findByUserAndGame(User user, Game game);

    /** [score, count] pairs, for the distribution histogram shown beside the average. */
    @Query("SELECT r.score, COUNT(r) FROM GameRating r WHERE r.game.id = :gameId GROUP BY r.score")
    List<Object[]> findScoreDistribution(@Param("gameId") Long gameId);

    /**
     * [score, count] pairs for the ratings one user has personally given, for the
     * IMDb/Letterboxd-style histogram on their own profile. The per-game distribution above
     * is what everyone thinks of a game; this is what this one person thinks across every
     * game they have rated.
     */
    @Query("SELECT r.score, COUNT(r) FROM GameRating r WHERE r.user.id = :userId GROUP BY r.score")
    List<Object[]> findScoreDistributionByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(r), COALESCE(SUM(r.score), 0) FROM GameRating r WHERE r.game.id = :gameId")
    List<Object[]> findCountAndSum(@Param("gameId") Long gameId);

    /**
     * Mean score across every rated game, weighting each game equally rather than each
     * rating. This is the prior a game with few ratings is pulled towards, so it has to
     * represent "a typical game" - weighting by rating count would make it "a typical
     * rating", which is dominated by whatever happens to be popular.
     */
    @Query("SELECT AVG(g.ratingSum * 1.0 / g.ratingCount) FROM Game g WHERE g.ratingCount > 0")
    Double findGlobalMeanScore();

    /**
     * Ratings from users who have actually recorded time on the game, which is the claim
     * behind the "verified playtime" figure shown next to the overall one.
     */
    @Query("SELECT r.score FROM GameRating r WHERE r.game.id = :gameId AND EXISTS ("
        + "SELECT 1 FROM Playthrough p WHERE p.user.id = r.user.id AND p.game.id = r.game.id "
        + "AND p.durationSeconds >= :minimumSeconds)")
    List<Integer> findScoresWithRecordedPlaytime(@Param("gameId") Long gameId,
                                                 @Param("minimumSeconds") long minimumSeconds);

    @Query("SELECT r.score FROM GameRating r WHERE r.game.id = :gameId AND EXISTS ("
        + "SELECT 1 FROM Playthrough p WHERE p.user.id = r.user.id AND p.game.id = r.game.id "
        + "AND p.isCompleted = true)")
    List<Integer> findScoresFromFinishers(@Param("gameId") Long gameId);
}
