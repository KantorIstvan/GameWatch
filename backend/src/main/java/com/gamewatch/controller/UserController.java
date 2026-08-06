package com.gamewatch.controller;

import com.gamewatch.dto.OnboardingRequestDto;
import com.gamewatch.dto.OnboardingStatusDto;
import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.UserAvatarService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserAvatarService userAvatarService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me/age")
    public ResponseEntity<User> updateAge(
            Authentication authentication, 
            @RequestBody Map<String, Integer> request) {
        User user = userService.getOrCreateUser(authentication);
        User updated = userService.updateAge(user, request.get("age"));
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/me/timezone")
    public ResponseEntity<User> updateTimezone(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        User user = userService.getOrCreateUser(authentication);
        User updated = userService.updateTimezone(user, request.get("timezone"));
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/me/first-day-of-week")
    public ResponseEntity<User> updateFirstDayOfWeek(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        User user = userService.getOrCreateUser(authentication);
        User updated = userService.updateFirstDayOfWeek(user, request.get("firstDayOfWeek"));
        return ResponseEntity.ok(updated);
    }

    /**
     * Whether this account still has to choose a handle and a display name, plus what to
     * prefill the form with. The client blocks every other route on this answer, so it is
     * the first call a freshly signed-in session makes.
     */
    @GetMapping("/me/onboarding")
    public ResponseEntity<OnboardingStatusDto> getOnboardingStatus(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(userService.getOnboardingStatus(user));
    }

    /**
     * Claims both mandatory fields at once. Validated here as well as in the form - the UI
     * check is a convenience, this one is the rule.
     */
    @PostMapping("/me/onboarding")
    public ResponseEntity<OnboardingStatusDto> completeOnboarding(
            Authentication authentication,
            @RequestBody OnboardingRequestDto request) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(userService.completeOnboarding(user, request));
    }

    @GetMapping("/me/profile")
    public ResponseEntity<ProfileSettingsDto> getProfileSettings(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(userService.getProfileSettings(user));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<ProfileSettingsDto> updateProfileSettings(
            Authentication authentication,
            @RequestBody ProfileSettingsDto request) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(userService.updateProfileSettings(user, request));
    }

    /**
     * Replaces the account's profile picture.
     *
     * Returns the URL the picture is now served from so the caller can swap the image
     * without refetching the whole profile.
     */
    @PostMapping("/me/avatar")
    public ResponseEntity<Map<String, String>> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(Map.of("profilePictureUrl", userAvatarService.upload(user, file)));
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<Void> deleteAvatar(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        userAvatarService.delete(user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lets the onboarding and settings forms say whether a handle is free before the user
     * commits to it. Advisory only - the claim itself is still what decides, since another
     * account can take the handle between this call and the save.
     */
    @GetMapping("/me/handle-available")
    public ResponseEntity<Map<String, Boolean>> isHandleAvailable(
            Authentication authentication,
            @RequestParam String handle) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(Map.of("available", userService.isHandleAvailable(user, handle)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        userService.deleteAccount(user);
        return ResponseEntity.noContent().build();
    }
}
