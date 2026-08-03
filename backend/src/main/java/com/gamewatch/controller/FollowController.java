package com.gamewatch.controller;

import com.gamewatch.dto.FollowRequestDto;
import com.gamewatch.dto.FollowStateDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.FollowService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/follows")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;
    private final UserService userService;

    @GetMapping("/{handle}")
    public ResponseEntity<FollowStateDto> getFollowState(Authentication authentication,
                                                         @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.getFollowState(viewer, handle));
    }

    @PostMapping("/{handle}")
    public ResponseEntity<FollowStateDto> follow(Authentication authentication,
                                                 @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.follow(viewer, handle));
    }

    @DeleteMapping("/{handle}")
    public ResponseEntity<FollowStateDto> unfollow(Authentication authentication,
                                                   @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.unfollow(viewer, handle));
    }

    @GetMapping("/me/requests")
    public ResponseEntity<List<FollowRequestDto>> getPendingRequests(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.getPendingRequests(user));
    }

    @GetMapping("/me/followers")
    public ResponseEntity<List<FollowRequestDto>> getFollowers(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.getFollowers(user));
    }

    @GetMapping("/me/following")
    public ResponseEntity<List<FollowRequestDto>> getFollowing(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(followService.getFollowing(user));
    }

    @PostMapping("/me/requests/{followId}/accept")
    public ResponseEntity<Void> accept(Authentication authentication, @PathVariable Long followId) {
        User user = userService.getOrCreateUser(authentication);
        followService.respondToRequest(user, followId, true);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/requests/{followId}/reject")
    public ResponseEntity<Void> reject(Authentication authentication, @PathVariable Long followId) {
        User user = userService.getOrCreateUser(authentication);
        followService.respondToRequest(user, followId, false);
        return ResponseEntity.noContent().build();
    }
}
