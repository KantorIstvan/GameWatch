package com.gamewatch.controller;

import com.gamewatch.dto.ProfileComparisonDto;
import com.gamewatch.dto.PublicProfileDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.ProfileComparisonService;
import com.gamewatch.service.ProfileService;
import com.gamewatch.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ProfileComparisonService profileComparisonService;
    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<List<PublicProfileDto>> search(Authentication authentication,
                                                         @RequestParam String query) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.search(viewer, query));
    }

    /**
     * The viewer's own profile.
     *
     * Its own route rather than {@code /profiles/{ownHandle}}, because someone who has not
     * claimed a handle has nothing to look themselves up by, and their own profile page is
     * where they go to claim one.
     */
    @GetMapping("/me")
    public ResponseEntity<PublicProfileDto> getOwnProfile(Authentication authentication) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.getOwnProfile(viewer));
    }

    @GetMapping("/{handle}/followers")
    public ResponseEntity<List<PublicProfileDto>> getFollowers(Authentication authentication,
                                                               @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.getFollowers(viewer, handle));
    }

    @GetMapping("/{handle}/following")
    public ResponseEntity<List<PublicProfileDto>> getFollowing(Authentication authentication,
                                                               @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.getFollowing(viewer, handle));
    }

    @GetMapping("/{handle}/compare")
    public ResponseEntity<ProfileComparisonDto> compare(Authentication authentication,
                                                        @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileComparisonService.compare(viewer, handle));
    }

    @GetMapping("/{handle}")
    public ResponseEntity<PublicProfileDto> getProfile(Authentication authentication,
                                                       @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.getProfile(viewer, handle));
    }
}
