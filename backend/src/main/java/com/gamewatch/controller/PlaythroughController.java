package com.gamewatch.controller;

import com.gamewatch.dto.CreatePlaythroughRequest;
import com.gamewatch.dto.LogManualSessionRequest;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.dto.UpdateDurationRequest;
import com.gamewatch.dto.UpdatePlatformRequest;
import com.gamewatch.dto.UpdateTitleRequest;
import com.gamewatch.entity.User;
import com.gamewatch.service.PlaythroughService;
import com.gamewatch.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/playthroughs")
@RequiredArgsConstructor
public class PlaythroughController {

    private final PlaythroughService playthroughService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<PlaythroughDto> createPlaythrough(
            Authentication authentication,
            @Valid @RequestBody CreatePlaythroughRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.createPlaythrough(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(playthrough);
    }

    @GetMapping
    public ResponseEntity<List<PlaythroughDto>> getUserPlaythroughs(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        List<PlaythroughDto> playthroughs = playthroughService.getUserPlaythroughs(user);
        return ResponseEntity.ok(playthroughs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlaythroughDto> getPlaythroughById(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.getPlaythroughById(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<PlaythroughDto> startPlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.startPlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<PlaythroughDto> stopPlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.stopPlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/drop")
    public ResponseEntity<PlaythroughDto> dropPlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.dropPlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/pickup")
    public ResponseEntity<PlaythroughDto> pickupPlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.pickupPlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<PlaythroughDto> pausePlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.pausePlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/end-session")
    public ResponseEntity<PlaythroughDto> endSessionPlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.endSessionPlaythrough(user, id);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/duration")
    public ResponseEntity<PlaythroughDto> updateDuration(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody UpdateDurationRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.updateDuration(user, id, request.getDurationSeconds());
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/platform")
    public ResponseEntity<PlaythroughDto> updatePlatform(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody UpdatePlatformRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.updatePlatform(user, id, request.getPlatform());
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/title")
    public ResponseEntity<PlaythroughDto> updateTitle(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody UpdateTitleRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.updateTitle(user, id, request.getTitle());
        return ResponseEntity.ok(playthrough);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlaythrough(
            Authentication authentication,
            @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        playthroughService.deletePlaythrough(user, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{playthroughId}/sessions/{sessionId}")
    public ResponseEntity<Void> deleteSession(
            Authentication authentication,
            @PathVariable Long playthroughId,
            @PathVariable Long sessionId) {
        User user = userService.getOrCreateUser(authentication);
        playthroughService.deleteSession(user, playthroughId, sessionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/log-manual-session")
    public ResponseEntity<PlaythroughDto> logManualSession(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody LogManualSessionRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.logManualSession(user, id, request);
        return ResponseEntity.ok(playthrough);
    }

    @PostMapping("/{id}/import-sessions")
    public ResponseEntity<PlaythroughDto> importSessions(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody com.gamewatch.dto.ImportSessionsRequest request) {
        User user = userService.getOrCreateUser(authentication);
        PlaythroughDto playthrough = playthroughService.importSessions(user, id, request.getSourcePlaythroughId());
        return ResponseEntity.ok(playthrough);
    }
}
