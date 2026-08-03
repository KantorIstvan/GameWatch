package com.gamewatch.controller;

import com.gamewatch.dto.GroupDto;
import com.gamewatch.entity.GroupChallenge;
import com.gamewatch.entity.User;
import com.gamewatch.service.GroupService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<GroupDto>> getMyGroups(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(groupService.getMyGroups(user));
    }

    @PostMapping
    public ResponseEntity<GroupDto> createGroup(Authentication authentication,
                                                @RequestBody Map<String, String> request) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(
            groupService.createGroup(user, request.get("name"), request.get("description")));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<GroupDto> getGroup(Authentication authentication, @PathVariable String slug) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(groupService.getGroup(user, slug));
    }

    @PostMapping("/{slug}/join")
    public ResponseEntity<GroupDto> join(Authentication authentication, @PathVariable String slug) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(groupService.join(user, slug));
    }

    @DeleteMapping("/{slug}/leave")
    public ResponseEntity<Void> leave(Authentication authentication, @PathVariable String slug) {
        User user = userService.getOrCreateUser(authentication);
        groupService.leave(user, slug);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{slug}/challenges")
    public ResponseEntity<GroupDto> addChallenge(Authentication authentication,
                                                 @PathVariable String slug,
                                                 @RequestBody Map<String, String> request) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(groupService.addChallenge(
            user,
            slug,
            request.get("name"),
            GroupChallenge.ChallengeMetric.valueOf(request.get("metric")),
            request.get("target") == null ? null : Integer.valueOf(request.get("target")),
            LocalDate.parse(request.get("startsOn")),
            LocalDate.parse(request.get("endsOn"))));
    }
}
