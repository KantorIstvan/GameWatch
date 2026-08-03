package com.gamewatch.controller;

import com.gamewatch.dto.GameRatingSummaryDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.GameRatingService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/games/{gameId}/rating")
@RequiredArgsConstructor
public class GameRatingController {

    private final GameRatingService gameRatingService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<GameRatingSummaryDto> getSummary(Authentication authentication,
                                                           @PathVariable Long gameId) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameRatingService.getSummary(user, gameId));
    }

    @PutMapping
    public ResponseEntity<GameRatingSummaryDto> rate(Authentication authentication,
                                                     @PathVariable Long gameId,
                                                     @RequestBody Map<String, Integer> request) {
        User user = userService.getOrCreateUser(authentication);
        Integer score = request.get("score");
        if (score == null) {
            throw new IllegalArgumentException("Rating must be between 1 and 10");
        }
        return ResponseEntity.ok(gameRatingService.rate(user, gameId, score));
    }

    @DeleteMapping
    public ResponseEntity<GameRatingSummaryDto> removeRating(Authentication authentication,
                                                             @PathVariable Long gameId) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameRatingService.removeRating(user, gameId));
    }
}
