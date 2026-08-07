package com.gamewatch.service;

import com.gamewatch.dto.AdminUpdatePlaythroughRequest;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.entity.AdminAction;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.PlaythroughRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

/**
 * An admin override, not a reuse of PlaythroughService's own update methods - those are
 * deliberately guarded (updateDuration refuses to decrease time or edit an active
 * playthrough) for a normal user, and an admin fixing a runaway timer needs exactly the
 * operations those guards exist to prevent. None of that validation is reproduced here.
 */
@Service
@RequiredArgsConstructor
public class AdminPlaythroughService {

    private final PlaythroughRepository playthroughRepository;
    private final PlaythroughService playthroughService;
    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<PlaythroughDto> getPlaythroughsForUser(Long targetUserId) {
        return playthroughRepository.findByUserIdOrderByCreatedAtDesc(targetUserId)
            .stream()
            .map(playthroughService::mapToDto)
            .collect(Collectors.toList());
    }

    @Transactional
    public PlaythroughDto updatePlaythrough(
            User admin, Long targetUserId, Long playthroughId, AdminUpdatePlaythroughRequest request) {
        Playthrough playthrough = playthroughRepository.findById(playthroughId)
            .orElseThrow(() -> new RuntimeException("Playthrough not found"));

        // The URL carries both ids independently - this guards against them disagreeing
        // (a stale link, a typo, a tampered request) silently editing the wrong person's
        // data while the audit trail records the id the URL claimed instead.
        if (!playthrough.getUser().getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Playthrough does not belong to the specified user");
        }

        boolean wasActive = Boolean.TRUE.equals(playthrough.getIsActive());

        if (request.getTitle() != null) {
            String trimmed = request.getTitle().trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("Playthrough title is required");
            }
            playthrough.setTitle(trimmed);
        }
        if (request.getPlatform() != null) {
            playthrough.setPlatform(request.getPlatform());
        }
        if (request.getDurationSeconds() != null) {
            long newDuration = Math.max(0L, request.getDurationSeconds());
            playthrough.setDurationSeconds(newDuration);
            playthrough.setManualTimeSet(true);

            // Editing the duration of an ACTIVE playthrough would otherwise corrupt two
            // things that both read durationSeconds - sessionStartDurationSeconds as their
            // baseline: the owning user's live-ticking timer (SessionTimerContext on the
            // frontend adds elapsed-since-startedAt to that baseline, with no push/poll to
            // learn an admin touched it) and the session_history row
            // PlaythroughService.closeOpenSession eventually writes from the same baseline
            // plus sessionStartTime. Resetting all three together makes this edit the new
            // "session start point" for both, instead of leaving either one to compute a
            // wrong, possibly negative, delta.
            if (wasActive) {
                Instant now = Instant.now();
                playthrough.setSessionStartDurationSeconds(newDuration);
                playthrough.setStartedAt(now);
                playthrough.setSessionStartTime(now);
            }
        }
        // No isActive/isPaused here by design (see AdminUpdatePlaythroughRequest) - moving
        // a playthrough to a terminal state still has to leave it not-live, though, so
        // isActive/isPaused are force-cleared alongside either terminal flag rather than
        // left for the admin to forget and end up with a playthrough that is both
        // "completed" and "currently running".
        if (request.getIsCompleted() != null) {
            playthrough.setIsCompleted(request.getIsCompleted());
            if (Boolean.TRUE.equals(request.getIsCompleted())) {
                playthrough.setIsActive(false);
                playthrough.setIsPaused(false);
            }
        }
        if (request.getIsDropped() != null) {
            playthrough.setIsDropped(request.getIsDropped());
            if (Boolean.TRUE.equals(request.getIsDropped())) {
                playthrough.setIsActive(false);
                playthrough.setIsPaused(false);
            }
        }
        if (request.getStartDate() != null) {
            playthrough.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            playthrough.setEndDate(request.getEndDate());
        }

        playthrough = playthroughRepository.save(playthrough);
        adminAuditService.record(admin, playthrough.getUser(), AdminAction.PLAYTHROUGH_EDIT,
            "Edited playthrough " + playthroughId + " (\"" + playthrough.getTitle() + "\")");

        return playthroughService.mapToDto(playthrough);
    }
}
