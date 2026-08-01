package com.gamewatch.controller;

import com.gamewatch.dto.*;
import com.gamewatch.entity.User;
import com.gamewatch.service.HealthService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Year;
import java.util.Map;

@RestController
@RequestMapping("/user-health")
@RequiredArgsConstructor
public class UserHealthController {

    private final HealthService healthService;
    private final UserService userService;

    @GetMapping("/dashboard")
    public ResponseEntity<HealthDashboardDto> getHealthDashboard(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        HealthDashboardDto dashboard = healthService.getHealthDashboard(user);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/heatmap")
    public ResponseEntity<Map<LocalDate, Integer>> getYearlyHeatmap(
            Authentication authentication,
            @RequestParam(required = false) Integer year) {
        User user = userService.getOrCreateUser(authentication);
        int resolvedYear = year != null ? year : Year.now().getValue();
        Map<LocalDate, Integer> heatmap = healthService.getYearlyHeatmap(user, resolvedYear);
        return ResponseEntity.ok(heatmap);
    }

    @GetMapping("/settings")
    public ResponseEntity<HealthSettingsDto> getHealthSettings(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        HealthSettingsDto settings = healthService.getHealthSettings(user);
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings")
    public ResponseEntity<HealthSettingsDto> updateHealthSettings(
            Authentication authentication,
            @RequestBody HealthSettingsDto settingsDto) {
        User user = userService.getOrCreateUser(authentication);
        HealthSettingsDto updated = healthService.updateHealthSettings(user, settingsDto);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/mood")
    public ResponseEntity<MoodEntryDto> submitMood(
            Authentication authentication,
            @RequestBody SubmitMoodRequest request) {
        User user = userService.getOrCreateUser(authentication);
        MoodEntryDto moodEntry = healthService.submitMood(user, request);
        return ResponseEntity.ok(moodEntry);
    }
}
