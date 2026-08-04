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
import com.gamewatch.util.TimezoneUtils;
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
import java.util.Optional;
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
    private final PlaythroughService playthroughService;

    @Transactional
    public GameDto createGame(CreateGameRequest request, User user) {
        if (request.getExternalId() != null) {
            if (userGameRepository.existsByUserAndGameExternalId(user, request.getExternalId())) {
                throw new IllegalArgumentException("You already have this game in your library");
            }

            // The catalogue is shared. Adding a game someone else already added links to
            // the existing row rather than inserting a private copy of it - without this
            // every user held their own unrelated row for the same game, and nothing that
            // aggregates across users could be built on top.
            Optional<Game> catalogued = gameRepository.findFirstByExternalId(request.getExternalId());
            if (catalogued.isPresent()) {
                Game existing = catalogued.get();
                userGameRepository.save(UserGame.builder().user(user).game(existing).build());
                log.info("Linked existing catalogue game {} to user {}", existing.getId(), user.getAuth0UserId());
                return mapToDtoWithStats(existing, List.of());
            }
        }

        Game game = Game.builder()
            .name(request.getName())
            .bannerImageUrl(request.getBannerImageUrl())
            .description(request.getDescription())
            .externalId(request.getExternalId())
            .releaseDate(request.getReleaseDate())
            .rating(request.getRating())
            .ratingsCount(request.getRatingsCount())
            .genres(request.getGenres())
            .platforms(request.getPlatforms())
            .developers(request.getDevelopers())
            .publishers(request.getPublishers())
            .tags(request.getTags())
            .slug(request.getSlug())
            .website(request.getWebsite())
            .averageCompletionSeconds(request.getAverageCompletionSeconds())
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

    /**
     * Removes a game from this user's library, together with their own playthroughs of it.
     *
     * The catalogue row itself stays. It used to be deleted outright, which was survivable
     * only while every user had a private copy of every game; against a shared catalogue
     * that same call would delete the game, and by cascade every other user's playthroughs
     * and session history for it, on one person's say-so.
     *
     * Playthroughs are removed one by one through PlaythroughService rather than left to
     * the foreign key, so each one still releases anything that imported from it and
     * rebuilds the health metrics for the days it contributed to.
     */
    @Transactional
    public void deleteGame(Long id, User user) {
        Game game = gameRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Game not found"));

        UserGame userGame = userGameRepository.findByUserAndGame(user, game)
            .orElseThrow(() -> new RuntimeException("Game not found or access denied"));

        List<Playthrough> ownPlaythroughs = playthroughRepository
            .findByUserIdAndGameIdOrderByCreatedAtDesc(user.getId(), game.getId());
        for (Playthrough playthrough : ownPlaythroughs) {
            playthroughService.deletePlaythrough(user, playthrough.getId());
        }

        userGameRepository.delete(userGame);
        log.info("Removed game {} and {} playthroughs from user {}'s library",
            id, ownPlaythroughs.size(), user.getAuth0UserId());
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
            .ratingsCount(game.getRatingsCount())
            .genres(game.getGenres())
            .platforms(game.getPlatforms())
            .developers(game.getDevelopers())
            .publishers(game.getPublishers())
            .tags(game.getTags())
            .slug(game.getSlug())
            .website(game.getWebsite())
            .averageCompletionSeconds(game.getAverageCompletionSeconds())
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
            .mapToLong(Playthrough::effectivePlaytimeSeconds)
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
            .ratingsCount(game.getRatingsCount())
            .genres(game.getGenres())
            .platforms(game.getPlatforms())
            .developers(game.getDevelopers())
            .publishers(game.getPublishers())
            .tags(game.getTags())
            .slug(game.getSlug())
            .website(game.getWebsite())
            .averageCompletionSeconds(game.getAverageCompletionSeconds())
            .esrbRating(game.getEsrbRating())
            .alternativeNames(game.getAlternativeNames())
            .dominantColor1(game.getDominantColor1())
            .dominantColor2(game.getDominantColor2())
            .status(status)
            .totalPlaytimeSeconds(totalSeconds)
            // Deleting a game cascades to its playthroughs and their sessions, so the
            // confirmation dialog needs to be able to say how much that actually is.
            .playthroughCount(playthroughs.size())
            .sessionCount(sessionCount)
            .lastPlayedDate(lastPlayedDate)
            .build();
    }
    
    private String calculateGameStatus(List<Playthrough> playthroughs) {
        if (playthroughs.isEmpty()) {
            return null;
        }
        
        long totalPlaytime = playthroughs.stream()
            .mapToLong(Playthrough::effectivePlaytimeSeconds)
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

        // The library link, not the catalogue row, is what records when *this* user added
        // the game. Against a shared catalogue games.createdAt is when the game first
        // entered the catalogue, which can predate the user entirely.
        UserGame libraryEntry = userGameRepository.findByUserAndGame(user, game)
            .orElseThrow(() -> new RuntimeException("Game not found or access denied"));
        LocalDate addedToLibraryDate = libraryEntry.getCreatedAt()
            .atZone(TimezoneUtils.resolveZone(user))
            .toLocalDate();

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
                .gameAddedDate(addedToLibraryDate)
                .totalPlayTimeSeconds(0L)
                .totalSessions(0)
                .averageSessionTimeSeconds(0L)
                .longestSessionSeconds(0L)
                .replaysCount(0)
                .sessions(new ArrayList<>())
                .build();
        }
        
        long totalPlayTimeSeconds = playthroughs.stream()
            .mapToLong(Playthrough::effectivePlaytimeSeconds)
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
            .gameAddedDate(addedToLibraryDate)
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
