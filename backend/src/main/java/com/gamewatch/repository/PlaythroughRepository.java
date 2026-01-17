package com.gamewatch.repository;

import com.gamewatch.entity.Playthrough;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
