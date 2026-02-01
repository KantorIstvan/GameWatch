package com.gamewatch.repository;

import com.gamewatch.entity.MoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MoodEntryRepository extends JpaRepository<MoodEntry, Long> {
    
    List<MoodEntry> findByUserIdOrderByRecordedAtDesc(Long userId);
    
    List<MoodEntry> findByUserIdAndRecordedAtBetweenOrderByRecordedAtDesc(
        Long userId, Instant startDate, Instant endDate);
    
    Optional<MoodEntry> findBySessionHistoryId(Long sessionHistoryId);
    
    @Query("SELECT AVG(m.moodRating) FROM MoodEntry m WHERE m.user.id = :userId " +
           "AND m.recordedAt BETWEEN :startDate AND :endDate")
    Double calculateAverageMood(@Param("userId") Long userId, 
                                @Param("startDate") Instant startDate, 
                                @Param("endDate") Instant endDate);
    
    List<MoodEntry> findByUserId(Long userId);
}
