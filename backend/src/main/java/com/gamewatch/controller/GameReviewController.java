package com.gamewatch.controller;

import com.gamewatch.dto.GameReviewDto;
import com.gamewatch.dto.SubmitReviewRequest;
import com.gamewatch.entity.User;
import com.gamewatch.service.GameReviewService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class GameReviewController {

    private final GameReviewService gameReviewService;
    private final UserService userService;

    @GetMapping("/games/{gameId}/reviews")
    public ResponseEntity<List<GameReviewDto>> getReviews(
            Authentication authentication,
            @PathVariable Long gameId,
            @RequestParam(required = false, defaultValue = "helpful") String sort,
            @RequestParam(required = false) String language) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameReviewService.getReviews(user, gameId, sort, language));
    }

    @PutMapping("/games/{gameId}/reviews")
    public ResponseEntity<GameReviewDto> submitReview(Authentication authentication,
                                                      @PathVariable Long gameId,
                                                      @RequestBody SubmitReviewRequest request) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameReviewService.submitReview(user, gameId, request));
    }

    @DeleteMapping("/games/{gameId}/reviews")
    public ResponseEntity<Void> deleteReview(Authentication authentication, @PathVariable Long gameId) {
        User user = userService.getOrCreateUser(authentication);
        gameReviewService.deleteReview(user, gameId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reviews/{reviewId}/helpful")
    public ResponseEntity<GameReviewDto> toggleHelpful(Authentication authentication,
                                                       @PathVariable Long reviewId) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameReviewService.toggleHelpful(user, reviewId));
    }
}
