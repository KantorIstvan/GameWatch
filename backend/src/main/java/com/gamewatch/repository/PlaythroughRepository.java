package com.gamewatch.repository;

import com.gamewatch.entity.Playthrough;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PlaythroughRepository extends JpaRepository<Playthrough, Long> {
    List<Playthrough> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Query("SELECT p FROM Playthrough p WHERE p.user.id = :userId AND p.game.id = :gameId ORDER BY p.createdAt DESC")
    List<Playthrough> findByUserIdAndGameIdOrderByCreatedAtDesc(
        @Param("userId") Long userId, 
        @Param("gameId") Long gameId);
    
    @Query("SELECT p FROM Playthrough p WHERE p.user.id = :userId AND p.game.id IN :gameIds ORDER BY p.game.id, p.createdAt DESC")
    List<Playthrough> findByUserIdAndGameIdIn(
        @Param("userId") Long userId, 
        @Param("gameIds") List<Long> gameIds);
    
    Optional<Playthrough> findByIdAndUserId(Long id, Long userId);
    List<Playthrough> findByUserIdAndIsActiveTrue(Long userId);

    /** Playthroughs that absorbed this one's timer value via a one-time import. */
    List<Playthrough> findByImportedFromPlaythroughId(Long importedFromPlaythroughId);

    /** Every playthrough of a game, across all users, for community aggregates. */
    @Query("SELECT p FROM Playthrough p WHERE p.game.id = :gameId")
    List<Playthrough> findAllByGameId(@Param("gameId") Long gameId);

    /**
     * One game's playthroughs from a set of users in one query, for callers (e.g. the
     * review list) that need "this author's playtime/completion on this game" for many
     * authors at once instead of one {@link #findByUserIdAndGameIdOrderByCreatedAtDesc}
     * round trip per author.
     */
    @Query("SELECT p FROM Playthrough p WHERE p.game.id = :gameId AND p.user.id IN :userIds")
    List<Playthrough> findByGameIdAndUserIdIn(@Param("gameId") Long gameId,
                                              @Param("userIds") Collection<Long> userIds);
}
