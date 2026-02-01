package com.gamewatch.controller;

import com.gamewatch.dto.BackupDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.BackupService;
import com.gamewatch.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/backup")
@RequiredArgsConstructor
@Slf4j
public class BackupController {

    private final BackupService backupService;
    private final UserService userService;

    @GetMapping("/export")
    public ResponseEntity<BackupDto> exportBackup(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        BackupDto backup = backupService.exportBackup(user);
        
        // Generate filename with timestamp
        String timestamp = backup.getTimestamp()
            .atOffset(ZoneOffset.UTC)
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm"));
        String filename = String.format("backup_%s.json", timestamp);
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_JSON)
            .body(backup);
    }

    @PostMapping("/import")
    public ResponseEntity<?> importBackup(
            Authentication authentication,
            @Valid @RequestBody BackupDto backup) {
        User user = userService.getOrCreateUser(authentication);
        
        try {
            backupService.importBackup(user, backup);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.error("Invalid backup data: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error importing backup for user {}", user.getId(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to import backup: " + e.getMessage()));
        }
    }
}
