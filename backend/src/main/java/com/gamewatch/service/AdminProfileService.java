package com.gamewatch.service;

import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.AdminAction;
import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thin pass-throughs to UserService's own field updates, which already take an explicit
 * User parameter rather than resolving "current user" from the caller's own JWT - so
 * they're reusable as-is for an arbitrary target, with only an audit-log write added on
 * top. No new request DTOs: this reuses ProfileSettingsDto verbatim.
 */
@Service
@RequiredArgsConstructor
public class AdminProfileService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final AdminAuditService adminAuditService;

    @Transactional
    public ProfileSettingsDto updateProfile(User admin, Long targetId, ProfileSettingsDto request) {
        User target = getTarget(targetId);
        ProfileSettingsDto result = userService.updateProfileSettings(target, request);
        adminAuditService.record(admin, target, AdminAction.PROFILE_EDIT,
            "Edited profile settings for " + AdminAuditService.identify(target));
        return result;
    }

    @Transactional
    public User updateAge(User admin, Long targetId, Integer age) {
        User target = getTarget(targetId);
        User updated = userService.updateAge(target, age);
        adminAuditService.record(admin, target, AdminAction.PROFILE_EDIT,
            "Set age to " + age + " for " + AdminAuditService.identify(target));
        return updated;
    }

    @Transactional
    public User updateTimezone(User admin, Long targetId, String timezone) {
        User target = getTarget(targetId);
        User updated = userService.updateTimezone(target, timezone);
        adminAuditService.record(admin, target, AdminAction.PROFILE_EDIT,
            "Set timezone to " + timezone + " for " + AdminAuditService.identify(target));
        return updated;
    }

    @Transactional
    public User updateFirstDayOfWeek(User admin, Long targetId, String firstDayOfWeek) {
        User target = getTarget(targetId);
        User updated = userService.updateFirstDayOfWeek(target, firstDayOfWeek);
        adminAuditService.record(admin, target, AdminAction.PROFILE_EDIT,
            "Set first day of week to " + firstDayOfWeek + " for " + AdminAuditService.identify(target));
        return updated;
    }

    private User getTarget(Long targetId) {
        return userRepository.findById(targetId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
