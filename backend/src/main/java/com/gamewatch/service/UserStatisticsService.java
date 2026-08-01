package com.gamewatch.service;

import com.gamewatch.dto.GameRecommendationDto;
import com.gamewatch.dto.GameSearchResultDto;
import com.gamewatch.dto.UserStatisticsDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserGameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserStatisticsService {

    private final PlaythroughRepository playthroughRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final UserGameRepository userGameRepository;
    private final RawgApiService rawgApiService;

    @Transactional(readOnly = true)
    public UserStatisticsDto getUserStatistics(User user, String interval, String date) {
        DateRange range = getDateRange(user, interval, date);

        List<Playthrough> allPlaythroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        int totalGamesInLibrary = userGameRepository.findGamesByUser(user).size();

        // Bounded ranges query sessions directly by date so a playthrough that spans
        // multiple periods (e.g. still ongoing, lastPlayedAt long after this week) still
        // surfaces the sessions it actually has inside this narrower window.
        List<SessionHistory> sessions = range.start().equals(Instant.EPOCH)
            ? fetchAllSessions(allPlaythroughs)
            : sessionHistoryRepository.findSessionsByUserAndDateRange(user.getId(), range.start(), range.end());

        List<Playthrough> playthroughs = filterPlaythroughsByInterval(allPlaythroughs, sessions, range);

        if (playthroughs.isEmpty()) {
            return createEmptyStatistics();
        }

        List<UserStatisticsDto.DailyPlaytime> dailyPlaytimeData = calculateDailyPlaytime(sessions, range);

        return UserStatisticsDto.builder()
            .totalPlaytimeSeconds(calculateTotalPlaytimeForRange(playthroughs, sessions, range))
            .averageSessionPlaytimeSeconds(calculateAverageSessionPlaytime(sessions))
            .gamesCompleted(countCompletedGames(playthroughs))
            .gamesInProgress(countInProgressGames(playthroughs))
            .longestSessionSeconds(findLongestSession(sessions))
            .totalSessionCount(sessions.size())
            .totalGamesCount(totalGamesInLibrary)
            .timeOfDayStats(calculateTimeOfDayStats(sessions))
            .dailyPlaytime(dailyPlaytimeData)
            .genreDistribution(calculateGenreDistribution(playthroughs))
            .platformDistribution(calculatePlatformDistribution(playthroughs))
            .favoriteGame(findFavoriteGame(playthroughs, sessions))
            .longestToCompleteGame(findLongestToCompleteGame(playthroughs))
            .fastestToCompleteGame(findFastestToCompleteGame(playthroughs))
            .topMostPlayedGames(findTopMostPlayedGames(playthroughs, 5))
            .dayOfWeekPlaytime(calculateDayOfWeekAveragePlaytime(sessions))
            .dayOfWeekTotalPlaytime(calculateDayOfWeekTotalPlaytime(sessions))
            .libraryCompletionPercentage(calculateLibraryCompletion(allPlaythroughs, totalGamesInLibrary))
            .favoriteDeveloper(findFavoriteDeveloper(playthroughs))
            .favoritePublisher(findFavoritePublisher(playthroughs))
            .build();
    }

    /**
     * A calendar-bound period [start, end], both inclusive-at-the-second. `date` anchors
     * which week/month/year to use (e.g. a date in February selects the whole of
     * February), defaulting to today when absent — so passing no date reproduces the
     * previous "current period" behavior exactly.
     */
    private record DateRange(Instant start, Instant end) {
    }

    private DateRange getDateRange(User user, String interval, String date) {
        LocalDate referenceDate;
        try {
            referenceDate = (date != null && !date.isBlank()) ? LocalDate.parse(date) : LocalDate.now();
        } catch (DateTimeParseException e) {
            referenceDate = LocalDate.now();
        }

        return switch (interval.toLowerCase()) {
            case "week" -> {
                // Get first day of week based on user preference
                String firstDayOfWeek = user.getFirstDayOfWeek() != null ? user.getFirstDayOfWeek() : "MONDAY";
                java.time.DayOfWeek startDay = firstDayOfWeek.equals("SUNDAY")
                    ? java.time.DayOfWeek.SUNDAY
                    : java.time.DayOfWeek.MONDAY;
                LocalDate weekStart = referenceDate.with(startDay);
                // If the reference date is before the start day, go back a week
                if (weekStart.isAfter(referenceDate)) {
                    weekStart = weekStart.minusWeeks(1);
                }
                LocalDate weekEnd = weekStart.plusDays(6);
                yield new DateRange(
                    weekStart.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                    weekEnd.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant()
                );
            }
            case "month" -> {
                LocalDate firstOfMonth = referenceDate.withDayOfMonth(1);
                LocalDate lastOfMonth = referenceDate.withDayOfMonth(referenceDate.lengthOfMonth());
                yield new DateRange(
                    firstOfMonth.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                    lastOfMonth.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant()
                );
            }
            case "year" -> {
                LocalDate firstOfYear = referenceDate.withDayOfYear(1);
                LocalDate lastOfYear = referenceDate.withDayOfYear(referenceDate.lengthOfYear());
                yield new DateRange(
                    firstOfYear.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                    lastOfYear.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant()
                );
            }
            default -> new DateRange(Instant.EPOCH, Instant.now());
        };
    }

    private List<SessionHistory> fetchAllSessions(List<Playthrough> playthroughs) {
        if (playthroughs.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> playthroughIds = playthroughs.stream().map(Playthrough::getId).collect(Collectors.toList());
        return sessionHistoryRepository.findByPlaythroughIdsOrderByPlaythroughAndSession(playthroughIds);
    }

    /**
     * A playthrough is in-scope for a period if it has a session inside the window
     * (covers ongoing playthroughs that also have activity outside it) OR its
     * lastPlayedAt falls inside the window (covers manually-logged time with no
     * discrete session rows).
     */
    private List<Playthrough> filterPlaythroughsByInterval(
            List<Playthrough> playthroughs, List<SessionHistory> sessionsInRange, DateRange range) {
        if (range.start().equals(Instant.EPOCH)) {
            return playthroughs;
        }

        Set<Long> playthroughIdsWithSessionInRange = sessionsInRange.stream()
            .map(s -> s.getPlaythrough().getId())
            .collect(Collectors.toSet());

        return playthroughs.stream()
            .filter(p -> playthroughIdsWithSessionInRange.contains(p.getId())
                || (p.getLastPlayedAt() != null
                    && p.getLastPlayedAt().isAfter(range.start())
                    && p.getLastPlayedAt().isBefore(range.end())))
            .collect(Collectors.toList());
    }

    private Long calculateTotalPlaytime(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .mapToLong(this::effectivePlaytimeSeconds)
            .sum();
    }

    /**
     * A playthrough that absorbed another one via "import" already had that chunk
     * counted once through the source playthrough's own record, so aggregate totals
     * must exclude it here (same approach as GameService's per-game totals) —
     * otherwise the imported hours are counted twice: once via the source, once via
     * the target that absorbed it.
     */
    private long effectivePlaytimeSeconds(Playthrough playthrough) {
        long duration = playthrough.getDurationSeconds() != null ? playthrough.getDurationSeconds() : 0L;
        long imported = playthrough.getImportedDurationSeconds() != null ? playthrough.getImportedDurationSeconds() : 0L;
        return Math.max(0L, duration - imported);
    }

    /**
     * For a bounded period, a playthrough's full lifetime durationSeconds overcounts
     * if it also has activity outside the window (e.g. an ongoing playthrough touched
     * again after this week). Sum actual session time inside the window instead, and
     * fall back to durationSeconds only for playthroughs with no session rows at all
     * (pure manually-logged time, which carries no per-session timestamps).
     */
    private Long calculateTotalPlaytimeForRange(List<Playthrough> playthroughs, List<SessionHistory> sessionsInRange, DateRange range) {
        if (range.start().equals(Instant.EPOCH)) {
            return calculateTotalPlaytime(playthroughs);
        }

        long sessionTotal = sessionsInRange.stream()
            .mapToLong(SessionHistory::getDurationSeconds)
            .sum();

        Set<Long> playthroughIdsWithSessionInRange = sessionsInRange.stream()
            .map(s -> s.getPlaythrough().getId())
            .collect(Collectors.toSet());

        long manualOnlyTotal = playthroughs.stream()
            .filter(p -> !playthroughIdsWithSessionInRange.contains(p.getId()))
            .mapToLong(this::effectivePlaytimeSeconds)
            .sum();

        return sessionTotal + manualOnlyTotal;
    }

    private Double calculateAverageSessionPlaytime(List<SessionHistory> sessions) {
        if (sessions.isEmpty()) {
            return 0.0;
        }
        
        return sessions.stream()
            .mapToLong(SessionHistory::getDurationSeconds)
            .average()
            .orElse(0.0);
    }

    private Integer countCompletedGames(List<Playthrough> playthroughs) {
        return (int) playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .map(p -> p.getGame().getId())
            .distinct()
            .count();
    }

    private Integer countInProgressGames(List<Playthrough> playthroughs) {
        return (int) playthroughs.stream()
            .filter(p -> !Boolean.TRUE.equals(p.getIsCompleted()) && p.getDurationSeconds() > 0)
            .map(p -> p.getGame().getId())
            .distinct()
            .count();
    }

    private Long findLongestSession(List<SessionHistory> sessions) {
        return sessions.stream()
            .mapToLong(SessionHistory::getDurationSeconds)
            .max()
            .orElse(0L);
    }

    private Integer countUniqueGames(List<Playthrough> playthroughs) {
        return (int) playthroughs.stream()
            .map(p -> p.getGame().getId())
            .distinct()
            .count();
    }

    private UserStatisticsDto.TimeOfDayStats calculateTimeOfDayStats(List<SessionHistory> sessions) {
        Map<String, Long> timeOfDayMap = new HashMap<>();
        timeOfDayMap.put("dawn", 0L);
        timeOfDayMap.put("morning", 0L);
        timeOfDayMap.put("noon", 0L);
        timeOfDayMap.put("afternoon", 0L);
        timeOfDayMap.put("evening", 0L);
        timeOfDayMap.put("night", 0L);
        
        Map<Integer, Long> hourlyDistribution = new HashMap<>();
        for (int i = 0; i < 24; i++) {
            hourlyDistribution.put(i, 0L);
        }
        
        for (SessionHistory session : sessions) {
            Instant start = session.getStartedAt();
            Instant end = session.getEndedAt();
            long totalSeconds = session.getDurationSeconds();
            
            LocalDateTime startTime = LocalDateTime.ofInstant(start, ZoneId.systemDefault());
            LocalDateTime endTime = LocalDateTime.ofInstant(end, ZoneId.systemDefault());
            
            if (startTime.getHour() == endTime.getHour() && 
                startTime.getDayOfYear() == endTime.getDayOfYear() &&
                startTime.getYear() == endTime.getYear()) {
                int hour = startTime.getHour();
                hourlyDistribution.merge(hour, totalSeconds, Long::sum);
                addToTimeOfDay(timeOfDayMap, hour, totalSeconds);
            } else {
                LocalDateTime current = startTime;
                while (current.isBefore(endTime)) {
                    LocalDateTime nextHour = current.plusHours(1).withMinute(0).withSecond(0).withNano(0);
                    if (nextHour.isAfter(endTime)) {
                        nextHour = endTime;
                    }
                    
                    long secondsInThisHour = ChronoUnit.SECONDS.between(current, nextHour);
                    int hour = current.getHour();
                    
                    hourlyDistribution.merge(hour, secondsInThisHour, Long::sum);
                    addToTimeOfDay(timeOfDayMap, hour, secondsInThisHour);
                    
                    current = nextHour;
                }
            }
        }
        
        return UserStatisticsDto.TimeOfDayStats.builder()
            .dawnSeconds(timeOfDayMap.get("dawn"))
            .morningSeconds(timeOfDayMap.get("morning"))
            .noonSeconds(timeOfDayMap.get("noon"))
            .afternoonSeconds(timeOfDayMap.get("afternoon"))
            .eveningSeconds(timeOfDayMap.get("evening"))
            .nightSeconds(timeOfDayMap.get("night"))
            .hourlyDistribution(hourlyDistribution)
            .build();
    }

    private void addToTimeOfDay(Map<String, Long> map, int hour, long seconds) {
        if (hour >= 4 && hour < 7) {
            map.merge("dawn", seconds, Long::sum);
        } else if (hour >= 7 && hour < 12) {
            map.merge("morning", seconds, Long::sum);
        } else if (hour == 12) {
            map.merge("noon", seconds, Long::sum);
        } else if (hour >= 13 && hour < 18) {
            map.merge("afternoon", seconds, Long::sum);
        } else if (hour >= 18 && hour < 22) {
            map.merge("evening", seconds, Long::sum);
        } else {
            map.merge("night", seconds, Long::sum);
        }
    }

    private List<UserStatisticsDto.DailyPlaytime> calculateDailyPlaytime(List<SessionHistory> sessions, DateRange range) {
        Map<LocalDate, Long> dailyMap = new HashMap<>();

        for (SessionHistory session : sessions) {
            LocalDate date = LocalDateTime.ofInstant(session.getStartedAt(), ZoneId.systemDefault()).toLocalDate();
            dailyMap.merge(date, session.getDurationSeconds(), Long::sum);
        }

        LocalDate startDate = range.start().equals(Instant.EPOCH)
            ? sessions.stream()
                .map(s -> LocalDateTime.ofInstant(s.getStartedAt(), ZoneId.systemDefault()).toLocalDate())
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now())
            : LocalDateTime.ofInstant(range.start(), ZoneId.systemDefault()).toLocalDate();

        // Cap at today: for the current period this stops the list at "now" (old
        // behavior); for a past period, range.end() is already before today.
        LocalDate rangeEndDate = LocalDateTime.ofInstant(range.end(), ZoneId.systemDefault()).toLocalDate();
        LocalDate endDate = rangeEndDate.isBefore(LocalDate.now()) ? rangeEndDate : LocalDate.now();

        List<UserStatisticsDto.DailyPlaytime> result = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            result.add(UserStatisticsDto.DailyPlaytime.builder()
                .date(current)
                .playtimeSeconds(dailyMap.getOrDefault(current, 0L))
                .build());
            current = current.plusDays(1);
        }
        
        return result;
    }

    private Map<String, Long> calculateGenreDistribution(List<Playthrough> playthroughs) {
        Map<String, Long> genreMap = new HashMap<>();
        
        for (Playthrough playthrough : playthroughs) {
            Game game = playthrough.getGame();
            if (game.getGenres() != null && !game.getGenres().isEmpty()) {
                String[] genres = game.getGenres().split(",");
                long playtime = effectivePlaytimeSeconds(playthrough);
                
                for (String genre : genres) {
                    String cleanGenre = genre.trim();
                    if (!cleanGenre.isEmpty()) {
                        genreMap.merge(cleanGenre, playtime, Long::sum);
                    }
                }
            }
        }
        
        return genreMap;
    }

    private Map<String, Long> calculatePlatformDistribution(List<Playthrough> playthroughs) {
        Map<String, Long> platformMap = new HashMap<>();
        
        for (Playthrough playthrough : playthroughs) {
            String platform = playthrough.getPlatform();
            if (platform != null && !platform.isEmpty()) {
                long playtime = effectivePlaytimeSeconds(playthrough);
                platformMap.merge(platform, playtime, Long::sum);
            }
        }
        
        return platformMap;
    }

    /**
     * Total playtime is the single deciding criterion for "Favorite Game" — the other
     * four candidate criteria (most replays, most sessions, longest session, longest
     * average session) rarely land on the same game, so rather than picking among them
     * they're surfaced as badges on the winning game whenever it also happens to lead
     * in one of them.
     */
    private UserStatisticsDto.GameRankingDto findFavoriteGame(List<Playthrough> playthroughs, List<SessionHistory> sessions) {
        Map<Long, GameFavoriteAggregation> statsByGame = new HashMap<>();

        for (Playthrough playthrough : playthroughs) {
            Long gameId = playthrough.getGame().getId();
            statsByGame.computeIfAbsent(gameId, id -> new GameFavoriteAggregation(playthrough.getGame()))
                .addPlaythrough(effectivePlaytimeSeconds(playthrough));
        }

        for (SessionHistory session : sessions) {
            Long gameId = session.getPlaythrough().getGame().getId();
            GameFavoriteAggregation stats = statsByGame.get(gameId);
            if (stats != null) {
                stats.addSession(session.getDurationSeconds());
            }
        }

        GameFavoriteAggregation favorite = statsByGame.values().stream()
            .max(Comparator.comparing(GameFavoriteAggregation::getTotalPlaytime)
                .thenComparing(GameFavoriteAggregation::getPlaythroughCount))
            .orElse(null);

        if (favorite == null) {
            return null;
        }

        List<String> badges = new ArrayList<>();
        Long favoriteGameId = favorite.getGame().getId();

        if (favorite.getPlaythroughCount() > 1 && favoriteGameId.equals(
                statsByGame.values().stream().max(Comparator.comparing(GameFavoriteAggregation::getPlaythroughCount))
                    .map(s -> s.getGame().getId()).orElse(null))) {
            badges.add("mostReplays");
        }
        if (favorite.getSessionCount() > 0 && favoriteGameId.equals(
                statsByGame.values().stream().max(Comparator.comparing(GameFavoriteAggregation::getSessionCount))
                    .map(s -> s.getGame().getId()).orElse(null))) {
            badges.add("mostSessions");
        }
        if (favorite.getLongestSessionSeconds() > 0 && favoriteGameId.equals(
                statsByGame.values().stream().max(Comparator.comparing(GameFavoriteAggregation::getLongestSessionSeconds))
                    .map(s -> s.getGame().getId()).orElse(null))) {
            badges.add("longestSession");
        }
        if (favorite.getSessionCount() > 0 && favoriteGameId.equals(
                statsByGame.values().stream().filter(s -> s.getSessionCount() > 0)
                    .max(Comparator.comparing(GameFavoriteAggregation::getAverageSessionSeconds))
                    .map(s -> s.getGame().getId()).orElse(null))) {
            badges.add("longestAverageSession");
        }

        return UserStatisticsDto.GameRankingDto.builder()
            .gameId(favorite.getGame().getId())
            .gameName(favorite.getGame().getName())
            .bannerImageUrl(favorite.getGame().getBannerImageUrl())
            .playtimeSeconds(favorite.getTotalPlaytime())
            .badges(badges)
            .build();
    }

    private UserStatisticsDto.GameRankingDto findLongestToCompleteGame(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()) && p.getStartDate() != null && p.getEndDate() != null)
            .max(Comparator.comparing(p -> ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate())))
            .map(p -> UserStatisticsDto.GameRankingDto.builder()
                .gameId(p.getGame().getId())
                .gameName(p.getGame().getName())
                .bannerImageUrl(p.getGame().getBannerImageUrl())
                .playtimeSeconds(p.getDurationSeconds())
                .daysToComplete(ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate()))
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .build())
            .orElse(null);
    }

    private UserStatisticsDto.GameRankingDto findFastestToCompleteGame(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()) && p.getStartDate() != null && p.getEndDate() != null)
            .min(Comparator.comparing(p -> ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate())))
            .map(p -> UserStatisticsDto.GameRankingDto.builder()
                .gameId(p.getGame().getId())
                .gameName(p.getGame().getName())
                .bannerImageUrl(p.getGame().getBannerImageUrl())
                .playtimeSeconds(p.getDurationSeconds())
                .daysToComplete(ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate()))
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .build())
            .orElse(null);
    }

    private List<UserStatisticsDto.GameRankingDto> findTopMostPlayedGames(List<Playthrough> playthroughs, int limit) {
        Map<Long, GamePlaytimeAggregation> gamePlaytimeMap = aggregatePlaytimeByGame(playthroughs);
        
        return gamePlaytimeMap.values().stream()
            .sorted(Comparator.comparing(GamePlaytimeAggregation::getTotalPlaytime).reversed())
            .limit(limit)
            .map(this::toGameRankingDto)
            .collect(Collectors.toList());
    }

    private List<UserStatisticsDto.GameRankingDto> findTopLeastPlayedGames(List<Playthrough> playthroughs, int limit) {
        Map<Long, GamePlaytimeAggregation> gamePlaytimeMap = aggregatePlaytimeByGame(playthroughs);
        
        return gamePlaytimeMap.values().stream()
            .filter(agg -> agg.getTotalPlaytime() > 0)
            .sorted(Comparator.comparing(GamePlaytimeAggregation::getTotalPlaytime))
            .limit(limit)
            .map(this::toGameRankingDto)
            .collect(Collectors.toList());
    }

    private Map<Long, GamePlaytimeAggregation> aggregatePlaytimeByGame(List<Playthrough> playthroughs) {
        Map<Long, GamePlaytimeAggregation> gameMap = new HashMap<>();
        
        for (Playthrough playthrough : playthroughs) {
            Long gameId = playthrough.getGame().getId();
            long playtime = effectivePlaytimeSeconds(playthrough);

            gameMap.computeIfAbsent(gameId, id -> new GamePlaytimeAggregation(playthrough.getGame()))
                .addPlaythrough(playtime);
        }
        
        return gameMap;
    }

    private UserStatisticsDto.GameRankingDto toGameRankingDto(GamePlaytimeAggregation agg) {
        return UserStatisticsDto.GameRankingDto.builder()
            .gameId(agg.getGame().getId())
            .gameName(agg.getGame().getName())
            .bannerImageUrl(agg.getGame().getBannerImageUrl())
            .playtimeSeconds(agg.getTotalPlaytime())
            .build();
    }

    private Map<String, Double> calculateDayOfWeekAveragePlaytime(List<SessionHistory> sessions) {
        Map<String, Long> totalPlaytimeByDay = calculateDayOfWeekTotalPlaytime(sessions);
        Map<String, Integer> countByDay = new HashMap<>();
        
        for (SessionHistory session : sessions) {
            String dayName = LocalDateTime.ofInstant(session.getStartedAt(), ZoneId.systemDefault())
                .getDayOfWeek().toString();
            countByDay.merge(dayName, 1, Integer::sum);
        }
        
        Map<String, Double> averagePlaytime = new HashMap<>();
        for (Map.Entry<String, Long> entry : totalPlaytimeByDay.entrySet()) {
            String day = entry.getKey();
            int count = countByDay.getOrDefault(day, 1);
            averagePlaytime.put(day, (double) entry.getValue() / count);
        }
        
        return averagePlaytime;
    }
    
    private Map<String, Long> calculateDayOfWeekTotalPlaytime(List<SessionHistory> sessions) {
        Map<String, Long> playtimeByDay = new HashMap<>();
        
        for (DayOfWeek day : DayOfWeek.values()) {
            playtimeByDay.put(day.toString(), 0L);
        }
        
        for (SessionHistory session : sessions) {
            DayOfWeek dayOfWeek = LocalDateTime.ofInstant(session.getStartedAt(), ZoneId.systemDefault())
                .getDayOfWeek();
            playtimeByDay.merge(dayOfWeek.toString(), session.getDurationSeconds(), Long::sum);
        }
        
        return playtimeByDay;
    }
    
    private Double calculateLibraryCompletion(List<Playthrough> allPlaythroughs, int totalGamesInLibrary) {
        if (totalGamesInLibrary == 0) {
            return 0.0;
        }
        
        long completedGames = allPlaythroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .map(p -> p.getGame().getId())
            .distinct()
            .count();
        
        return (double) completedGames / totalGamesInLibrary * 100.0;
    }
    
    private String findFavoriteDeveloper(List<Playthrough> playthroughs) {
        Map<String, DeveloperPublisherStats> developerStats = new HashMap<>();
        
        for (Playthrough playthrough : playthroughs) {
            Game game = playthrough.getGame();
            if (game.getDevelopers() != null && !game.getDevelopers().isEmpty()) {
                String[] developers = game.getDevelopers().split(",");
                
                for (String developer : developers) {
                    String cleanDeveloper = developer.trim();
                    if (!cleanDeveloper.isEmpty()) {
                        DeveloperPublisherStats stats = developerStats.computeIfAbsent(
                            cleanDeveloper, 
                            k -> new DeveloperPublisherStats()
                        );
                        stats.gameIds.add(game.getId());
                        stats.totalPlaytime += effectivePlaytimeSeconds(playthrough);
                    }
                }
            }
        }
        
        return developerStats.entrySet().stream()
            .max(Comparator.comparing((Map.Entry<String, DeveloperPublisherStats> entry) -> entry.getValue().gameIds.size())
                .thenComparing(entry -> entry.getValue().totalPlaytime))
            .map(Map.Entry::getKey)
            .orElse(null);
    }
    
    private String findFavoritePublisher(List<Playthrough> playthroughs) {
        Map<String, DeveloperPublisherStats> publisherStats = new HashMap<>();
        
        for (Playthrough playthrough : playthroughs) {
            Game game = playthrough.getGame();
            if (game.getPublishers() != null && !game.getPublishers().isEmpty()) {
                String[] publishers = game.getPublishers().split(",");
                
                for (String publisher : publishers) {
                    String cleanPublisher = publisher.trim();
                    if (!cleanPublisher.isEmpty()) {
                        DeveloperPublisherStats stats = publisherStats.computeIfAbsent(
                            cleanPublisher, 
                            k -> new DeveloperPublisherStats()
                        );
                        stats.gameIds.add(game.getId());
                        stats.totalPlaytime += effectivePlaytimeSeconds(playthrough);
                    }
                }
            }
        }
        
        return publisherStats.entrySet().stream()
            .max(Comparator.comparing((Map.Entry<String, DeveloperPublisherStats> entry) -> entry.getValue().gameIds.size())
                .thenComparing(entry -> entry.getValue().totalPlaytime))
            .map(Map.Entry::getKey)
            .orElse(null);
    }

    private UserStatisticsDto createEmptyStatistics() {
        return UserStatisticsDto.builder()
            .totalPlaytimeSeconds(0L)
            .averageSessionPlaytimeSeconds(0.0)
            .gamesCompleted(0)
            .gamesInProgress(0)
            .longestSessionSeconds(0L)
            .totalSessionCount(0)
            .totalGamesCount(0)
            .timeOfDayStats(UserStatisticsDto.TimeOfDayStats.builder()
                .dawnSeconds(0L)
                .morningSeconds(0L)
                .noonSeconds(0L)
                .afternoonSeconds(0L)
                .eveningSeconds(0L)
                .nightSeconds(0L)
                .hourlyDistribution(new HashMap<>())
                .build())
            .dailyPlaytime(new ArrayList<>())
            .genreDistribution(new HashMap<>())
            .platformDistribution(new HashMap<>())
            .favoriteGame(null)
            .longestToCompleteGame(null)
            .fastestToCompleteGame(null)
            .topMostPlayedGames(new ArrayList<>())
            .dayOfWeekPlaytime(new HashMap<>())
            .dayOfWeekTotalPlaytime(new HashMap<>())
            .libraryCompletionPercentage(0.0)
            .favoriteDeveloper(null)
            .favoritePublisher(null)
            .build();
    }

    private static class GamePlaytimeAggregation {
        private final Game game;
        private long totalPlaytime;
        private int playthroughCount;

        public GamePlaytimeAggregation(Game game) {
            this.game = game;
            this.totalPlaytime = 0;
            this.playthroughCount = 0;
        }

        public void addPlaythrough(long seconds) {
            this.totalPlaytime += seconds;
            this.playthroughCount++;
        }

        public Game getGame() {
            return game;
        }

        public long getTotalPlaytime() {
            return totalPlaytime;
        }

        public int getPlaythroughCount() {
            return playthroughCount;
        }
    }

    private static class GameFavoriteAggregation {
        private final Game game;
        private long totalPlaytime;
        private int playthroughCount;
        private int sessionCount;
        private long longestSessionSeconds;
        private long totalSessionSeconds;

        public GameFavoriteAggregation(Game game) {
            this.game = game;
        }

        public void addPlaythrough(long seconds) {
            this.totalPlaytime += seconds;
            this.playthroughCount++;
        }

        public void addSession(long seconds) {
            this.sessionCount++;
            this.totalSessionSeconds += seconds;
            this.longestSessionSeconds = Math.max(this.longestSessionSeconds, seconds);
        }

        public Game getGame() {
            return game;
        }

        public long getTotalPlaytime() {
            return totalPlaytime;
        }

        public int getPlaythroughCount() {
            return playthroughCount;
        }

        public int getSessionCount() {
            return sessionCount;
        }

        public long getLongestSessionSeconds() {
            return longestSessionSeconds;
        }

        public double getAverageSessionSeconds() {
            return sessionCount == 0 ? 0.0 : (double) totalSessionSeconds / sessionCount;
        }
    }

    private static class DeveloperPublisherStats {
        private final Set<Long> gameIds = new HashSet<>();
        private long totalPlaytime = 0L;
    }

    @Transactional(readOnly = true)
    public List<GameRecommendationDto> getGameRecommendations(User user, int limit) {
        List<Playthrough> playthroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        
        if (playthroughs.isEmpty()) {
            return new ArrayList<>();
        }

        Map<Long, GamePlaytimeAggregation> gamePlaytimeMap = aggregatePlaytimeByGame(playthroughs);
        List<Game> top5MostPlayedGames = gamePlaytimeMap.values().stream()
            .sorted(Comparator.comparing(GamePlaytimeAggregation::getTotalPlaytime).reversed())
            .limit(5)
            .map(GamePlaytimeAggregation::getGame)
            .collect(Collectors.toList());
        
        if (top5MostPlayedGames.isEmpty()) {
            return new ArrayList<>();
        }
        
        log.info("Generating recommendations based on top 5 most played games");
        long startTime = System.currentTimeMillis();
        
        List<Integer> externalIds = top5MostPlayedGames.stream()
                .map(Game::getExternalId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        
        if (externalIds.isEmpty()) {
            log.warn("No external RAWG IDs found for top games");
            return new ArrayList<>();
        }
        
        log.info("Fetching RAWG details for {} games in parallel", externalIds.size());
        List<com.fasterxml.jackson.databind.JsonNode> topGamesRawgData = 
                rawgApiService.getMultipleGameDetailsRaw(externalIds);
        
        if (topGamesRawgData.isEmpty()) {
            log.warn("No RAWG data found for top games");
            return new ArrayList<>();
        }
        
        log.info("Fetched {} game details in {}ms", topGamesRawgData.size(), 
                System.currentTimeMillis() - startTime);
        
        Map<Integer, Integer> genreIdWeights = new HashMap<>();
        Map<Integer, Integer> tagIdWeights = new HashMap<>();
        Map<Integer, Integer> developerIdWeights = new HashMap<>();
        Map<Integer, Integer> publisherIdWeights = new HashMap<>();
        Map<String, Integer> developerNameWeights = new HashMap<>();
        Map<String, Integer> publisherNameWeights = new HashMap<>();
        Map<String, Integer> platformWeights = new HashMap<>();
        
        for (com.fasterxml.jackson.databind.JsonNode gameData : topGamesRawgData) {
            String gameName = gameData.has("name") ? gameData.get("name").asText() : "Unknown";
            log.info("Extracting features from: {}", gameName);
            
            List<Integer> genreIds = rawgApiService.extractGenreIdsFromDetails(gameData);
            for (Integer genreId : genreIds) {
                genreIdWeights.put(genreId, genreIdWeights.getOrDefault(genreId, 0) + 1);
            }
            
            List<Integer> tagIds = rawgApiService.extractTagIdsFromDetails(gameData, 15);
            for (Integer tagId : tagIds) {
                tagIdWeights.put(tagId, tagIdWeights.getOrDefault(tagId, 0) + 1);
            }
            
            List<Integer> devIds = rawgApiService.extractDeveloperIdsFromDetails(gameData);
            for (Integer devId : devIds) {
                developerIdWeights.put(devId, developerIdWeights.getOrDefault(devId, 0) + 1);
            }
            
            if (gameData.has("developers")) {
                for (com.fasterxml.jackson.databind.JsonNode dev : gameData.get("developers")) {
                    String devName = dev.get("name").asText();
                    developerNameWeights.put(devName, developerNameWeights.getOrDefault(devName, 0) + 1);
                }
            }
            
            List<Integer> pubIds = rawgApiService.extractPublisherIdsFromDetails(gameData);
            for (Integer pubId : pubIds) {
                publisherIdWeights.put(pubId, publisherIdWeights.getOrDefault(pubId, 0) + 1);
            }
            
            if (gameData.has("publishers")) {
                for (com.fasterxml.jackson.databind.JsonNode pub : gameData.get("publishers")) {
                    String pubName = pub.get("name").asText();
                    publisherNameWeights.put(pubName, publisherNameWeights.getOrDefault(pubName, 0) + 1);
                }
            }
            
            if (gameData.has("platforms")) {
                for (com.fasterxml.jackson.databind.JsonNode platformNode : gameData.get("platforms")) {
                    if (platformNode.has("platform") && platformNode.get("platform").has("name")) {
                        String platform = platformNode.get("platform").get("name").asText();
                        platformWeights.put(platform, platformWeights.getOrDefault(platform, 0) + 1);
                    }
                }
            }
        }
        
        log.info("Feature weights - Developers: {} (IDs: {}), Publishers: {} (IDs: {}), Genres: {}, Tags: {}", 
            developerNameWeights.size(), developerIdWeights.size(),
            publisherNameWeights.size(), publisherIdWeights.size(),
            genreIdWeights.size(), tagIdWeights.size());
        
        Set<Integer> excludedExternalIds = playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()) || 
                        (p.getDurationSeconds() != null && p.getDurationSeconds() > 0))
            .map(p -> p.getGame().getExternalId())
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        
        log.info("Excluding {} games that are completed or started", excludedExternalIds.size());

        Map<Integer, GameSearchResultDto> candidateGamesMap = new HashMap<>();
        
        try {
            long candidateStartTime = System.currentTimeMillis();
            
            List<Integer> topDeveloperIds = getTopN(developerIdWeights, 3);
            log.info("Searching for games by top developer IDs: {}", topDeveloperIds);
            
            for (Integer developerId : topDeveloperIds) {
                List<GameSearchResultDto> devGames = rawgApiService.searchGamesByDeveloperId(developerId, 20);
                log.info("Found {} games from developer ID {}", devGames.size(), developerId);
                for (GameSearchResultDto game : devGames) {
                    if (!excludedExternalIds.contains(game.getId())) {
                        candidateGamesMap.putIfAbsent(game.getId(), game);
                    }
                }
            }
            
            List<Integer> topPublisherIds = getTopN(publisherIdWeights, 3);
            log.info("Searching for games by top publisher IDs: {}", topPublisherIds);
            
            for (Integer publisherId : topPublisherIds) {
                List<GameSearchResultDto> pubGames = rawgApiService.searchGamesByPublisherId(publisherId, 20);
                log.info("Found {} games from publisher ID {}", pubGames.size(), publisherId);
                for (GameSearchResultDto game : pubGames) {
                    if (!excludedExternalIds.contains(game.getId())) {
                        candidateGamesMap.putIfAbsent(game.getId(), game);
                    }
                }
            }
            
            log.info("Found {} dev/publisher games. Target: {} for strong recommendations.",
                    candidateGamesMap.size(), limit * 3);
            
            if (candidateGamesMap.size() < limit * 2) {
                log.info("Only {} dev/pub matches, supplementing with genre/tag matches", candidateGamesMap.size());
                
                List<Integer> topGenreIds = getTopN(genreIdWeights, 2);
                List<Integer> topTagIds = getTopN(tagIdWeights, 2);
                
                List<GameSearchResultDto> genreGames = topGenreIds.isEmpty() ? 
                        new ArrayList<>() : 
                        rawgApiService.searchGamesByMultipleGenres(topGenreIds, 10);
                
                List<GameSearchResultDto> tagGames = topTagIds.isEmpty() ? 
                        new ArrayList<>() : 
                        rawgApiService.searchGamesByMultipleTags(topTagIds, 10);
                
                for (GameSearchResultDto game : genreGames) {
                    if (!excludedExternalIds.contains(game.getId())) {
                        candidateGamesMap.putIfAbsent(game.getId(), game);
                    }
                }
                
                for (GameSearchResultDto game : tagGames) {
                    if (!excludedExternalIds.contains(game.getId())) {
                        candidateGamesMap.putIfAbsent(game.getId(), game);
                    }
                }
            }
            
            log.info("Found {} total candidate games in {}ms", candidateGamesMap.size(),
                    System.currentTimeMillis() - candidateStartTime);
            
        } catch (Exception e) {
            log.error("Failed to fetch candidate games from RAWG API", e);
            return new ArrayList<>();
        }
        
        Map<String, Integer> genreNameWeights = new HashMap<>();
        Map<String, Integer> tagNameWeights = new HashMap<>();
        
        for (com.fasterxml.jackson.databind.JsonNode gameData : topGamesRawgData) {
            if (gameData.has("genres")) {
                for (com.fasterxml.jackson.databind.JsonNode genre : gameData.get("genres")) {
                    Integer id = genre.get("id").asInt();
                    String name = genre.get("name").asText();
                    if (genreIdWeights.containsKey(id)) {
                        genreNameWeights.put(name, genreIdWeights.get(id));
                    }
                }
            }
            if (gameData.has("tags")) {
                for (com.fasterxml.jackson.databind.JsonNode tag : gameData.get("tags")) {
                    Integer id = tag.get("id").asInt();
                    String name = tag.get("name").asText();
                    if (tagIdWeights.containsKey(id)) {
                        tagNameWeights.put(name, tagIdWeights.get(id));
                    }
                }
            }
        }
        
        List<ScoredGame> scoredGames = new ArrayList<>();
        
        for (GameSearchResultDto candidate : candidateGamesMap.values()) {
            if (candidate.getRating() == null || candidate.getRating() < 3.0) {
                continue;
            }
            
            double score = 0.0;
            List<String> matchingGenres = new ArrayList<>();
            List<String> matchingTags = new ArrayList<>();
            List<String> matchingDevelopers = new ArrayList<>();
            List<String> matchingPublishers = new ArrayList<>();
            
            if (candidate.getDevelopers() != null) {
                for (String developer : candidate.getDevelopers().split(",")) {
                    String cleanDev = developer.trim();
                    if (developerNameWeights.containsKey(cleanDev)) {
                        score += developerNameWeights.get(cleanDev) * 50.0;
                        matchingDevelopers.add(cleanDev);
                    }
                }
            }
            
            if (candidate.getPublishers() != null) {
                for (String publisher : candidate.getPublishers().split(",")) {
                    String cleanPub = publisher.trim();
                    if (publisherNameWeights.containsKey(cleanPub)) {
                        score += publisherNameWeights.get(cleanPub) * 30.0;
                        matchingPublishers.add(cleanPub);
                    }
                }
            }
            
            if (candidate.getGenres() != null) {
                for (String genre : candidate.getGenres().split(",")) {
                    String cleanGenre = genre.trim();
                    if (genreNameWeights.containsKey(cleanGenre)) {
                        score += genreNameWeights.get(cleanGenre) * 3.0;
                        matchingGenres.add(cleanGenre);
                    }
                }
            }
            
            if (candidate.getTags() != null) {
                for (String tag : candidate.getTags().split(",")) {
                    String cleanTag = tag.trim();
                    if (tagNameWeights.containsKey(cleanTag)) {
                        score += tagNameWeights.get(cleanTag) * 2.0;
                        matchingTags.add(cleanTag);
                    }
                }
            }
            
            if (candidate.getPlatforms() != null) {
                for (String platform : candidate.getPlatforms().split(",")) {
                    String cleanPlat = platform.trim();
                    if (platformWeights.containsKey(cleanPlat)) {
                        score += platformWeights.get(cleanPlat) * 1.0;
                    }
                }
            }
            
            score += candidate.getRating() * 5.0;
            
            if (candidate.getRatingsCount() != null && candidate.getRatingsCount() > 0) {
                score += Math.log10(candidate.getRatingsCount() + 1) * 1.0;
            }
            
            boolean hasDeveloperMatch = !matchingDevelopers.isEmpty() || !matchingPublishers.isEmpty();
            boolean hasFeatureMatch = (!matchingGenres.isEmpty() && !matchingTags.isEmpty());
            
            if (score > 0 && (hasDeveloperMatch || hasFeatureMatch)) {
                List<String> platforms = new ArrayList<>();
                if (candidate.getPlatforms() != null && !candidate.getPlatforms().isEmpty()) {
                    platforms = Arrays.asList(candidate.getPlatforms().split(","))
                        .stream()
                        .map(String::trim)
                        .collect(Collectors.toList());
                }
                
                scoredGames.add(new ScoredGame(
                    candidate,
                    score,
                    matchingGenres,
                    matchingTags,
                    matchingDevelopers,
                    matchingPublishers,
                    platforms
                ));
            }
        }
        
        log.info("Scored {} games with feature overlaps", scoredGames.size());
        
        List<GameRecommendationDto> recommendations = scoredGames.stream()
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(limit)
            .map(sg -> GameRecommendationDto.builder()
                .externalId(String.valueOf(sg.game.getId()))
                .name(sg.game.getName())
                .bannerImageUrl(sg.game.getBannerImageUrl())
                .platforms(sg.platforms)
                .similarityScore(sg.score)
                .matchingGenres(sg.matchingGenres)
                .matchingTags(sg.matchingTags)
                .matchingDevelopers(sg.matchingDevelopers)
                .matchingPublishers(sg.matchingPublishers)
                .build())
            .collect(Collectors.toList());
        
        long totalTime = System.currentTimeMillis() - startTime;
        log.info("Generated {} recommendations in {}ms", recommendations.size(), totalTime);
        return recommendations;
    }
    
    private <T> List<T> getTopN(Map<T, Integer> weightMap, int n) {
        return weightMap.entrySet().stream()
            .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
            .limit(n)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
    
    private static class ScoredGame {
        final GameSearchResultDto game;
        final double score;
        final List<String> matchingGenres;
        final List<String> matchingTags;
        final List<String> matchingDevelopers;
        final List<String> matchingPublishers;
        final List<String> platforms;
        
        ScoredGame(GameSearchResultDto game, double score, List<String> matchingGenres,
                  List<String> matchingTags, List<String> matchingDevelopers,
                  List<String> matchingPublishers, List<String> platforms) {
            this.game = game;
            this.score = score;
            this.matchingGenres = matchingGenres;
            this.matchingTags = matchingTags;
            this.matchingDevelopers = matchingDevelopers;
            this.matchingPublishers = matchingPublishers;
            this.platforms = platforms;
        }
    }
}
