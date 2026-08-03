package com.gamewatch.controller;

import com.gamewatch.dto.GameCommunityDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.GameCommunityService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/games/{gameId}/community")
@RequiredArgsConstructor
public class GameCommunityController {

    private final GameCommunityService gameCommunityService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<GameCommunityDto> getCommunityStats(Authentication authentication,
                                                              @PathVariable Long gameId) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(gameCommunityService.getCommunityStats(viewer, gameId));
    }
}
