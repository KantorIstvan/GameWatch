package com.gamewatch.repository;

import com.gamewatch.entity.DailyHealthMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyHealthMetricsRepository extends JpaRepository<DailyHealthMetrics, Long> {
    
    Optional<DailyHealthMetrics> findByUserIdAndMetricDate(Long userId, LocalDate metricDate);
    
    List<DailyHealthMetrics> findByUserIdAndMetricDateBetweenOrderByMetricDateDesc(
        Long userId, LocalDate startDate, LocalDate endDate);
    
    List<DailyHealthMetrics> findByUserIdOrderByMetricDateDesc(Long userId);
    
    @Query("SELECT dhm FROM DailyHealthMetrics dhm WHERE dhm.user.id = :userId " +
           "AND dhm.metricDate >= :startDate ORDER BY dhm.metricDate DESC")
    List<DailyHealthMetrics> findRecentMetrics(@Param("userId") Long userId, 
                                               @Param("startDate") LocalDate startDate);
    
    @Query("SELECT AVG(dhm.healthScore) FROM DailyHealthMetrics dhm WHERE dhm.user.id = :userId " +
           "AND dhm.metricDate BETWEEN :startDate AND :endDate AND dhm.healthScore IS NOT NULL")
    Double calculateAverageHealthScore(@Param("userId") Long userId, 
                                       @Param("startDate") LocalDate startDate, 
                                       @Param("endDate") LocalDate endDate);
}
