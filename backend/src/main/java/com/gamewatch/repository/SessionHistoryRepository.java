package com.gamewatch.repository;

import com.gamewatch.entity.SessionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface SessionHistoryRepository extends JpaRepository<SessionHistory, Long> {

    List<SessionHistory> findByPlaythroughIdOrderBySessionNumberAsc(Long playthroughId);

    Optional<SessionHistory> findByIdAndPlaythroughUserId(Long id, Long userId);
    
    @Query("SELECT sh FROM SessionHistory sh WHERE sh.playthrough.id IN :playthroughIds ORDER BY sh.playthrough.id, sh.sessionNumber")
    List<SessionHistory> findByPlaythroughIdsOrderByPlaythroughAndSession(@Param("playthroughIds") List<Long> playthroughIds);

    /**
     * Which of the given playthroughs have at least one session row, at any date.
     * Period statistics need this to tell "has no sessions in this window" (its sessions
     * are simply elsewhere in time) apart from "has no session rows at all" (its playtime
     * exists only as a total, with no timestamps to place it by).
     */
    @Query("SELECT DISTINCT sh.playthrough.id FROM SessionHistory sh WHERE sh.playthrough.id IN :playthroughIds")
    Set<Long> findPlaythroughIdsWithAnySession(@Param("playthroughIds") List<Long> playthroughIds);
    
    /**
     * Sessions that <em>started</em> inside the range.
     *
     * The bounds deliberately test startedAt alone. Testing for overlap instead
     * (endedAt >= start AND startedAt < end) returns a session that runs across midnight
     * for both of the days it touches, and since callers then sum whole session durations,
     * a 23:00-01:00 session was counted in full on both days. Attributing each session
     * wholly to the day it began keeps every session counted exactly once, and matches how
     * the statistics page has always bucketed its daily chart.
     */
    @Query("SELECT sh FROM SessionHistory sh WHERE sh.playthrough.user.id = :userId " +
           "AND sh.startedAt >= :startDate AND sh.startedAt < :endDate " +
           "ORDER BY sh.endedAt DESC")
    List<SessionHistory> findSessionsStartedByUserBetween(@Param("userId") Long userId,
                                                          @Param("startDate") Instant startDate,
                                                          @Param("endDate") Instant endDate);
    
    List<SessionHistory> findByPlaythroughIdIn(List<Long> playthroughIds);
}
