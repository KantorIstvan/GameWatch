package com.gamewatch.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyHealthMetricsDto {
    private Long id;
    private LocalDate metricDate;
    private Integer healthScore; // 0-100
    private Double totalHours;
    private Integer sessionCount;
    private Double averageMood; // 1-5
    private Long lateNightMinutes;
    private Double breakComplianceRatio; // 0.0 - 1.0
    private Integer sessionsWithBreaks;
    private Integer morningSessions;
    private Integer afternoonSessions;
    private Integer eveningSessions;
    private Integer nightSessions;
    private Integer lateNightSessions;
}
