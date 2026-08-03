package com.gamewatch.controller;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.ActivityFeedService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/feed")
@RequiredArgsConstructor
public class ActivityFeedController {

    private final ActivityFeedService activityFeedService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ActivityEventDto>> getFeed(Authentication authentication,
                                                          @RequestParam(required = false) Integer limit) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(activityFeedService.getFeed(user, limit));
    }
}
