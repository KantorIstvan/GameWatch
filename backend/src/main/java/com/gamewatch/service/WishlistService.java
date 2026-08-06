package com.gamewatch.service;

import com.gamewatch.dto.WishlistEntryDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.User;
import com.gamewatch.entity.WishlistEntry;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.WishlistEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Games a user wants to play, found the same way a game reaches the library - by searching
 * the catalog - but tracked separately from it. See {@link com.gamewatch.entity.WishlistEntry}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WishlistService {

    private final WishlistEntryRepository wishlistEntryRepository;
    private final GameRepository gameRepository;
    private final GameService gameService;
    private final UserGameRepository userGameRepository;

    /**
     * Adds a game to the wishlist, claiming its catalog row from IGDB on first use - the
     * same way {@link GameService#resolveCatalogGame} does for a rating or a review.
     *
     * Idempotent: wishlisting a game already on the list returns that entry rather than a
     * duplicate, so a client that does not track local state can call this unconditionally.
     *
     * Refuses a game already in the user's own library: a wishlist is what someone wants to
     * play next, and a game they already own answered that question, so letting it onto the
     * list would just be a stale entry nobody would ever clear themselves. Checked before
     * resolving the catalog row, so a rejected request never creates one.
     */
    @Transactional
    public WishlistEntryDto addToWishlist(User user, Integer externalId) {
        if (userGameRepository.existsByUserAndGameExternalId(user, externalId)) {
            throw new IllegalArgumentException("This game is already in your library");
        }

        Game game = gameService.getOrCreateCatalogGame(externalId);

        WishlistEntry existing = wishlistEntryRepository.findByUserAndGame(user, game).orElse(null);
        if (existing != null) {
            return toDto(existing);
        }

        WishlistEntry entry = wishlistEntryRepository.save(WishlistEntry.builder()
            .user(user)
            .game(game)
            .build());

        log.info("User {} added game {} to wishlist", user.getId(), game.getId());
        return toDto(entry);
    }

    /**
     * Removes a game from the wishlist. A no-op, not an error, if it was never on it or the
     * game has no catalog row at all - the end state the caller wants is the same either way.
     */
    @Transactional
    public void removeFromWishlist(User user, Integer externalId) {
        gameRepository.findFirstByExternalId(externalId)
            .flatMap(game -> wishlistEntryRepository.findByUserAndGame(user, game))
            .ifPresent(entry -> {
                wishlistEntryRepository.delete(entry);
                log.info("User {} removed game {} from wishlist", user.getId(), entry.getGame().getId());
            });
    }

    /** The caller's own wishlist - always visible to them, whatever their setting says. */
    @Transactional(readOnly = true)
    public List<WishlistEntryDto> getWishlist(User user) {
        return wishlistEntryRepository.findByUserOrderByAddedAtDesc(user).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private WishlistEntryDto toDto(WishlistEntry entry) {
        Game game = entry.getGame();
        return WishlistEntryDto.builder()
            .gameId(game.getId())
            .externalId(game.getExternalId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .releaseDate(game.getReleaseDate())
            .addedAt(entry.getAddedAt())
            .build();
    }
}
