package com.gamewatch.repository;

import com.gamewatch.entity.SessionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionHistoryRepository extends JpaRepository<SessionHistory, Long> {

    List<SessionHistory> findByPlaythroughIdOrderBySessionNumberAsc(Long playthroughId);

    Optional<SessionHistory> findByIdAndPlaythroughUserId(Long id, Long userId);
    
    @Query("SELECT sh FROM SessionHistory sh WHERE sh.playthrough.id IN :playthroughIds ORDER BY sh.playthrough.id, sh.sessionNumber")
    List<SessionHistory> findByPlaythroughIdsOrderByPlaythroughAndSession(@Param("playthroughIds") List<Long> playthroughIds);
    
    @Query("SELECT sh FROM SessionHistory sh WHERE sh.playthrough.user.id = :userId " +
           "AND sh.endedAt >= :startDate AND sh.startedAt < :endDate " +
           "ORDER BY sh.endedAt DESC")
    List<SessionHistory> findSessionsByUserAndDateRange(@Param("userId") Long userId,
                                                         @Param("startDate") Instant startDate,
                                                         @Param("endDate") Instant endDate);
    
    List<SessionHistory> findByPlaythroughIdIn(List<Long> playthroughIds);
}
