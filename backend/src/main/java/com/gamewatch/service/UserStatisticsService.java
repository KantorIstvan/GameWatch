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
import com.gamewatch.util.TimezoneUtils;
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
        ZoneId zone = TimezoneUtils.resolveZone(user);
        DateRange range = getDateRange(user, zone, interval, date);

        List<Playthrough> allPlaythroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        int totalGamesInLibrary = userGameRepository.findGamesByUser(user).size();

        // Bounded ranges query sessions directly by date so a playthrough that spans
        // multiple periods (e.g. still ongoing, lastPlayedAt long after this week) still
        // surfaces the sessions it actually has inside this narrower window.
        List<SessionHistory> sessions = range.start().equals(Instant.EPOCH)
            ? fetchAllSessions(allPlaythroughs)
            : sessionHistoryRepository.findSessionsStartedByUserBetween(user.getId(), range.start(), range.end());

        Set<Long> playthroughIdsWithAnySession = findPlaythroughIdsWithAnySession(allPlaythroughs);

        List<Playthrough> playthroughs =
            filterPlaythroughsByInterval(allPlaythroughs, sessions, playthroughIdsWithAnySession, range);

        if (playthroughs.isEmpty()) {
            return createEmptyStatistics();
        }

        DaySpan span = resolveDaySpan(sessions, range, zone);
        List<UserStatisticsDto.DailyPlaytime> dailyPlaytimeData = calculateDailyPlaytime(sessions, span, zone);

        return UserStatisticsDto.builder()
            .totalPlaytimeSeconds(calculateTotalPlaytimeForRange(playthroughs, sessions, playthroughIdsWithAnySession, range))
            .averageSessionPlaytimeSeconds(calculateAverageSessionPlaytime(sessions))
            .gamesCompleted(countCompletedGames(playthroughs))
            .gamesInProgress(countInProgressGames(playthroughs))
            .longestSessionSeconds(findLongestSession(sessions))
            .totalSessionCount(sessions.size())
            .totalGamesCount(totalGamesInLibrary)
            .timeOfDayStats(calculateTimeOfDayStats(sessions, zone))
            .dailyPlaytime(dailyPlaytimeData)
            .genreDistribution(calculateGenreDistribution(playthroughs))
            .platformDistribution(calculatePlatformDistribution(playthroughs))
            .favoriteGame(findFavoriteGame(playthroughs, sessions))
            .longestToCompleteGame(findLongestToCompleteGame(playthroughs))
            .fastestToCompleteGame(findFastestToCompleteGame(playthroughs))
            .topMostPlayedGames(findTopMostPlayedGames(playthroughs, 5))
            .dayOfWeekPlaytime(calculateDayOfWeekAveragePlaytime(sessions, span, zone))
            .dayOfWeekTotalPlaytime(calculateDayOfWeekTotalPlaytime(sessions, zone))
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

    private DateRange getDateRange(User user, ZoneId zone, String interval, String date) {
        LocalDate referenceDate;
        try {
            referenceDate = (date != null && !date.isBlank()) ? LocalDate.parse(date) : LocalDate.now(zone);
        } catch (DateTimeParseException e) {
            referenceDate = LocalDate.now(zone);
        }

        return switch (interval.toLowerCase()) {
            case "week" -> {
                LocalDate weekStart = TimezoneUtils.startOfWeek(user, referenceDate);
                LocalDate weekEnd = weekStart.plusDays(6);
                yield new DateRange(
                    weekStart.atStartOfDay(zone).toInstant(),
                    weekEnd.atTime(LocalTime.MAX).atZone(zone).toInstant()
                );
            }
            case "month" -> {
                LocalDate firstOfMonth = referenceDate.withDayOfMonth(1);
                LocalDate lastOfMonth = referenceDate.withDayOfMonth(referenceDate.lengthOfMonth());
                yield new DateRange(
                    firstOfMonth.atStartOfDay(zone).toInstant(),
                    lastOfMonth.atTime(LocalTime.MAX).atZone(zone).toInstant()
                );
            }
            case "year" -> {
                LocalDate firstOfYear = referenceDate.withDayOfYear(1);
                LocalDate lastOfYear = referenceDate.withDayOfYear(referenceDate.lengthOfYear());
                yield new DateRange(
                    firstOfYear.atStartOfDay(zone).toInstant(),
                    lastOfYear.atTime(LocalTime.MAX).atZone(zone).toInstant()
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

    private Set<Long> findPlaythroughIdsWithAnySession(List<Playthrough> playthroughs) {
        if (playthroughs.isEmpty()) {
            return Set.of();
        }
        List<Long> ids = playthroughs.stream().map(Playthrough::getId).collect(Collectors.toList());
        return sessionHistoryRepository.findPlaythroughIdsWithAnySession(ids);
    }

    /**
     * A playthrough is in-scope for a period if it has a session inside the window, or if
     * it has no session rows at all and its lastPlayedAt falls inside the window.
     *
     * That second clause used to read "has no session in *this window*", which is a much
     * weaker condition and the source of a large overcount: any playthrough touched during
     * the period — pausing one is enough, since pause moves lastPlayedAt — was pulled in
     * even when all of its sessions sat in other periods, and then had its entire lifetime
     * playtime counted against this one. Restricting it to playthroughs with no session
     * rows anywhere keeps the fallback doing only the job it was meant for: legacy rows and
     * time that only ever existed as a hand-edited total, neither of which carries
     * timestamps that could place it more precisely.
     */
    private List<Playthrough> filterPlaythroughsByInterval(
            List<Playthrough> playthroughs, List<SessionHistory> sessionsInRange,
            Set<Long> playthroughIdsWithAnySession, DateRange range) {
        if (range.start().equals(Instant.EPOCH)) {
            return playthroughs;
        }

        Set<Long> playthroughIdsWithSessionInRange = sessionsInRange.stream()
            .map(s -> s.getPlaythrough().getId())
            .collect(Collectors.toSet());

        return playthroughs.stream()
            .filter(p -> playthroughIdsWithSessionInRange.contains(p.getId())
                || (!playthroughIdsWithAnySession.contains(p.getId())
                    && isWithin(p.getLastPlayedAt(), range)))
            .collect(Collectors.toList());
    }

    private boolean isWithin(Instant instant, DateRange range) {
        return instant != null
            && !instant.isBefore(range.start())
            && !instant.isAfter(range.end());
    }

    private Long calculateTotalPlaytime(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .mapToLong(this::effectivePlaytimeSeconds)
            .sum();
    }

    private long effectivePlaytimeSeconds(Playthrough playthrough) {
        return playthrough.effectivePlaytimeSeconds();
    }

    /**
     * For a bounded period, a playthrough's full lifetime durationSeconds overcounts if it
     * also has activity outside the window. Sum the session time actually inside the window
     * instead, and fall back to durationSeconds only for playthroughs that have no session
     * rows at all — legacy data and hand-edited totals, which carry no timestamps that
     * could place them any more precisely than lastPlayedAt.
     *
     * The fallback previously keyed off "no session in this window" rather than "no session
     * rows anywhere", so a playthrough with a hundred hours recorded across earlier months
     * contributed all hundred to any period in which it was merely touched.
     */
    private Long calculateTotalPlaytimeForRange(List<Playthrough> playthroughs, List<SessionHistory> sessionsInRange,
                                                Set<Long> playthroughIdsWithAnySession, DateRange range) {
        if (range.start().equals(Instant.EPOCH)) {
            return calculateTotalPlaytime(playthroughs);
        }

        long sessionTotal = sessionsInRange.stream()
            .mapToLong(SessionHistory::getDurationSeconds)
            .sum();

        long sessionlessTotal = playthroughs.stream()
            .filter(p -> !playthroughIdsWithAnySession.contains(p.getId()))
            .mapToLong(this::effectivePlaytimeSeconds)
            .sum();

        return sessionTotal + sessionlessTotal;
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
        // A dropped playthrough is explicitly not in progress - it is the state a user
        // picks to say they have stopped. Counting it here meant abandoned games kept
        // inflating "In Progress" with no way to clear them short of deleting the record.
        return (int) playthroughs.stream()
            .filter(p -> !Boolean.TRUE.equals(p.getIsCompleted())
                && !Boolean.TRUE.equals(p.getIsDropped())
                && p.getDurationSeconds() > 0)
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

    private UserStatisticsDto.TimeOfDayStats calculateTimeOfDayStats(List<SessionHistory> sessions, ZoneId zone) {
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
            LocalDateTime startTime = LocalDateTime.ofInstant(session.getStartedAt(), zone);
            LocalDateTime endTime = LocalDateTime.ofInstant(session.getEndedAt(), zone);
            long playedSeconds = session.getDurationSeconds();

            Map<Integer, Long> wallClockByHour = spreadAcrossClockHours(startTime, endTime);
            long wallClockSeconds = wallClockByHour.values().stream().mapToLong(Long::longValue).sum();

            if (wallClockSeconds <= 0) {
                int hour = startTime.getHour();
                hourlyDistribution.merge(hour, playedSeconds, Long::sum);
                addToTimeOfDay(timeOfDayMap, hour, playedSeconds);
                continue;
            }

            // Scale the wall-clock spread down to the time actually played. A session that
            // ran 20:00-01:00 with three hours paused occupies five hours of clock but is
            // only two hours of play; spreading the raw span put time the user did not
            // spend playing into the evening and night buckets, and made those buckets sum
            // to more than the session's own duration.
            long distributed = 0;
            int remaining = wallClockByHour.size();
            for (Map.Entry<Integer, Long> entry : wallClockByHour.entrySet()) {
                remaining--;
                long scaled = remaining == 0
                    ? playedSeconds - distributed // last bucket absorbs the rounding drift
                    : Math.round(playedSeconds * (double) entry.getValue() / wallClockSeconds);
                distributed += scaled;

                hourlyDistribution.merge(entry.getKey(), scaled, Long::sum);
                addToTimeOfDay(timeOfDayMap, entry.getKey(), scaled);
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

    /**
     * Wall-clock seconds the span occupies in each clock hour, keyed by hour-of-day and
     * kept in the order the span passes through them.
     */
    private Map<Integer, Long> spreadAcrossClockHours(LocalDateTime start, LocalDateTime end) {
        Map<Integer, Long> byHour = new LinkedHashMap<>();
        LocalDateTime current = start;

        while (current.isBefore(end)) {
            LocalDateTime nextHour = current.plusHours(1).withMinute(0).withSecond(0).withNano(0);
            if (nextHour.isAfter(end)) {
                nextHour = end;
            }
            byHour.merge(current.getHour(), ChronoUnit.SECONDS.between(current, nextHour), Long::sum);
            current = nextHour;
        }

        return byHour;
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

    /** The inclusive span of calendar days a period actually covers. */
    private record DaySpan(LocalDate start, LocalDate end) {
    }

    private DaySpan resolveDaySpan(List<SessionHistory> sessions, DateRange range, ZoneId zone) {
        LocalDate startDate = range.start().equals(Instant.EPOCH)
            ? sessions.stream()
                .map(s -> LocalDateTime.ofInstant(s.getStartedAt(), zone).toLocalDate())
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now(zone))
            : LocalDateTime.ofInstant(range.start(), zone).toLocalDate();

        // Cap at today: for the current period this stops the span at "now"; for a past
        // period, range.end() is already before today. Without the cap, an average over a
        // month in progress would be divided by days that have not happened yet.
        LocalDate rangeEndDate = LocalDateTime.ofInstant(range.end(), zone).toLocalDate();
        LocalDate today = LocalDate.now(zone);
        LocalDate endDate = rangeEndDate.isBefore(today) ? rangeEndDate : today;

        return new DaySpan(startDate, endDate.isBefore(startDate) ? startDate : endDate);
    }

    private List<UserStatisticsDto.DailyPlaytime> calculateDailyPlaytime(
            List<SessionHistory> sessions, DaySpan span, ZoneId zone) {
        Map<LocalDate, Long> dailyMap = new HashMap<>();

        for (SessionHistory session : sessions) {
            LocalDate date = LocalDateTime.ofInstant(session.getStartedAt(), zone).toLocalDate();
            dailyMap.merge(date, session.getDurationSeconds(), Long::sum);
        }

        List<UserStatisticsDto.DailyPlaytime> result = new ArrayList<>();
        LocalDate current = span.start();
        while (!current.isAfter(span.end())) {
            result.add(UserStatisticsDto.DailyPlaytime.builder()
                .date(current)
                .playtimeSeconds(dailyMap.getOrDefault(current, 0L))
                .build());
            current = current.plusDays(1);
        }

        return result;
    }

    /**
     * Splits each playthrough's time evenly across its game's genres, so the distribution
     * sums to the playtime it is describing.
     *
     * Each genre used to receive the playthrough's <em>full</em> playtime, so a game tagged
     * Action/RPG/Adventure contributed three times its hours. The pie normalises its slices
     * and so still looked plausible, but the hour figures in the legend were inflated and
     * heavily-tagged games crowded out single-genre ones purely on tag count.
     */
    private Map<String, Long> calculateGenreDistribution(List<Playthrough> playthroughs) {
        Map<String, Long> genreMap = new HashMap<>();

        for (Playthrough playthrough : playthroughs) {
            Game game = playthrough.getGame();
            if (game.getGenres() == null || game.getGenres().isEmpty()) {
                continue;
            }

            List<String> genres = Arrays.stream(game.getGenres().split(","))
                .map(String::trim)
                .filter(genre -> !genre.isEmpty())
                .collect(Collectors.toList());
            if (genres.isEmpty()) {
                continue;
            }

            long playtime = effectivePlaytimeSeconds(playthrough);
            long share = playtime / genres.size();
            // Hand the integer-division remainder to the first few genres so the parts add
            // back up to exactly the playtime, rather than losing a second or two per game.
            long remainder = playtime % genres.size();

            for (int i = 0; i < genres.size(); i++) {
                genreMap.merge(genres.get(i), share + (i < remainder ? 1 : 0), Long::sum);
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
     * Most replays (playthrough count) is the single deciding criterion for "Favorite
     * Game" — a game you've completed/started over again is a stronger "favorite"
     * signal than raw total playtime, and unlike playtime it doesn't just duplicate
     * the #1 spot in "Most Played Games". The other four candidate criteria (most
     * playtime, most sessions, longest session, longest average session) rarely land
     * on the same game, so rather than picking among them they're surfaced as badges
     * on the winning game whenever it also happens to lead in one of them.
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
            .max(Comparator.comparing(GameFavoriteAggregation::getPlaythroughCount)
                .thenComparing(GameFavoriteAggregation::getTotalPlaytime))
            .orElse(null);

        if (favorite == null) {
            return null;
        }

        List<String> badges = new ArrayList<>();
        Long favoriteGameId = favorite.getGame().getId();

        if (favoriteGameId.equals(
                statsByGame.values().stream().max(Comparator.comparing(GameFavoriteAggregation::getTotalPlaytime))
                    .map(s -> s.getGame().getId()).orElse(null))) {
            badges.add("mostPlaytime");
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

    /**
     * Average playtime per occurrence of each weekday in the period - "how long do I
     * typically play on a Monday".
     *
     * This used to divide each weekday's total by the number of <em>sessions</em> that
     * landed on it, which is average session length, a different statistic entirely. Shown
     * beside "Total Hours" on the same chart it read as hours-per-Monday, and it moved in
     * the opposite direction to the truth: playing more often on Mondays lowered the line.
     */
    private Map<String, Double> calculateDayOfWeekAveragePlaytime(
            List<SessionHistory> sessions, DaySpan span, ZoneId zone) {
        Map<String, Long> totalPlaytimeByDay = calculateDayOfWeekTotalPlaytime(sessions, zone);

        Map<String, Integer> occurrencesByDay = new HashMap<>();
        for (LocalDate date = span.start(); !date.isAfter(span.end()); date = date.plusDays(1)) {
            occurrencesByDay.merge(date.getDayOfWeek().toString(), 1, Integer::sum);
        }

        Map<String, Double> averagePlaytime = new HashMap<>();
        for (Map.Entry<String, Long> entry : totalPlaytimeByDay.entrySet()) {
            int occurrences = occurrencesByDay.getOrDefault(entry.getKey(), 0);
            averagePlaytime.put(entry.getKey(),
                occurrences == 0 ? 0.0 : (double) entry.getValue() / occurrences);
        }

        return averagePlaytime;
    }

    private Map<String, Long> calculateDayOfWeekTotalPlaytime(List<SessionHistory> sessions, ZoneId zone) {
        Map<String, Long> playtimeByDay = new HashMap<>();

        for (DayOfWeek day : DayOfWeek.values()) {
            playtimeByDay.put(day.toString(), 0L);
        }

        for (SessionHistory session : sessions) {
            DayOfWeek dayOfWeek = LocalDateTime.ofInstant(session.getStartedAt(), zone)
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
