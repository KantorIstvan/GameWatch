package com.gamewatch.controller;

import com.gamewatch.dto.GameRecommendationDto;
import com.gamewatch.dto.UserStatisticsDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.UserService;
import com.gamewatch.service.UserStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final UserStatisticsService userStatisticsService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserStatisticsDto> getUserStatistics(
            @RequestParam(defaultValue = "all") String interval,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        UserStatisticsDto statistics = userStatisticsService.getUserStatistics(user, interval);
        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<GameRecommendationDto>> getGameRecommendations(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        List<GameRecommendationDto> recommendations = userStatisticsService.getGameRecommendations(user, limit);
        return ResponseEntity.ok(recommendations);
    }
}
