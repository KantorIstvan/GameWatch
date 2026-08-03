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
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.util.TimezoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaythroughService {

    private final PlaythroughRepository playthroughRepository;
    private final GameRepository gameRepository;
    private final UserGameRepository userGameRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final HealthService healthService;
    private final ColorExtractionService colorExtractionService;

    @Transactional
    public PlaythroughDto createPlaythrough(User user, CreatePlaythroughRequest request) {
        Game game = gameRepository.findById(request.getGameId())
            .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!userGameRepository.existsByUserAndGame(user, game)) {
            throw new RuntimeException("Game not found");
        }

        // Validate start date is not in the future
        if (request.getStartDate() != null && request.getStartDate().isAfter(LocalDate.now(TimezoneUtils.resolveZone(user)))) {
            throw new RuntimeException("Cannot set a future start date for a playthrough");
        }

        // Extract dominant colors from game banner
        String[] colors = null;
        if (game.getBannerImageUrl() != null && !game.getBannerImageUrl().isEmpty()) {
            colors = colorExtractionService.extractDominantColors(game.getBannerImageUrl());
        }

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
            .dominantColor1(colors != null && colors.length > 0 ? colors[0] : null)
            .dominantColor2(colors != null && colors.length > 1 ? colors[1] : null)
            .build();

        playthrough = playthroughRepository.save(playthrough);
        log.info("Created playthrough for user {} and game {} with colors {} and {}", 
                 user.getId(), game.getId(), playthrough.getDominantColor1(), playthrough.getDominantColor2());

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

        // Bank and record the in-flight session before the playthrough becomes terminal.
        // This must happen first: it is what adds any still-running time to the total, and
        // the old code did the equivalent check *after* clearing isActive, so the branch
        // could never fire and a running session's time was dropped on the floor.
        SessionHistory closedSession = closeOpenSession(playthrough);

        Instant stoppedAt = Instant.now();
        playthrough.setStoppedAt(stoppedAt);
        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);
        playthrough.setIsCompleted(true);
        playthrough.setIsDropped(false);
        // Finishing a previously-dropped playthrough clears the drop rather than leaving a
        // record that claims to be both completed and dropped at once.
        playthrough.setDroppedAt(null);
        playthrough.setEndDate(stoppedAt.atZone(TimezoneUtils.resolveZone(user)).toLocalDate());
        playthrough.setLastPlayedAt(stoppedAt);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Stopped playthrough {} with duration {} seconds", playthroughId, playthrough.getDurationSeconds());

        recalculateHealthForClosedSession(user, closedSession);

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

        // Same as finishing: the session the user was part-way through still happened and
        // still has to be recorded, even though the playthrough is being abandoned.
        SessionHistory closedSession = closeOpenSession(playthrough);

        Instant droppedAt = Instant.now();
        playthrough.setStoppedAt(droppedAt);
        playthrough.setDroppedAt(droppedAt);
        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);
        playthrough.setIsCompleted(false);
        playthrough.setIsDropped(true);
        playthrough.setEndDate(droppedAt.atZone(TimezoneUtils.resolveZone(user)).toLocalDate());
        playthrough.setLastPlayedAt(droppedAt);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Dropped playthrough {} with duration {} seconds", playthroughId, playthrough.getDurationSeconds());

        recalculateHealthForClosedSession(user, closedSession);

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
        // Left set, droppedAt outlived the drop it recorded, leaving a playthrough that
        // reports itself as not dropped while still carrying the moment it was dropped.
        playthrough.setDroppedAt(null);

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

        SessionHistory closedSession = closeOpenSession(playthrough);

        playthrough.setIsActive(false);
        playthrough.setIsPaused(false);

        playthrough = playthroughRepository.save(playthrough);
        log.info("Ended session for playthrough {}, session count: {}", playthroughId, playthrough.getSessionCount());

        recalculateHealthForClosedSession(user, closedSession);

        PlaythroughDto dto = mapToDto(playthrough);
        dto.setLastSessionHistoryId(closedSession != null ? closedSession.getId() : null);
        return dto;
    }

    /**
     * Closes whatever session is currently open on this playthrough: banks any
     * still-running time into the total, writes the session_history row, and clears the
     * in-flight session fields. Returns the row it wrote, or null when there was no open
     * session to close.
     *
     * Every terminal transition — end session, finish, drop — must go through here.
     * Finish and drop used to skip it entirely, which left a paused session's time inside
     * durationSeconds but with no session_history row behind it. That time was then
     * invisible to the per-game session list, the calendar and every health metric (all of
     * which read session_history), while the period statistics saw a playthrough with no
     * session in the window and fell back to counting its entire lifetime playtime.
     */
    private SessionHistory closeOpenSession(Playthrough playthrough) {
        if (Boolean.TRUE.equals(playthrough.getIsActive()) && playthrough.getStartedAt() != null) {
            long elapsedSeconds = Duration.between(playthrough.getStartedAt(), Instant.now()).getSeconds();
            playthrough.setDurationSeconds(playthrough.getDurationSeconds() + elapsedSeconds);
        }
        playthrough.setStartedAt(null);

        Instant sessionStartTime = playthrough.getSessionStartTime();
        if (sessionStartTime == null) {
            // Nothing was ever opened on the timer — e.g. a playthrough whose time only
            // came from manual logging. There is no session to write, so sessionCount must
            // not move either; it used to be incremented here regardless, which drifted it
            // permanently out of step with the actual number of session_history rows.
            playthrough.setLastPlayedAt(Instant.now());
            return null;
        }

        long sessionStartDuration = playthrough.getSessionStartDurationSeconds() != null
            ? playthrough.getSessionStartDurationSeconds()
            : 0L;
        long sessionDuration = Math.max(0L, playthrough.getDurationSeconds() - sessionStartDuration);

        // When the duration was hand-edited mid-session the wall clock no longer agrees with
        // the recorded time, so the end is derived from the start instead. It must be
        // derived from *this session's* duration: deriving it from the playthrough's
        // lifetime total put the end of a session on a 50-hour playthrough two days into
        // the future, which in turn misfiled it on the calendar, the timeline and whichever
        // day's health metrics it landed on.
        Instant endedAt;
        if (Boolean.TRUE.equals(playthrough.getManualTimeSet())) {
            endedAt = sessionStartTime.plusSeconds(sessionDuration);
            log.info("Using calculated end time for playthrough {} (manual time set): {} + {} sec = {}",
                playthrough.getId(), sessionStartTime, sessionDuration, endedAt);
        } else {
            endedAt = Instant.now();
        }

        int newSessionNumber = playthrough.getSessionCount() + 1;
        playthrough.setSessionCount(newSessionNumber);

        SessionHistory sessionHistory = sessionHistoryRepository.save(SessionHistory.builder()
            .playthrough(playthrough)
            .sessionNumber(newSessionNumber)
            .durationSeconds(sessionDuration)
            .pauseCount(playthrough.getPauseCount())
            .startedAt(sessionStartTime)
            .endedAt(endedAt)
            .build());
        log.info("Saved session history for playthrough {}, session {}: duration={} sec, pauses={}",
            playthrough.getId(), newSessionNumber, sessionDuration, playthrough.getPauseCount());

        playthrough.setSessionStartTime(null);
        playthrough.setPauseCount(0);
        playthrough.setManualTimeSet(false);
        playthrough.setLastPlayedAt(endedAt);

        return sessionHistory;
    }

    /**
     * Recomputes the health metrics for the day the closed session actually ended on,
     * rather than for "today" — finishing on Monday a session that ran on Sunday night
     * has to update Sunday.
     */
    private void recalculateHealthForClosedSession(User user, SessionHistory closedSession) {
        if (closedSession == null) {
            return;
        }
        try {
            LocalDate sessionDate = closedSession.getEndedAt()
                .atZone(TimezoneUtils.resolveZone(user))
                .toLocalDate();
            healthService.recalculateMetricsForDate(user, sessionDate);
        } catch (Exception e) {
            log.error("Failed to recalculate health metrics for user {}", user.getId(), e);
        }
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

        // Capture the days this playthrough contributed to before the cascade takes its
        // sessions with it, so their metrics can be rebuilt from what remains.
        Set<LocalDate> affectedDates = sessionDatesOf(playthroughId, user);

        playthroughRepository.delete(playthrough);
        playthroughRepository.flush();
        log.info("Deleted playthrough {}", playthroughId);

        recalculateHealthForDates(user, affectedDates);
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
        LocalDate deletedSessionDate = session.getStartedAt()
            .atZone(TimezoneUtils.resolveZone(user))
            .toLocalDate();

        sessionHistoryRepository.delete(session);
        sessionHistoryRepository.flush();
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

        // Without this the deleted hours stayed in that day's health metrics forever: the
        // heatmap, the weekly totals and the score all kept counting a session that no
        // longer existed.
        recalculateHealthForDates(user, Set.of(deletedSessionDate));
    }

    /**
     * The distinct days a playthrough's sessions are attributed to, in the user's zone.
     */
    private Set<LocalDate> sessionDatesOf(Long playthroughId, User user) {
        ZoneId zone = TimezoneUtils.resolveZone(user);
        return sessionHistoryRepository.findByPlaythroughIdOrderBySessionNumberAsc(playthroughId)
            .stream()
            .map(s -> s.getStartedAt().atZone(zone).toLocalDate())
            .collect(Collectors.toSet());
    }

    private void recalculateHealthForDates(User user, Set<LocalDate> dates) {
        for (LocalDate date : dates) {
            try {
                healthService.recalculateMetricsForDate(user, date);
            } catch (Exception e) {
                log.error("Failed to recalculate health metrics for user {} on {}", user.getId(), date, e);
            }
        }
    }

    @Transactional
    public PlaythroughDto logManualSession(User user, Long playthroughId, com.gamewatch.dto.LogManualSessionRequest request) {
        Playthrough playthrough = playthroughRepository.findByIdAndUserId(playthroughId, user.getId())
            .orElseThrow(() -> new RuntimeException("Playthrough not found or access denied"));

        // Validate times are not in the future
        Instant now = Instant.now();
        if (request.getStartedAt().isAfter(now)) {
            throw new RuntimeException("Start time cannot be in the future");
        }
        if (request.getEndedAt().isAfter(now)) {
            throw new RuntimeException("End time cannot be in the future");
        }

        if (!request.getStartedAt().isBefore(request.getEndedAt())) {
            throw new RuntimeException("Start time must be before end time");
        }

        // An open session on the timer has no session_history row yet, so it cannot be
        // overlap-checked against. Requiring it to be closed first keeps the check honest.
        if (playthrough.getIsActive() || playthrough.getIsPaused()) {
            throw new RuntimeException("Cannot log manual session while a session is open. Please end the current session first.");
        }

        // Completed and dropped playthroughs deliberately still accept manual sessions.
        // Remembering forgotten time is exactly what this feature is for, and it is usually
        // remembered *after* finishing - refusing it left those hours with nowhere to go at
        // all, since duration edits can only ever revise time downwards.
        ZoneId zone = TimezoneUtils.resolveZone(user);

        if (playthrough.getStartDate() != null) {
            LocalDate sessionStartDate = request.getStartedAt().atZone(zone).toLocalDate();
            if (sessionStartDate.isBefore(playthrough.getStartDate())) {
                throw new RuntimeException("Cannot log session before playthrough start date: " + playthrough.getStartDate());
            }
        }

        long durationSeconds = Duration.between(request.getStartedAt(), request.getEndedAt()).getSeconds();

        List<SessionHistory> existingSessions = sessionHistoryRepository
            .findByPlaythroughIdOrderBySessionNumberAsc(playthroughId);

        // Nothing stopped the same evening being logged five times over. Each copy counted
        // in full towards the playthrough total, the day's health hours and the period
        // statistics, and there was no way to tell the duplicates apart afterwards.
        for (SessionHistory existing : existingSessions) {
            boolean overlaps = request.getStartedAt().isBefore(existing.getEndedAt())
                && existing.getStartedAt().isBefore(request.getEndedAt());
            if (overlaps) {
                throw new RuntimeException(
                    "This session overlaps one already recorded for this playthrough ("
                        + existing.getStartedAt() + " to " + existing.getEndedAt() + ")");
            }
        }

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

        // Backfilling onto an already-finished playthrough can land after the recorded end,
        // which would leave a session sitting outside its own playthrough on the timeline.
        LocalDate sessionEndDate = request.getEndedAt().atZone(zone).toLocalDate();
        if (playthrough.getEndDate() != null && sessionEndDate.isAfter(playthrough.getEndDate())) {
            playthrough.setEndDate(sessionEndDate);
        }

        playthrough = playthroughRepository.save(playthrough);
        log.info("Logged manual session for playthrough {}: session #{}, duration={} sec",
            playthroughId, insertAtSessionNumber, durationSeconds);

        // Recalculate health metrics for the day the session was logged
        try {
            LocalDate sessionDate = request.getEndedAt().atZone(zone).toLocalDate();
            healthService.recalculateMetricsForDate(user, sessionDate);
        } catch (Exception e) {
            log.error("Failed to recalculate health metrics for user {}", user.getId(), e);
        }

        // lastSessionHistoryId lets the frontend prompt for mood the same way it does
        // after an automatically-tracked session, instead of fabricating a mood rating.
        PlaythroughDto dto = mapToDto(playthrough);
        dto.setLastSessionHistoryId(newSession.getId());
        return dto;
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
            .sessionStartTime(playthrough.getSessionStartTime())
            .sessionStartDurationSeconds(playthrough.getSessionStartDurationSeconds())
            .dominantColor1(playthrough.getDominantColor1())
            .dominantColor2(playthrough.getDominantColor2())
            .build();
    }
}
