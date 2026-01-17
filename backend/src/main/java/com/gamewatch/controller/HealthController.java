package com.gamewatch.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/ping")
    public Map<String, String> ping(Authentication authentication) {
        String userId = authentication != null ? authentication.getName() : "anonymous";
        return Map.of(
            "status", "ok",
            "message", "GameWatch API is running",
            "userId", userId
        );
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "OK");
    }
}
