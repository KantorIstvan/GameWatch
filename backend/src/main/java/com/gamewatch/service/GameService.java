package com.gamewatch.service;

import com.gamewatch.dto.CreateGameRequest;
import com.gamewatch.dto.GameDto;
import com.gamewatch.dto.GameStatisticsDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.entity.UserGame;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserGameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameService {

    private final GameRepository gameRepository;
    private final UserGameRepository userGameRepository;
    private final PlaythroughRepository playthroughRepository;
    private final SessionHistoryRepository sessionHistoryRepository;

    @Transactional
    public GameDto createGame(CreateGameRequest request, User user) {
        if (request.getExternalId() != null) {
            if (userGameRepository.existsByUserAndGameExternalId(user, request.getExternalId())) {
                throw new IllegalArgumentException("You already have this game in your library");
            }
        }
        
        Game game = Game.builder()
            .name(request.getName())
            .bannerImageUrl(request.getBannerImageUrl())
            .description(request.getDescription())
            .externalId(request.getExternalId())
            .releaseDate(request.getReleaseDate())
            .rating(request.getRating())
            .ratingTop(request.getRatingTop())
            .ratingsCount(request.getRatingsCount())
            .genres(request.getGenres())
            .platforms(request.getPlatforms())
            .developers(request.getDevelopers())
            .publishers(request.getPublishers())
            .tags(request.getTags())
            .nameOriginal(request.getNameOriginal())
            .slug(request.getSlug())
            .tba(request.getTba())
            .updatedAtRawg(request.getUpdated())
            .website(request.getWebsite())
            .metacritic(request.getMetacritic())
            .metacriticUrl(request.getMetacriticUrl())
            .backgroundImageAdditional(request.getBackgroundImageAdditional())
            .playtime(request.getPlaytime())
            .screenshotsCount(request.getScreenshotsCount())
            .moviesCount(request.getMoviesCount())
            .creatorsCount(request.getCreatorsCount())
            .achievementsCount(request.getAchievementsCount())
            .parentAchievementsCount(request.getParentAchievementsCount())
            .redditUrl(request.getRedditUrl())
            .redditName(request.getRedditName())
            .redditDescription(request.getRedditDescription())
            .redditLogo(request.getRedditLogo())
            .redditCount(request.getRedditCount())
            .twitchCount(request.getTwitchCount())
            .youtubeCount(request.getYoutubeCount())
            .added(request.getAdded())
            .reviewsTextCount(request.getReviewsTextCount())
            .suggestionsCount(request.getSuggestionsCount())
            .parentsCount(request.getParentsCount())
            .additionsCount(request.getAdditionsCount())
            .gameSeriesCount(request.getGameSeriesCount())
            .esrbRating(request.getEsrbRating())
            .alternativeNames(request.getAlternativeNames())
            .dominantColor1(request.getDominantColor1())
            .dominantColor2(request.getDominantColor2())
            .build();

        game = gameRepository.save(game);
        
        UserGame userGame = UserGame.builder()
            .user(user)
            .game(game)
            .build();
        userGameRepository.save(userGame);
        
        log.info("Created game: {} for user: {}", game.getName(), user.getAuth0UserId());
        
        return mapToDto(game);
    }

    @Transactional(readOnly = true)
    public List<GameDto> getAllGames(User user) {
        List<Game> games = userGameRepository.findGamesByUser(user);
        
        if (games.isEmpty()) {
            return List.of();
        }
        
        List<Long> gameIds = games.stream().map(Game::getId).collect(Collectors.toList());
        List<Playthrough> allPlaythroughs = playthroughRepository
            .findByUserIdAndGameIdIn(user.getId(), gameIds);
        
        Map<Long, List<Playthrough>> playthroughsByGame = allPlaythroughs.stream()
            .collect(Collectors.groupingBy(p -> p.getGame().getId()));
        
        return games.stream()
            .map(game -> mapToDtoWithStats(game, playthroughsByGame.getOrDefault(game.getId(), List.of())))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GameDto getGameById(Long id, User user) {
        Game game = gameRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Game not found"));
        
        if (!userGameRepository.existsByUserAndGame(user, game)) {
            throw new RuntimeException("Game not found or access denied");
        }
        
        return mapToDtoWithStats(game, user);
    }

    @Transactional
    public void deleteGame(Long id, User user) {
        Game game = gameRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Game not found"));
        
        UserGame userGame = userGameRepository.findByUserAndGame(user, game)
            .orElseThrow(() -> new RuntimeException("Game not found or access denied"));
        
        userGameRepository.delete(userGame);
        
        gameRepository.deleteById(id);
        log.info("Deleted game with id: {} for user: {}", id, user.getAuth0UserId());
    }

    private GameDto mapToDto(Game game) {
        return GameDto.builder()
            .id(game.getId())
            .name(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .description(game.getDescription())
            .externalId(game.getExternalId())
            .releaseDate(game.getReleaseDate())
            .rating(game.getRating())
            .ratingTop(game.getRatingTop())
            .ratingsCount(game.getRatingsCount())
            .genres(game.getGenres())
            .platforms(game.getPlatforms())
            .developers(game.getDevelopers())
            .publishers(game.getPublishers())
            .tags(game.getTags())
            .nameOriginal(game.getNameOriginal())
            .slug(game.getSlug())
            .tba(game.getTba())
            .updated(game.getUpdatedAtRawg())
            .website(game.getWebsite())
            .metacritic(game.getMetacritic())
            .metacriticUrl(game.getMetacriticUrl())
            .backgroundImageAdditional(game.getBackgroundImageAdditional())
            .playtime(game.getPlaytime())
            .screenshotsCount(game.getScreenshotsCount())
            .moviesCount(game.getMoviesCount())
            .creatorsCount(game.getCreatorsCount())
            .achievementsCount(game.getAchievementsCount())
            .parentAchievementsCount(game.getParentAchievementsCount())
            .redditUrl(game.getRedditUrl())
            .redditName(game.getRedditName())
            .redditDescription(game.getRedditDescription())
            .redditLogo(game.getRedditLogo())
            .redditCount(game.getRedditCount())
            .twitchCount(game.getTwitchCount())
            .youtubeCount(game.getYoutubeCount())
            .added(game.getAdded())
            .reviewsTextCount(game.getReviewsTextCount())
            .suggestionsCount(game.getSuggestionsCount())
            .parentsCount(game.getParentsCount())
            .additionsCount(game.getAdditionsCount())
            .gameSeriesCount(game.getGameSeriesCount())
            .esrbRating(game.getEsrbRating())
            .alternativeNames(game.getAlternativeNames())
            .dominantColor1(game.getDominantColor1())
            .dominantColor2(game.getDominantColor2())
            .build();
    }
    
    private GameDto mapToDtoWithStats(Game game, User user) {
        List<Playthrough> playthroughs = playthroughRepository
            .findByUserIdAndGameIdOrderByCreatedAtDesc(user.getId(), game.getId());
        return mapToDtoWithStats(game, playthroughs);
    }
    
    private GameDto mapToDtoWithStats(Game game, List<Playthrough> playthroughs) {
        long totalSeconds = playthroughs.stream()
            .mapToLong(p -> {
                long duration = p.getDurationSeconds() != null ? p.getDurationSeconds() : 0L;
                long imported = p.getImportedDurationSeconds() != null ? p.getImportedDurationSeconds() : 0L;
                return Math.max(0, duration - imported);
            })
            .sum();
        
        int sessionCount = playthroughs.stream()
            .mapToInt(p -> p.getSessionCount() != null ? p.getSessionCount() : 0)
            .sum();
        
        String lastPlayedDate = playthroughs.stream()
            .map(Playthrough::getLastPlayedAt)
            .filter(date -> date != null)
            .max(Instant::compareTo)
            .map(instant -> instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString())
            .orElse(null);
        
        String status = calculateGameStatus(playthroughs);
        
        return GameDto.builder()
            .id(game.getId())
            .name(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .description(game.getDescription())
            .externalId(game.getExternalId())
            .releaseDate(game.getReleaseDate())
            .rating(game.getRating())
            .ratingTop(game.getRatingTop())
            .ratingsCount(game.getRatingsCount())
            .genres(game.getGenres())
            .platforms(game.getPlatforms())
            .developers(game.getDevelopers())
            .publishers(game.getPublishers())
            .tags(game.getTags())
            .nameOriginal(game.getNameOriginal())
            .slug(game.getSlug())
            .tba(game.getTba())
            .updated(game.getUpdatedAtRawg())
            .website(game.getWebsite())
            .metacritic(game.getMetacritic())
            .metacriticUrl(game.getMetacriticUrl())
            .backgroundImageAdditional(game.getBackgroundImageAdditional())
            .playtime(game.getPlaytime())
            .screenshotsCount(game.getScreenshotsCount())
            .moviesCount(game.getMoviesCount())
            .creatorsCount(game.getCreatorsCount())
            .achievementsCount(game.getAchievementsCount())
            .parentAchievementsCount(game.getParentAchievementsCount())
            .redditUrl(game.getRedditUrl())
            .redditName(game.getRedditName())
            .redditDescription(game.getRedditDescription())
            .redditLogo(game.getRedditLogo())
            .redditCount(game.getRedditCount())
            .twitchCount(game.getTwitchCount())
            .youtubeCount(game.getYoutubeCount())
            .added(game.getAdded())
            .reviewsTextCount(game.getReviewsTextCount())
            .suggestionsCount(game.getSuggestionsCount())
            .parentsCount(game.getParentsCount())
            .additionsCount(game.getAdditionsCount())
            .gameSeriesCount(game.getGameSeriesCount())
            .esrbRating(game.getEsrbRating())
            .alternativeNames(game.getAlternativeNames())
            .dominantColor1(game.getDominantColor1())
            .dominantColor2(game.getDominantColor2())
            .status(status)
            .totalPlaytimeSeconds(totalSeconds)
            .sessionCount(sessionCount)
            .lastPlayedDate(lastPlayedDate)
            .build();
    }
    
    private String calculateGameStatus(List<Playthrough> playthroughs) {
        if (playthroughs.isEmpty()) {
            return null;
        }
        
        long totalPlaytime = playthroughs.stream()
            .mapToLong(p -> {
                long duration = p.getDurationSeconds() != null ? p.getDurationSeconds() : 0L;
                long imported = p.getImportedDurationSeconds() != null ? p.getImportedDurationSeconds() : 0L;
                return Math.max(0, duration - imported);
            })
            .sum();
        
        if (totalPlaytime == 0) {
            return null;
        }
        
        boolean hasActive = playthroughs.stream()
            .anyMatch(p -> p.getIsActive() != null && p.getIsActive());
        if (hasActive) {
            return "active";
        }
        
        boolean hasCompleted = playthroughs.stream()
            .anyMatch(p -> p.getIsCompleted() != null && p.getIsCompleted() && 
                          (p.getIsDropped() == null || !p.getIsDropped()));
        if (hasCompleted) {
            return "completed";
        }
        
        boolean hasStarted = playthroughs.stream()
            .anyMatch(p -> p.getDurationSeconds() != null && p.getDurationSeconds() > 0 && 
                          (p.getIsCompleted() == null || !p.getIsCompleted()) &&
                          (p.getIsDropped() == null || !p.getIsDropped()));
        if (hasStarted) {
            return "started";
        }
        
        boolean hasDropped = playthroughs.stream()
            .anyMatch(p -> p.getIsDropped() != null && p.getIsDropped());
        if (hasDropped) {
            return "dropped";
        }
        
        return null;
    }
    
    @Transactional(readOnly = true)
    public GameStatisticsDto getGameStatistics(Long gameId, User user) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new RuntimeException("Game not found"));
        
        if (!userGameRepository.existsByUserAndGame(user, game)) {
            throw new RuntimeException("Game not found or access denied");
        }
        
        List<Playthrough> playthroughs = playthroughRepository
            .findByUserIdAndGameIdOrderByCreatedAtDesc(user.getId(), game.getId());
        
        log.info("Found {} playthroughs for game {} (user {})", playthroughs.size(), gameId, user.getId());
        playthroughs.forEach(p -> log.info("Playthrough {}: duration={}, sessions={}, title={}", 
            p.getId(), p.getDurationSeconds(), p.getSessionCount(), p.getTitle()));
        
        if (playthroughs.isEmpty()) {
            return GameStatisticsDto.builder()
                .gameId(game.getId())
                .gameName(game.getName())
                .gameBannerImageUrl(game.getBannerImageUrl())
                .gameAddedDate(game.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate())
                .totalPlayTimeSeconds(0L)
                .totalSessions(0)
                .averageSessionTimeSeconds(0L)
                .longestSessionSeconds(0L)
                .replaysCount(0)
                .sessions(new ArrayList<>())
                .build();
        }
        
        long totalPlayTimeSeconds = playthroughs.stream()
            .mapToLong(p -> {
                long duration = p.getDurationSeconds() != null ? p.getDurationSeconds() : 0L;
                long imported = p.getImportedDurationSeconds() != null ? p.getImportedDurationSeconds() : 0L;
                return Math.max(0, duration - imported);
            })
            .sum();
        
        int totalSessions = playthroughs.stream()
            .mapToInt(p -> p.getSessionCount() != null ? p.getSessionCount() : 0)
            .sum();
        
        long averageSessionTimeSeconds = totalSessions > 0 ? totalPlayTimeSeconds / totalSessions : 0L;
        
        int replaysCount = playthroughs.size();
        
        LocalDate firstStartedDate = playthroughs.stream()
            .map(p -> {
                if (p.getStartDate() != null) {
                    return p.getStartDate();
                } else if (p.getCreatedAt() != null) {
                    return p.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                }
                return null;
            })
            .filter(date -> date != null)
            .min(LocalDate::compareTo)
            .orElse(null);
        
        LocalDate lastPlayedDate = playthroughs.stream()
            .map(Playthrough::getLastPlayedAt)
            .filter(date -> date != null)
            .max(Instant::compareTo)
            .map(instant -> instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate())
            .orElse(null);
        
        LocalDate gameAddedDate = game.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        
        List<Long> completionTimes = playthroughs.stream()
            .filter(p -> p.getIsCompleted() != null && p.getIsCompleted())
            .filter(p -> p.getDurationSeconds() != null && p.getDurationSeconds() > 0)
            .map(Playthrough::getDurationSeconds)
            .collect(Collectors.toList());
        
        Long longestCompletionSeconds = completionTimes.stream()
            .max(Long::compareTo)
            .orElse(null);
        
        Long shortestCompletionSeconds = completionTimes.stream()
            .min(Long::compareTo)
            .orElse(null);
        
        List<GameStatisticsDto.SessionDetail> sessionDetails = new ArrayList<>();
        
        long longestSessionSeconds = 0L;
        
        List<Long> playthroughIds = playthroughs.stream()
            .map(Playthrough::getId)
            .collect(Collectors.toList());
        
        if (!playthroughIds.isEmpty()) {
            List<SessionHistory> sessionHistories = sessionHistoryRepository
                .findByPlaythroughIdsOrderByPlaythroughAndSession(playthroughIds);
            
            log.info("Found {} session history records for {} playthroughs", 
                sessionHistories.size(), playthroughIds.size());
            
            longestSessionSeconds = sessionHistories.stream()
                .mapToLong(SessionHistory::getDurationSeconds)
                .max()
                .orElse(0L);
            
            AtomicInteger sessionCounter = new AtomicInteger(1);
            for (SessionHistory sh : sessionHistories) {
                Playthrough playthrough = sh.getPlaythrough();
                sessionDetails.add(GameStatisticsDto.SessionDetail.builder()
                    .sessionId(sh.getId())
                    .playthroughId(playthrough.getId())
                    .sessionNumber(sessionCounter.getAndIncrement())
                    .sessionDate(sh.getEndedAt())
                    .playthroughTitle(playthrough.getTitle() != null ? playthrough.getTitle() : playthrough.getPlaythroughType())
                    .sessionTimeSeconds(sh.getDurationSeconds())
                    .pauseCount(sh.getPauseCount())
                    .startedAt(sh.getStartedAt())
                    .endedAt(sh.getEndedAt())
                    .build());
            }
            
            log.info("Built {} session details from history", sessionDetails.size());
        }
        
        GameStatisticsDto result = GameStatisticsDto.builder()
            .gameId(game.getId())
            .gameName(game.getName())
            .gameBannerImageUrl(game.getBannerImageUrl())
            .gameAddedDate(gameAddedDate)
            .totalPlayTimeSeconds(totalPlayTimeSeconds)
            .totalSessions(totalSessions)
            .averageSessionTimeSeconds(averageSessionTimeSeconds)
            .longestSessionSeconds(longestSessionSeconds)
            .replaysCount(replaysCount)
            .firstStartedDate(firstStartedDate)
            .lastPlayedDate(lastPlayedDate)
            .longestCompletionSeconds(longestCompletionSeconds)
            .shortestCompletionSeconds(shortestCompletionSeconds)
            .sessions(sessionDetails)
            .build();
        
        log.info("Returning statistics for game {}: totalPlayTime={}, totalSessions={}, sessions.size={}", 
            gameId, totalPlayTimeSeconds, totalSessions, sessionDetails.size());
        
        return result;
    }
}
