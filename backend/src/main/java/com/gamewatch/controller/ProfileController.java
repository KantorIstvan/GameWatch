package com.gamewatch.controller;

import com.gamewatch.dto.PublicProfileDto;
import com.gamewatch.entity.User;
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
    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<List<PublicProfileDto>> search(Authentication authentication,
                                                         @RequestParam String query) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.search(viewer, query));
    }

    @GetMapping("/{handle}")
    public ResponseEntity<PublicProfileDto> getProfile(Authentication authentication,
                                                       @PathVariable String handle) {
        User viewer = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(profileService.getProfile(viewer, handle));
    }
}
