package com.gamewatch.service;

import com.gamewatch.dto.CreatePlaythroughRequest;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.SessionHistory;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaythroughService {

    private final PlaythroughRepository playthroughRepository;
    private final GameRepository gameRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final HealthService healthService;

    @Transactional
    public PlaythroughDto createPlaythrough(User user, CreatePlaythroughRequest request) {
        Game game = gameRepository.findById(request.getGameId())
            .orElseThrow(() -> new RuntimeException("Game not found"));

        Playthrough playthrough = Playthrough.builder()
            .user(user)
            .game(game)
            .playthroughType(request.getPlaythroughType())
            .title(request.getTitle())
            .platform(request.getPlatform())
            .startDate(request.getStartDate())
            .isActive(false)
            .isCompleted(false)
            .isPaused(false)
            .durationSeconds(0L)
            .sessionCount(0)
            .pauseCount(0)
            .sessionStartDurationSeconds(0L)
            .build();

        playthrough = playthroughRepository.save(playthrough);
        log.info("Created playthrough for user {} and game {}", user.getId(), game.getId());

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto startPlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (playthrough.getIsActive()) {
            throw new RuntimeException("Playthrough is already active");
        }

        if (playthrough.getIsDropped()) {
            throw new RuntimeException("Cannot start a session on a dropped playthrough");
        }

        playthrough.setStartedAt(Instant.now());
        playthrough.setIsActive(true);
        
        if (!playthrough.getIsPaused()) {
            playthrough.setPauseCount(0);
            playthrough.setSessionStartDurationSeconds(playthrough.getDurationSeconds());
            playthrough.setSessionStartTime(Instant.now());
        }
        
        playthrough.setIsPaused(false);
        playthrough.setStoppedAt(null);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Started playthrough {}", playthroughId);

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto stopPlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!playthrough.getIsActive() && !playthrough.getIsPaused()) {
            if (playthrough.getDurationSeconds() == 0) {
                throw new RuntimeException("Playthrough has no recorded time");
            }
        }

        Instant stoppedAt = Instant.now();
        playthrough.setStoppedAt(stoppedAt);
        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);
        playthrough.setIsCompleted(true);
        playthrough.setIsDropped(false);
        playthrough.setEndDate(stoppedAt.atZone(java.time.ZoneId.systemDefault()).toLocalDate());
        playthrough.setLastPlayedAt(stoppedAt);

        if (playthrough.getIsActive() && playthrough.getStartedAt() != null) {
            long elapsedSeconds = Duration.between(playthrough.getStartedAt(), stoppedAt).getSeconds();
            playthrough.setDurationSeconds(playthrough.getDurationSeconds() + elapsedSeconds);
        }

        playthrough.setStartedAt(null);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Stopped playthrough {} with duration {} seconds", playthroughId, playthrough.getDurationSeconds());

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto dropPlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!playthrough.getIsActive() && !playthrough.getIsPaused()) {
            if (playthrough.getDurationSeconds() == 0) {
                throw new RuntimeException("Playthrough has no recorded time");
            }
        }

        Instant droppedAt = Instant.now();
        playthrough.setStoppedAt(droppedAt);
        playthrough.setDroppedAt(droppedAt);
        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);
        playthrough.setIsCompleted(false);
        playthrough.setIsDropped(true);
        playthrough.setEndDate(droppedAt.atZone(java.time.ZoneId.systemDefault()).toLocalDate());
        playthrough.setLastPlayedAt(droppedAt);

        if (playthrough.getIsActive() && playthrough.getStartedAt() != null) {
            long elapsedSeconds = Duration.between(playthrough.getStartedAt(), droppedAt).getSeconds();
            playthrough.setDurationSeconds(playthrough.getDurationSeconds() + elapsedSeconds);
        }

        playthrough.setStartedAt(null);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Dropped playthrough {} with duration {} seconds", playthroughId, playthrough.getDurationSeconds());

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto pickupPlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!playthrough.getIsDropped()) {
            throw new RuntimeException("Only dropped playthroughs can be picked up");
        }

        Instant pickedUpAt = Instant.now();
        playthrough.setIsDropped(false);
        playthrough.setIsPaused(false);
        playthrough.setIsActive(false);
        playthrough.setIsCompleted(false);
        playthrough.setPickedUpAt(pickedUpAt);
        playthrough.setEndDate(null);
        playthrough.setStoppedAt(null);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Picked up dropped playthrough {}", playthroughId);

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto pausePlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!playthrough.getIsActive()) {
            throw new RuntimeException("Playthrough is not active");
        }

        Instant pausedAt = Instant.now();
        
        if (playthrough.getStartedAt() != null) {
            long elapsedSeconds = Duration.between(playthrough.getStartedAt(), pausedAt).getSeconds();
            playthrough.setDurationSeconds(playthrough.getDurationSeconds() + elapsedSeconds);
        }

        playthrough.setIsActive(false);
        playthrough.setIsPaused(true);
        playthrough.setStartedAt(null);
        playthrough.setLastPlayedAt(pausedAt);
        
        playthrough.setPauseCount(playthrough.getPauseCount() + 1);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Paused playthrough {} with duration {} seconds", playthroughId, playthrough.getDurationSeconds());

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto endSessionPlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!playthrough.getIsActive() && !playthrough.getIsPaused()) {
            throw new RuntimeException("Playthrough is not active or paused");
        }

        Instant sessionStartTime = playthrough.getSessionStartTime();
        long sessionStartDuration = playthrough.getSessionStartDurationSeconds();
        
        if (playthrough.getIsActive() && playthrough.getStartedAt() != null) {
            long elapsedSeconds = Duration.between(playthrough.getStartedAt(), Instant.now()).getSeconds();
            playthrough.setDurationSeconds(playthrough.getDurationSeconds() + elapsedSeconds);
        }

        Instant endedAt;
        if (playthrough.getManualTimeSet() && sessionStartTime != null) {
            endedAt = sessionStartTime.plusSeconds(playthrough.getDurationSeconds());
            log.info("Using calculated end time for playthrough {} (manual time set): {} + {} sec = {}", 
                playthroughId, sessionStartTime, playthrough.getDurationSeconds(), endedAt);
        } else {
            endedAt = Instant.now();
        }

        long sessionDuration = playthrough.getDurationSeconds() - sessionStartDuration;
        
        int newSessionNumber = playthrough.getSessionCount() + 1;
        playthrough.setSessionCount(newSessionNumber);
        
        Long lastSessionHistoryId = null;
        if (sessionStartTime != null) {
            SessionHistory sessionHistory = SessionHistory.builder()
                .playthrough(playthrough)
                .sessionNumber(newSessionNumber)
                .durationSeconds(sessionDuration)
                .pauseCount(playthrough.getPauseCount())
                .startedAt(sessionStartTime)
                .endedAt(endedAt)
                .build();
            sessionHistory = sessionHistoryRepository.save(sessionHistory);
            lastSessionHistoryId = sessionHistory.getId();
            log.info("Saved session history for playthrough {}, session {}: duration={} sec, pauses={}", 
                playthroughId, newSessionNumber, sessionDuration, playthrough.getPauseCount());
        }

        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);
        playthrough.setStartedAt(null);
        playthrough.setSessionStartTime(null);
        playthrough.setLastPlayedAt(endedAt);
        
        playthrough.setPauseCount(0);
        
        playthrough.setManualTimeSet(false);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Ended session for playthrough {}, session count: {}", playthroughId, playthrough.getSessionCount());

        // Recalculate health metrics for today
        try {
            healthService.recalculateMetricsForDate(user, LocalDate.now());
        } catch (Exception e) {
            log.error("Failed to recalculate health metrics for user {}", user.getId(), e);
        }

        PlaythroughDto dto = mapToDto(playthrough);
        dto.setLastSessionHistoryId(lastSessionHistoryId);
        return dto;
    }

    @Transactional
    public PlaythroughDto updateDuration(User user, Long playthroughId, Long durationSeconds) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (playthrough.getIsActive()) {
            throw new RuntimeException("Cannot manually update duration while playthrough is active");
        }

        Long currentDuration = playthrough.getDurationSeconds() != null ? playthrough.getDurationSeconds() : 0L;
        if (durationSeconds > currentDuration) {
            throw new RuntimeException("Cannot set duration greater than current duration. Current: " + currentDuration + "s, Requested: " + durationSeconds + "s");
        }

        playthrough.setDurationSeconds(durationSeconds);
        playthrough.setManualTimeSet(true);
        playthrough = playthroughRepository.save(playthrough);
        log.info("Updated duration for playthrough {} to {} seconds (manual)", playthroughId, durationSeconds);

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto updatePlatform(User user, Long playthroughId, String platform) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        playthrough.setPlatform(platform);
        playthrough = playthroughRepository.save(playthrough);
        log.info("Updated platform for playthrough {} to {}", playthroughId, platform);

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto updateTitle(User user, Long playthroughId, String title) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        playthrough.setTitle(title);
        playthrough = playthroughRepository.save(playthrough);
        log.info("Updated title for playthrough {} to '{}'", playthroughId, title);

        return mapToDto(playthrough);
    }

    @Transactional(readOnly = true)
    public List<PlaythroughDto> getUserPlaythroughs(User user) {
        return playthroughRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PlaythroughDto getPlaythroughById(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));
        return mapToDto(playthrough);
    }

    @Transactional
    public void deletePlaythrough(User user, Long playthroughId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));
        
        playthroughRepository.delete(playthrough);
        log.info("Deleted playthrough {}", playthroughId);
    }

    @Transactional
    public void deleteSession(User user, Long playthroughId, Long sessionId) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        SessionHistory session = sessionHistoryRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getPlaythrough().getId().equals(playthroughId)) {
            throw new RuntimeException("Session does not belong to this playthrough");
        }

        int deletedSessionNumber = session.getSessionNumber();
        long sessionDuration = session.getDurationSeconds();
        
        sessionHistoryRepository.delete(session);
        log.info("Deleted session {} from playthrough {}", sessionId, playthroughId);

        List<SessionHistory> laterSessions = sessionHistoryRepository
            .findByPlaythroughIdOrderBySessionNumberAsc(playthroughId)
            .stream()
            .filter(s -> s.getSessionNumber() > deletedSessionNumber)
            .collect(Collectors.toList());

        for (SessionHistory laterSession : laterSessions) {
            laterSession.setSessionNumber(laterSession.getSessionNumber() - 1);
            sessionHistoryRepository.save(laterSession);
        }

        playthrough.setSessionCount(Math.max(0, playthrough.getSessionCount() - 1));
        playthrough.setDurationSeconds(Math.max(0L, playthrough.getDurationSeconds() - sessionDuration));
        
        if (playthrough.getSessionStartDurationSeconds() > playthrough.getDurationSeconds()) {
            playthrough.setSessionStartDurationSeconds(playthrough.getDurationSeconds());
        }
        
        playthroughRepository.save(playthrough);
        log.info("Updated playthrough {} after session deletion: sessions={}, duration={}", 
            playthroughId, playthrough.getSessionCount(), playthrough.getDurationSeconds());
    }

    @Transactional
    public PlaythroughDto logManualSession(User user, Long playthroughId, com.gamewatch.dto.LogManualSessionRequest request) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        if (!request.getStartedAt().isBefore(request.getEndedAt())) {
            throw new RuntimeException("Start time must be before end time");
        }

        if (playthrough.getIsActive()) {
            throw new RuntimeException("Cannot log manual session while a session is active. Please end the current session first.");
        }

        if (playthrough.getIsCompleted()) {
            throw new RuntimeException("Cannot log manual session for a completed playthrough");
        }

        if (playthrough.getIsDropped()) {
            throw new RuntimeException("Cannot log manual session for a dropped playthrough");
        }

        if (playthrough.getStartDate() != null) {
            LocalDate sessionStartDate = request.getStartedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            if (sessionStartDate.isBefore(playthrough.getStartDate())) {
                throw new RuntimeException("Cannot log session before playthrough start date: " + playthrough.getStartDate());
            }
        }

        long durationSeconds = Duration.between(request.getStartedAt(), request.getEndedAt()).getSeconds();
        
        List<SessionHistory> existingSessions = sessionHistoryRepository
            .findByPlaythroughIdOrderBySessionNumberAsc(playthroughId);
        
        int newSessionNumber = 1;
        for (SessionHistory existingSession : existingSessions) {
            if (request.getStartedAt().isBefore(existingSession.getStartedAt())) {
                break;
            }
            newSessionNumber++;
        }
        
        final int insertAtSessionNumber = newSessionNumber;
        
        List<SessionHistory> sessionsToRenumber = existingSessions.stream()
            .filter(s -> s.getSessionNumber() >= insertAtSessionNumber)
            .sorted((a, b) -> Integer.compare(b.getSessionNumber(), a.getSessionNumber()))
            .collect(Collectors.toList());
        
        for (SessionHistory existingSession : sessionsToRenumber) {
            existingSession.setSessionNumber(existingSession.getSessionNumber() + 1);
            sessionHistoryRepository.saveAndFlush(existingSession);
        }
        
        SessionHistory newSession = SessionHistory.builder()
            .playthrough(playthrough)
            .sessionNumber(insertAtSessionNumber)
            .durationSeconds(durationSeconds)
            .pauseCount(0)
            .startedAt(request.getStartedAt())
            .endedAt(request.getEndedAt())
            .build();
        sessionHistoryRepository.saveAndFlush(newSession);
        
        playthrough.setSessionCount(playthrough.getSessionCount() + 1);
        playthrough.setDurationSeconds(playthrough.getDurationSeconds() + durationSeconds);
        
        if (playthrough.getLastPlayedAt() == null || request.getEndedAt().isAfter(playthrough.getLastPlayedAt())) {
            playthrough.setLastPlayedAt(request.getEndedAt());
        }
        
        playthrough = playthroughRepository.save(playthrough);
        log.info("Logged manual session for playthrough {}: session #{}, duration={} sec", 
            playthroughId, insertAtSessionNumber, durationSeconds);

        return mapToDto(playthrough);
    }

    @Transactional
    public PlaythroughDto importSessions(User user, Long targetPlaythroughId, Long sourcePlaythroughId) {
        Playthrough targetPlaythrough = playthroughRepository.findByIdAndUserId(targetPlaythroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Target playthrough not found or access denied"));

        if (!"100%".equals(targetPlaythrough.getPlaythroughType()) && !"100_percent".equals(targetPlaythrough.getPlaythroughType())) {
            throw new RuntimeException("Can only import sessions to a 100% playthrough");
        }

        if (targetPlaythrough.getImportedFromPlaythrough() != null) {
            throw new RuntimeException("This 100% playthrough has already imported from another playthrough. You can only import once.");
        }

        Playthrough sourcePlaythrough = playthroughRepository.findByIdAndUserId(sourcePlaythroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Source playthrough not found or access denied"));

        if (!targetPlaythrough.getGame().getId().equals(sourcePlaythrough.getGame().getId())) {
            throw new RuntimeException("Cannot import sessions from a different game");
        }

        if (targetPlaythrough.getIsActive()) {
            throw new RuntimeException("Cannot import sessions while target playthrough is active");
        }

        if (sourcePlaythrough.getDurationSeconds() == null || sourcePlaythrough.getDurationSeconds() == 0) {
            throw new RuntimeException("Source playthrough has no playtime to import");
        }

        long previousDuration = targetPlaythrough.getDurationSeconds() != null ? targetPlaythrough.getDurationSeconds() : 0L;
        long importedDuration = sourcePlaythrough.getDurationSeconds();
        targetPlaythrough.setDurationSeconds(previousDuration + importedDuration);

        targetPlaythrough.setImportedFromPlaythrough(sourcePlaythrough);
        targetPlaythrough.setImportedDurationSeconds(importedDuration);

        if (sourcePlaythrough.getLastPlayedAt() != null && 
            (targetPlaythrough.getLastPlayedAt() == null || 
             sourcePlaythrough.getLastPlayedAt().isAfter(targetPlaythrough.getLastPlayedAt()))) {
            targetPlaythrough.setLastPlayedAt(sourcePlaythrough.getLastPlayedAt());
        }

        targetPlaythrough = playthroughRepository.save(targetPlaythrough);
        log.info("Imported timer value ({} seconds) from playthrough {} to playthrough {} (one-time import)", 
            importedDuration, sourcePlaythroughId, targetPlaythroughId);

        return mapToDto(targetPlaythrough);
    }

    private PlaythroughDto mapToDto(Playthrough playthrough) {
        return PlaythroughDto.builder()
            .id(playthrough.getId())
            .gameId(playthrough.getGame().getId())
            .gameName(playthrough.getGame().getName())
            .gameBannerImageUrl(playthrough.getGame().getBannerImageUrl())
            .playthroughType(playthrough.getPlaythroughType())
            .title(playthrough.getTitle())
            .platform(playthrough.getPlatform())
            .startedAt(playthrough.getStartedAt())
            .stoppedAt(playthrough.getStoppedAt())
            .durationSeconds(playthrough.getDurationSeconds())
            .isActive(playthrough.getIsActive())
            .isCompleted(playthrough.getIsCompleted())
            .isDropped(playthrough.getIsDropped())
            .isPaused(playthrough.getIsPaused())
            .startDate(playthrough.getStartDate())
            .endDate(playthrough.getEndDate())
            .sessionCount(playthrough.getSessionCount())
            .lastPlayedAt(playthrough.getLastPlayedAt())
            .droppedAt(playthrough.getDroppedAt())
            .pickedUpAt(playthrough.getPickedUpAt())
            .createdAt(playthrough.getCreatedAt())
            .importedFromPlaythroughId(playthrough.getImportedFromPlaythrough() != null ? playthrough.getImportedFromPlaythrough().getId() : null)
            .importedDurationSeconds(playthrough.getImportedDurationSeconds())
            .build();
    }
}
