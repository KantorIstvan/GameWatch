package com.gamewatch.controller;

import com.gamewatch.dto.WishlistEntryDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.UserService;
import com.gamewatch.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<List<WishlistEntryDto>> getMyWishlist(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.ok(wishlistService.getWishlist(user));
    }

    /**
     * Addressed by IGDB id rather than the catalog row id, matching {@code POST
     * /games/catalog/external/{externalId}}: most games reachable from a search have never
     * been catalogued here, and the id an "add to wishlist" button has on hand is the one
     * the catalog search itself returned.
     */
    @PostMapping("/{externalId}")
    public ResponseEntity<WishlistEntryDto> add(Authentication authentication,
                                                @PathVariable Integer externalId) {
        User user = userService.getOrCreateUser(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(wishlistService.addToWishlist(user, externalId));
    }

    @DeleteMapping("/{externalId}")
    public ResponseEntity<Void> remove(Authentication authentication,
                                       @PathVariable Integer externalId) {
        User user = userService.getOrCreateUser(authentication);
        wishlistService.removeFromWishlist(user, externalId);
        return ResponseEntity.noContent().build();
    }
}
