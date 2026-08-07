package com.gamewatch.controller;

import com.gamewatch.dto.AdminAuditLogDto;
import com.gamewatch.dto.AdminUpdatePlaythroughRequest;
import com.gamewatch.dto.AdminUserSummaryDto;
import com.gamewatch.dto.PagedResponseDto;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.AdminAuditService;
import com.gamewatch.service.AdminModerationService;
import com.gamewatch.service.AdminPlaythroughService;
import com.gamewatch.service.AdminProfileService;
import com.gamewatch.service.AdminUserService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminUserService adminUserService;
    private final AdminModerationService adminModerationService;
    private final AdminAuditService adminAuditService;
    private final AdminProfileService adminProfileService;
    private final AdminPlaythroughService adminPlaythroughService;
    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('admin:users:read')")
    public ResponseEntity<PagedResponseDto<AdminUserSummaryDto>> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return ResponseEntity.ok(adminUserService.searchUsers(query, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('admin:users:read')")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.getUserById(id));
    }

    @PostMapping("/{id}/block")
    @PreAuthorize("hasAuthority('admin:users:block')")
    public ResponseEntity<Void> blockUser(Authentication authentication, @PathVariable Long id) {
        adminModerationService.blockUser(userService.getOrCreateUser(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unblock")
    @PreAuthorize("hasAuthority('admin:users:block')")
    public ResponseEntity<Void> unblockUser(Authentication authentication, @PathVariable Long id) {
        adminModerationService.unblockUser(userService.getOrCreateUser(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/send-password-reset")
    @PreAuthorize("hasAuthority('admin:users:reset-password')")
    public ResponseEntity<Void> sendPasswordReset(Authentication authentication, @PathVariable Long id) {
        adminModerationService.sendPasswordResetEmail(userService.getOrCreateUser(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('admin:users:delete')")
    public ResponseEntity<Void> deleteUser(Authentication authentication, @PathVariable Long id) {
        adminModerationService.deleteUser(userService.getOrCreateUser(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/audit-log")
    @PreAuthorize("hasAuthority('admin:users:read')")
    public ResponseEntity<PagedResponseDto<AdminAuditLogDto>> getAuditLog(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return ResponseEntity.ok(adminAuditService.getLogForUser(id, pageable));
    }

    @PutMapping("/{id}/profile")
    @PreAuthorize("hasAuthority('admin:users:write')")
    public ResponseEntity<ProfileSettingsDto> updateProfile(
            Authentication authentication, @PathVariable Long id, @RequestBody ProfileSettingsDto request) {
        return ResponseEntity.ok(adminProfileService.updateProfile(userService.getOrCreateUser(authentication), id, request));
    }

    @PutMapping("/{id}/age")
    @PreAuthorize("hasAuthority('admin:users:write')")
    public ResponseEntity<User> updateAge(
            Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Integer> request) {
        return ResponseEntity.ok(
            adminProfileService.updateAge(userService.getOrCreateUser(authentication), id, request.get("age")));
    }

    @PutMapping("/{id}/timezone")
    @PreAuthorize("hasAuthority('admin:users:write')")
    public ResponseEntity<User> updateTimezone(
            Authentication authentication, @PathVariable Long id, @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(
            adminProfileService.updateTimezone(userService.getOrCreateUser(authentication), id, request.get("timezone")));
    }

    @PutMapping("/{id}/first-day-of-week")
    @PreAuthorize("hasAuthority('admin:users:write')")
    public ResponseEntity<User> updateFirstDayOfWeek(
            Authentication authentication, @PathVariable Long id, @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(adminProfileService.updateFirstDayOfWeek(
            userService.getOrCreateUser(authentication), id, request.get("firstDayOfWeek")));
    }

    @GetMapping("/{id}/playthroughs")
    @PreAuthorize("hasAuthority('admin:users:read')")
    public ResponseEntity<List<PlaythroughDto>> getPlaythroughs(@PathVariable Long id) {
        return ResponseEntity.ok(adminPlaythroughService.getPlaythroughsForUser(id));
    }

    @PutMapping("/{id}/playthroughs/{playthroughId}")
    @PreAuthorize("hasAuthority('admin:users:write')")
    public ResponseEntity<PlaythroughDto> updatePlaythrough(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable Long playthroughId,
            @RequestBody AdminUpdatePlaythroughRequest request) {
        return ResponseEntity.ok(adminPlaythroughService.updatePlaythrough(
            userService.getOrCreateUser(authentication), id, playthroughId, request));
    }
}
