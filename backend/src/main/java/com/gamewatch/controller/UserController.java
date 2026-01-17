package com.gamewatch.controller;

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

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        userService.deleteAccount(user);
        return ResponseEntity.noContent().build();
    }
}
