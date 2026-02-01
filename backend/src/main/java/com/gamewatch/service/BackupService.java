package com.gamewatch.service;

import com.gamewatch.dto.BackupDto;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupService {

    private static final String BACKUP_VERSION = "1.0";

    private final GameRepository gameRepository;
    private final PlaythroughRepository playthroughRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final UserGameRepository userGameRepository;
    private final HealthSettingsRepository healthSettingsRepository;
    private final MoodEntryRepository moodEntryRepository;

    @Transactional(readOnly = true)
    public BackupDto exportBackup(User user) {
        log.info("Starting backup export for user: {}", user.getId());

        // Get all user games
        List<Game> userGames = userGameRepository.findGamesByUser(user);
        log.info("Found {} games for user", userGames.size());

        // Get all playthroughs
        List<Playthrough> playthroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        log.info("Found {} playthroughs for user", playthroughs.size());

        // Get all sessions for user's playthroughs
        List<Long> playthroughIds = playthroughs.stream()
            .map(Playthrough::getId)
            .collect(Collectors.toList());
        
        List<SessionHistory> sessions = playthroughIds.isEmpty() 
            ? new ArrayList<>() 
            : sessionHistoryRepository.findByPlaythroughIdIn(playthroughIds);
        log.info("Found {} sessions for user", sessions.size());

        // Get all mood entries for user
        List<MoodEntry> moodEntries = moodEntryRepository.findByUserId(user.getId());
        log.info("Found {} mood entries for user", moodEntries.size());

        // Get health settings
        HealthSettings healthSettings = healthSettingsRepository.findByUserId(user.getId()).orElse(null);

        // Calculate total playtime
        long totalPlaytime = playthroughs.stream()
            .mapToLong(p -> p.getDurationSeconds() != null ? p.getDurationSeconds() : 0L)
            .sum();

        // Build backup DTO
        BackupDto backup = BackupDto.builder()
            .version(BACKUP_VERSION)
            .timestamp(Instant.now())
            .data(BackupDto.BackupDataDto.builder()
                .games(mapGamesToBackupDto(userGames))
                .playthroughs(mapPlaythroughsToBackupDto(playthroughs))
                .sessions(mapSessionsToBackupDto(sessions))
                .moodEntries(mapMoodEntriesToBackupDto(moodEntries))
                .healthSettings(mapHealthSettingsToBackupDto(healthSettings))
                .metadata(BackupDto.BackupMetadataDto.builder()
                    .totalGames(userGames.size())
                    .totalPlaythroughs(playthroughs.size())
                    .totalSessions(sessions.size())
                    .totalMoodEntries(moodEntries.size())
                    .totalPlaytimeSeconds(totalPlaytime)
                    .build())
                .build())
            .build();

        log.info("Backup export completed for user: {}", user.getId());
        return backup;
    }

    @Transactional
    public void importBackup(User user, BackupDto backup) {
        if (!BACKUP_VERSION.equals(backup.getVersion())) {
            throw new IllegalArgumentException("Incompatible backup version: " + backup.getVersion());
        }

        BackupDto.BackupDataDto data = backup.getData();
        if (data == null) {
            throw new IllegalArgumentException("Backup data is missing");
        }

        // Maps to track old ID -> new entity
        Map<Long, Game> gameMap = new HashMap<>();
        Map<Long, Playthrough> playthroughMap = new HashMap<>();
        Map<Long, SessionHistory> sessionMap = new HashMap<>();
        
        // Track games by externalId and name to prevent duplicates within import
        Map<Integer, Game> gamesByExternalId = new HashMap<>();
        Map<String, Game> gamesByName = new HashMap<>();

        // Import games
        if (data.getGames() != null) {
            for (BackupDto.BackupGameDto gameDto : data.getGames()) {
                Game game = importGame(user, gameDto, gamesByExternalId, gamesByName);
                gameMap.put(gameDto.getOriginalId(), game);
                
                // Track for deduplication
                if (gameDto.getExternalId() != null) {
                    gamesByExternalId.put(gameDto.getExternalId(), game);
                }
                if (gameDto.getName() != null) {
                    gamesByName.put(gameDto.getName().toLowerCase(), game);
                }
            }
        }

        // Import playthroughs (first pass - without imported relationships)
        if (data.getPlaythroughs() != null) {
            for (BackupDto.BackupPlaythroughDto ptDto : data.getPlaythroughs()) {
                Game game = gameMap.get(ptDto.getGameOriginalId());
                if (game != null) {
                    Playthrough playthrough = importPlaythrough(user, ptDto, game, playthroughMap);
                    playthroughMap.put(ptDto.getOriginalId(), playthrough);
                }
            }
            
            // Second pass - set imported relationships
            for (BackupDto.BackupPlaythroughDto ptDto : data.getPlaythroughs()) {
                if (ptDto.getImportedFromPlaythroughOriginalId() != null) {
                    Playthrough playthrough = playthroughMap.get(ptDto.getOriginalId());
                    Playthrough importedFrom = playthroughMap.get(ptDto.getImportedFromPlaythroughOriginalId());
                    if (playthrough != null && importedFrom != null) {
                        playthrough.setImportedFromPlaythrough(importedFrom);
                        playthroughRepository.save(playthrough);
                    }
                }
            }
        }

        // Import sessions
        if (data.getSessions() != null) {
            for (BackupDto.BackupSessionDto sessionDto : data.getSessions()) {
                Playthrough playthrough = playthroughMap.get(sessionDto.getPlaythroughOriginalId());
                if (playthrough != null) {
                    SessionHistory session = importSession(sessionDto, playthrough);
                    sessionMap.put(sessionDto.getOriginalId(), session);
                }
            }
        }

        // Import mood entries
        if (data.getMoodEntries() != null) {
            for (BackupDto.BackupMoodEntryDto moodDto : data.getMoodEntries()) {
                importMoodEntry(user, moodDto, sessionMap);
            }
        }

        // Import health settings
        if (data.getHealthSettings() != null) {
            importHealthSettings(user, data.getHealthSettings());
        }

        log.info("Backup import completed: {} games, {} playthroughs, {} sessions, {} mood entries", 
                gameMap.size(), playthroughMap.size(), sessionMap.size(), 
                data.getMoodEntries() != null ? data.getMoodEntries().size() : 0);
    }

    private List<BackupDto.BackupGameDto> mapGamesToBackupDto(List<Game> games) {
        return games.stream()
            .map(game -> BackupDto.BackupGameDto.builder()
                .originalId(game.getId())
                .externalId(game.getExternalId())
                .name(game.getName())
                .slug(game.getSlug())
                .bannerImageUrl(game.getBannerImageUrl())
                .description(game.getDescription())
                .released(game.getReleaseDate())
                .rating(game.getRating())
                .ratingsCount(game.getRatingsCount())
                .metacritic(game.getMetacritic())
                .playtime(game.getPlaytime())
                .esrbRating(game.getEsrbRating())
                .platforms(game.getPlatforms())
                .genres(game.getGenres())
                .tags(game.getTags())
                .developers(game.getDevelopers())
                .publishers(game.getPublishers())
                .website(game.getWebsite())
                .alternativeNames(game.getAlternativeNames())
                .dominantColor1(game.getDominantColor1())
                .dominantColor2(game.getDominantColor2())
                .createdAt(game.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<BackupDto.BackupPlaythroughDto> mapPlaythroughsToBackupDto(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .map(pt -> BackupDto.BackupPlaythroughDto.builder()
                .originalId(pt.getId())
                .gameOriginalId(pt.getGame().getId())
                .playthroughType(pt.getPlaythroughType())
                .title(pt.getTitle())
                .platform(pt.getPlatform())
                .startedAt(pt.getStartedAt())
                .stoppedAt(pt.getStoppedAt())
                .durationSeconds(pt.getDurationSeconds())
                .isActive(pt.getIsActive())
                .isCompleted(pt.getIsCompleted())
                .isDropped(pt.getIsDropped())
                .isPaused(pt.getIsPaused())
                .startDate(pt.getStartDate() != null ? pt.getStartDate().toString() : null)
                .endDate(pt.getEndDate() != null ? pt.getEndDate().toString() : null)
                .sessionCount(pt.getSessionCount())
                .pauseCount(pt.getPauseCount())
                .lastPlayedAt(pt.getLastPlayedAt())
                .droppedAt(pt.getDroppedAt())
                .pickedUpAt(pt.getPickedUpAt())
                .importedFromPlaythroughOriginalId(pt.getImportedFromPlaythrough() != null ? 
                    pt.getImportedFromPlaythrough().getId() : null)
                .importedDurationSeconds(pt.getImportedDurationSeconds())
                .manualTimeSet(pt.getManualTimeSet())
                .createdAt(pt.getCreatedAt())
                .updatedAt(pt.getUpdatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<BackupDto.BackupSessionDto> mapSessionsToBackupDto(List<SessionHistory> sessions) {
        return sessions.stream()
            .map(session -> BackupDto.BackupSessionDto.builder()
                .originalId(session.getId())
                .playthroughOriginalId(session.getPlaythrough().getId())
                .sessionNumber(session.getSessionNumber())
                .durationSeconds(session.getDurationSeconds())
                .pauseCount(session.getPauseCount())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .createdAt(session.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private List<BackupDto.BackupMoodEntryDto> mapMoodEntriesToBackupDto(List<MoodEntry> moodEntries) {
        return moodEntries.stream()
            .map(mood -> BackupDto.BackupMoodEntryDto.builder()
                .originalId(mood.getId())
                .sessionHistoryOriginalId(mood.getSessionHistory() != null ? 
                    mood.getSessionHistory().getId() : null)
                .moodRating(mood.getMoodRating())
                .note(mood.getNote())
                .recordedAt(mood.getRecordedAt())
                .createdAt(mood.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private BackupDto.BackupHealthSettingsDto mapHealthSettingsToBackupDto(HealthSettings healthSettings) {
        if (healthSettings == null) {
            return null;
        }

        return BackupDto.BackupHealthSettingsDto.builder()
            .notificationsEnabled(healthSettings.getNotificationsEnabled())
            .soundsEnabled(healthSettings.getSoundsEnabled())
            .hydrationReminderEnabled(healthSettings.getHydrationReminderEnabled())
            .hydrationIntervalMinutes(healthSettings.getHydrationIntervalMinutes())
            .standReminderEnabled(healthSettings.getStandReminderEnabled())
            .standIntervalMinutes(healthSettings.getStandIntervalMinutes())
            .breakReminderEnabled(healthSettings.getBreakReminderEnabled())
            .breakIntervalMinutes(healthSettings.getBreakIntervalMinutes())
            .breakDurationMinutes(healthSettings.getBreakDurationMinutes())
            .goalsEnabled(healthSettings.getGoalsEnabled())
            .maxHoursPerDayEnabled(healthSettings.getMaxHoursPerDayEnabled())
            .maxHoursPerDay(healthSettings.getMaxHoursPerDay())
            .maxSessionsPerDayEnabled(healthSettings.getMaxSessionsPerDayEnabled())
            .maxSessionsPerDay(healthSettings.getMaxSessionsPerDay())
            .maxHoursPerWeekEnabled(healthSettings.getMaxHoursPerWeekEnabled())
            .maxHoursPerWeek(healthSettings.getMaxHoursPerWeek())
            .goalNotificationsEnabled(healthSettings.getGoalNotificationsEnabled())
            .moodPromptEnabled(healthSettings.getMoodPromptEnabled())
            .moodPromptRequired(healthSettings.getMoodPromptRequired())
            .build();
    }

    private Game importGame(User user, BackupDto.BackupGameDto gameDto, 
                           Map<Integer, Game> gamesByExternalId, Map<String, Game> gamesByName) {
        // Check if already imported in this batch (by externalId)
        if (gameDto.getExternalId() != null && gamesByExternalId.containsKey(gameDto.getExternalId())) {
            Game existingGame = gamesByExternalId.get(gameDto.getExternalId());
            ensureUserGameAssociation(user, existingGame);
            return existingGame;
        }
        
        // Check if already imported in this batch (by name)
        if (gameDto.getName() != null && gamesByName.containsKey(gameDto.getName().toLowerCase())) {
            Game existingGame = gamesByName.get(gameDto.getName().toLowerCase());
            ensureUserGameAssociation(user, existingGame);
            return existingGame;
        }
        
        // Check if game with external ID already exists in database (use First to handle duplicates)
        if (gameDto.getExternalId() != null) {
            Optional<Game> existing = gameRepository.findFirstByExternalId(gameDto.getExternalId());
            if (existing.isPresent()) {
                Game existingGame = existing.get();
                ensureUserGameAssociation(user, existingGame);
                log.debug("Found existing game by externalId {}: {}", gameDto.getExternalId(), gameDto.getName());
                return existingGame;
            }
        }
        
        // Check if game with same name already exists in database (fallback, use First to handle duplicates)
        if (gameDto.getName() != null) {
            Optional<Game> existing = gameRepository.findFirstByName(gameDto.getName());
            if (existing.isPresent()) {
                Game existingGame = existing.get();
                ensureUserGameAssociation(user, existingGame);
                log.debug("Found existing game by name: {}", gameDto.getName());
                return existingGame;
            }
        }

        // Create new game
        Game game = Game.builder()
            .externalId(gameDto.getExternalId())
            .name(gameDto.getName())
            .slug(gameDto.getSlug())
            .bannerImageUrl(gameDto.getBannerImageUrl())
            .description(gameDto.getDescription())
            .releaseDate(gameDto.getReleased())
            .rating(gameDto.getRating())
            .ratingsCount(gameDto.getRatingsCount())
            .metacritic(gameDto.getMetacritic())
            .playtime(gameDto.getPlaytime())
            .esrbRating(gameDto.getEsrbRating())
            .platforms(gameDto.getPlatforms())
            .genres(gameDto.getGenres())
            .tags(gameDto.getTags())
            .developers(gameDto.getDevelopers())
            .publishers(gameDto.getPublishers())
            .website(gameDto.getWebsite())
            .alternativeNames(gameDto.getAlternativeNames())
            .dominantColor1(gameDto.getDominantColor1())
            .dominantColor2(gameDto.getDominantColor2())
            .build();

        game = gameRepository.save(game);
        ensureUserGameAssociation(user, game);
        return game;
    }
    
    private void ensureUserGameAssociation(User user, Game game) {
        if (!userGameRepository.existsByUserAndGame(user, game)) {
            UserGame userGame = UserGame.builder()
                .user(user)
                .game(game)
                .totalPlaytimeSeconds(0L)
                .build();
            userGameRepository.save(userGame);
        }
    }

    private Playthrough importPlaythrough(User user, BackupDto.BackupPlaythroughDto ptDto, 
                                         Game game, Map<Long, Playthrough> playthroughMap) {
        Playthrough playthrough = Playthrough.builder()
            .user(user)
            .game(game)
            .playthroughType(ptDto.getPlaythroughType())
            .title(ptDto.getTitle())
            .platform(ptDto.getPlatform())
            .startedAt(ptDto.getStartedAt())
            .stoppedAt(ptDto.getStoppedAt())
            .durationSeconds(ptDto.getDurationSeconds())
            .isActive(false) // Don't restore active timers
            .isCompleted(ptDto.getIsCompleted())
            .isDropped(ptDto.getIsDropped())
            .isPaused(ptDto.getIsPaused())
            .startDate(ptDto.getStartDate() != null ? LocalDate.parse(ptDto.getStartDate()) : null)
            .endDate(ptDto.getEndDate() != null ? LocalDate.parse(ptDto.getEndDate()) : null)
            .sessionCount(ptDto.getSessionCount())
            .pauseCount(ptDto.getPauseCount())
            .lastPlayedAt(ptDto.getLastPlayedAt())
            .droppedAt(ptDto.getDroppedAt())
            .pickedUpAt(ptDto.getPickedUpAt())
            .importedDurationSeconds(ptDto.getImportedDurationSeconds())
            .manualTimeSet(ptDto.getManualTimeSet())
            .build();

        return playthroughRepository.save(playthrough);
    }

    private SessionHistory importSession(BackupDto.BackupSessionDto sessionDto, Playthrough playthrough) {
        SessionHistory session = SessionHistory.builder()
            .playthrough(playthrough)
            .sessionNumber(sessionDto.getSessionNumber())
            .durationSeconds(sessionDto.getDurationSeconds())
            .pauseCount(sessionDto.getPauseCount())
            .startedAt(sessionDto.getStartedAt())
            .endedAt(sessionDto.getEndedAt())
            .build();

        return sessionHistoryRepository.save(session);
    }

    private void importMoodEntry(User user, BackupDto.BackupMoodEntryDto moodDto, 
                                Map<Long, SessionHistory> sessionMap) {
        SessionHistory session = null;
        if (moodDto.getSessionHistoryOriginalId() != null) {
            session = sessionMap.get(moodDto.getSessionHistoryOriginalId());
        }

        MoodEntry moodEntry = MoodEntry.builder()
            .user(user)
            .sessionHistory(session)
            .moodRating(moodDto.getMoodRating())
            .note(moodDto.getNote())
            .recordedAt(moodDto.getRecordedAt())
            .build();

        moodEntryRepository.save(moodEntry);
    }

    private void importHealthSettings(User user, BackupDto.BackupHealthSettingsDto dto) {
        HealthSettings settings = healthSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> HealthSettings.builder().user(user).build());

        // Copy all fields from DTO to entity
        settings.setNotificationsEnabled(dto.getNotificationsEnabled());
        settings.setSoundsEnabled(dto.getSoundsEnabled());
        settings.setHydrationReminderEnabled(dto.getHydrationReminderEnabled());
        settings.setHydrationIntervalMinutes(dto.getHydrationIntervalMinutes());
        settings.setStandReminderEnabled(dto.getStandReminderEnabled());
        settings.setStandIntervalMinutes(dto.getStandIntervalMinutes());
        settings.setBreakReminderEnabled(dto.getBreakReminderEnabled());
        settings.setBreakIntervalMinutes(dto.getBreakIntervalMinutes());
        settings.setBreakDurationMinutes(dto.getBreakDurationMinutes());
        settings.setGoalsEnabled(dto.getGoalsEnabled());
        settings.setMaxHoursPerDayEnabled(dto.getMaxHoursPerDayEnabled());
        settings.setMaxHoursPerDay(dto.getMaxHoursPerDay());
        settings.setMaxSessionsPerDayEnabled(dto.getMaxSessionsPerDayEnabled());
        settings.setMaxSessionsPerDay(dto.getMaxSessionsPerDay());
        settings.setMaxHoursPerWeekEnabled(dto.getMaxHoursPerWeekEnabled());
        settings.setMaxHoursPerWeek(dto.getMaxHoursPerWeek());
        settings.setGoalNotificationsEnabled(dto.getGoalNotificationsEnabled());
        settings.setMoodPromptEnabled(dto.getMoodPromptEnabled());
        settings.setMoodPromptRequired(dto.getMoodPromptRequired());

        healthSettingsRepository.save(settings);
    }
}
