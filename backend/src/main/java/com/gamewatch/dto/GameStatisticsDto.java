package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameStatisticsDto {
    private Long gameId;
    private String gameName;
    private String gameBannerImageUrl;
    private LocalDate gameAddedDate;
    
    private Long totalPlayTimeSeconds;
    private Integer totalSessions;
    private Long averageSessionTimeSeconds;
    private Long longestSessionSeconds;
    private Integer replaysCount;
    private LocalDate firstStartedDate;
    private LocalDate lastPlayedDate;
    private Long longestCompletionSeconds;
    private Long shortestCompletionSeconds;
    
    private List<SessionDetail> sessions;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionDetail {
        private Long sessionId;
        private Long playthroughId;
        private Integer sessionNumber;
        private Instant sessionDate;
        private String playthroughTitle;
        private Long sessionTimeSeconds;
        private Integer pauseCount;
        private Instant startedAt;
        private Instant endedAt;
    }
}
