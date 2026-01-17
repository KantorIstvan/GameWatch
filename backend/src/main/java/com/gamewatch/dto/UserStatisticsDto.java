package com.gamewatch.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatisticsDto {
    
    private Long totalPlaytimeSeconds;
    private Double averageSessionPlaytimeSeconds;
    private Integer gamesCompleted;
    private Integer gamesInProgress;
    private Long longestSessionSeconds;
    private Integer totalSessionCount;
    private Integer totalGamesCount;
    
    private TimeOfDayStats timeOfDayStats;
    
    private List<DailyPlaytime> dailyPlaytime;
    
    private Map<String, Long> genreDistribution;
    
    private Map<String, Long> platformDistribution;
    
    private GameRankingDto favoriteGame;
    private GameRankingDto longestToCompleteGame;
    private GameRankingDto fastestToCompleteGame;
    private List<GameRankingDto> topMostPlayedGames;
    
    private Map<String, Double> dayOfWeekPlaytime; 
    private Map<String, Long> dayOfWeekTotalPlaytime; 
    private Double libraryCompletionPercentage;
    private String favoriteDeveloper;
    private String favoritePublisher;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeOfDayStats {
        private Long dawnSeconds;      // 4:00 - 6:59
        private Long morningSeconds;   // 7:00 - 11:59
        private Long noonSeconds;      // 12:00 - 12:59
        private Long afternoonSeconds; // 13:00 - 17:59
        private Long eveningSeconds;   // 18:00 - 21:59
        private Long nightSeconds;     // 22:00 - 3:59
        private Map<Integer, Long> hourlyDistribution;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPlaytime {
        private LocalDate date;
        private Long playtimeSeconds;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GameRankingDto {
        private Long gameId;
        private String gameName;
        private String bannerImageUrl;
        private Long playtimeSeconds;
        private Long daysToComplete;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
