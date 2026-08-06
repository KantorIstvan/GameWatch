package com.gamewatch.controller;

import com.gamewatch.entity.UserAvatar;
import com.gamewatch.service.UserAvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Serves uploaded profile pictures.
 *
 * Unauthenticated, because an {@code <img>} tag has nowhere to put a bearer token. What
 * stands in for the token is the key: it is random per upload and never derived from a user
 * id or handle, so knowing that someone exists does not tell you the URL of their picture,
 * and a rotated key leaves the previous URL pointing at nothing.
 *
 * Responses are cacheable indefinitely for the same reason - a changed picture is a
 * different key, so a cached response can never be stale.
 */
@RestController
@RequiredArgsConstructor
public class AvatarController {

    private final UserAvatarService userAvatarService;

    @GetMapping("/avatars/{avatarKey}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String avatarKey) {
        UserAvatar avatar = userAvatarService.findByKey(avatarKey);

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(avatar.getContentType()))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            // The content type is sniffed from the bytes on upload, and this stops a browser
            // from second-guessing it and executing something as anything other than an image.
            .header("X-Content-Type-Options", "nosniff")
            .header("Content-Disposition", "inline")
            .body(avatar.getImageData());
    }
}
