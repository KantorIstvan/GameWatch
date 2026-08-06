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

    private ConsistencyStats consistencyStats;
    private BacklogStats backlogStats;
    private TrendStats trendStats;

    /**
     * Direction and shape of play rather than its volume: whether this period is up or down
     * on the last one, when in the week it happens, how concentrated it is on a few games,
     * and what tends to happen to the games that get abandoned.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendStats {
        /** Null for the all-time view, which has no preceding period to compare against. */
        private Long previousPeriodPlaytimeSeconds;
        /** Null when the previous period was empty, where a percentage change is undefined. */
        private Double playtimeChangePercentage;

        private Long weekdayPlaytimeSeconds;
        private Long weekendPlaytimeSeconds;
        /** Average seconds played per weekend day against per weekday, or null with no data. */
        private Double weekendIntensityRatio;

        private Double topThreeSharePercentage;
        /** 0 = all time in one game, 100 = time spread perfectly evenly across the library. */
        private Double varietyScore;

        private Integer playthroughsDropped;
        private Integer playthroughsCompleted;
        private Double dropRatePercentage;
        private Long medianSecondsBeforeDropping;
    }

    /**
     * The state of the library as a whole, rather than of the selected period.
     *
     * These deliberately ignore the period picker: a backlog is a fact about right now, and
     * "you have 41 unplayed games" does not become a different number because the chart
     * above is showing March.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BacklogStats {
        private Integer gamesInLibrary;
        private Integer gamesStarted;
        private Integer gamesPastFirstHour;
        private Integer gamesFinished;
        private Integer gamesNeverStarted;
        /** Median days between adding a game and first playing it; null with no data. */
        private Long medianShelfTimeDays;
        /** Added against finished over the same recent window, so the two are comparable. */
        private Integer gamesAddedRecently;
        private Integer gamesFinishedRecently;
        private Integer backlogWindowMonths;
        private List<GameRankingDto> stalePlaythroughs;
    }

    /**
     * How regularly the period was played, and how long a typical session runs.
     *
     * Medians sit alongside the existing mean deliberately: a single all-night session
     * drags an average far enough to stop describing anyone's normal evening, and this page
     * previously reported only means.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsistencyStats {
        /** Null when the period does not contain today, where "current" has no meaning. */
        private Integer currentStreakDays;
        private Integer longestStreakDays;
        private Integer daysPlayed;
        private Integer daysInPeriod;
        private Double consistencyPercentage;
        private Integer longestGapDays;
        private Long medianSessionSeconds;
        private Long percentile90SessionSeconds;
        private Double sessionsPerActiveDay;
    }


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
        /**
         * Trailing seven-day mean, so the daily bars can carry a trend line. Daily play is
         * spiky enough that the bars alone show very little about direction.
         */
        private Double rollingAverageSeconds;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GameRankingDto {
        private Long gameId;
        /** IGDB's id - the catalog's address for this game, for linking out to it. */
        private Integer externalId;
        private String gameName;
        private String bannerImageUrl;
        private Long playtimeSeconds;
        private Long daysToComplete;
        /** Only populated for stale playthroughs, where it is the point of the entry. */
        private Long daysSinceLastPlayed;
        private LocalDate startDate;
        private LocalDate endDate;
        // Other categories (most playtime, most sessions, longest session, longest
        // average session) this game also leads in, besides the main criterion
        // (most replays) that made it the favorite. See UserStatisticsService#findFavoriteGame.
        private List<String> badges;
    }
}
