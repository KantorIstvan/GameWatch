package com.gamewatch.controller;

import com.gamewatch.dto.NotificationFeedDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.NotificationService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * The bell.
 *
 * Every route is implicitly scoped to the caller - there is no way to ask for someone else's
 * notifications, because there is no parameter that would name them.
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<NotificationFeedDto> getNotifications(
            Authentication authentication,
            @RequestParam(required = false) Integer limit) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(notificationService.getFeed(user, limit));
    }

    @PostMapping("/read")
    public ResponseEntity<NotificationFeedDto> markAllRead(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        notificationService.markAllRead(user);
        // Returns the list as it now stands, so the header does not have to ask again to find
        // out what it already knows.
        return ResponseEntity.ok(notificationService.getFeed(user, null));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationFeedDto> markRead(Authentication authentication,
                                                        @PathVariable Long id) {
        User user = userService.getOrCreateUser(authentication);
        notificationService.markRead(user, id);
        return ResponseEntity.ok(notificationService.getFeed(user, null));
    }

    @DeleteMapping
    public ResponseEntity<NotificationFeedDto> clear(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        notificationService.clear(user);
        return ResponseEntity.ok(notificationService.getFeed(user, null));
    }
}
