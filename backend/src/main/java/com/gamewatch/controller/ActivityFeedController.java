package com.gamewatch.controller;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.ActivityFeedService;
import com.gamewatch.service.ActivityFeedService.FeedScope;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/feed")
@RequiredArgsConstructor
public class ActivityFeedController {

    private final ActivityFeedService activityFeedService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<ActivityEventDto>> getFeed(Authentication authentication,
                                                          @RequestParam(required = false) Integer limit,
                                                          @RequestParam(required = false, defaultValue = "following") String scope,
                                                          // The paging cursor: only events strictly before this
                                                          // instant, so the client can request the next page with
                                                          // the occurredAt of the oldest event it already has.
                                                          // Parsed as a plain string rather than an Instant param,
                                                          // mirroring parseScope: an unparseable cursor is treated
                                                          // as no cursor rather than a 400.
                                                          @RequestParam(required = false) String before,
                                                          // Narrows a "following" feed to just these followed
                                                          // handles - ignored for "self", which has only one actor.
                                                          @RequestParam(required = false) List<String> actorHandles) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(
            activityFeedService.getFeed(user, limit, parseScope(scope), parseBefore(before), actorHandles));
    }

    private FeedScope parseScope(String scope) {
        try {
            return FeedScope.valueOf(scope.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return FeedScope.FOLLOWING;
        }
    }

    private Instant parseBefore(String before) {
        if (before == null || before.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(before.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
