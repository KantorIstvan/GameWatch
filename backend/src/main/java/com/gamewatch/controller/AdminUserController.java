package com.gamewatch.controller;

import com.gamewatch.dto.AdminAuditLogDto;
import com.gamewatch.dto.AdminUserSummaryDto;
import com.gamewatch.dto.PagedResponseDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.AdminAuditService;
import com.gamewatch.service.AdminModerationService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private static final int MAX_PAGE_SIZE = 100;

    private final AdminUserService adminUserService;
    private final AdminModerationService adminModerationService;
    private final AdminAuditService adminAuditService;
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
}
