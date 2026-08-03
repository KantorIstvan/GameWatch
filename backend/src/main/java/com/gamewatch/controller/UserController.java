package com.gamewatch.controller;

import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
     * Lets the settings form say whether a handle is free before the user commits to it.
     * Advisory only - the claim itself is still what decides, since another account can
     * take the handle between this call and the save.
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
