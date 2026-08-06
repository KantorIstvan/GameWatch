package com.gamewatch.service;

import com.gamewatch.dto.WishlistEntryDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.User;
import com.gamewatch.entity.WishlistEntry;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.WishlistEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private WishlistEntryRepository wishlistEntryRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameService gameService;

    @Mock
    private UserGameRepository userGameRepository;

    @InjectMocks
    private WishlistService wishlistService;

    private User user;
    private Game game;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).auth0UserId("auth0|123").build();
        game = Game.builder().id(10L).name("Wanted Game").externalId(555).build();
    }

    @Test
    void addingAGameClaimsItsCatalogRowTheSameWayARatingWould() {
        // A wishlist add is only ever reachable from the catalog, so the id it has on hand
        // is the IGDB one - resolving it to a row is exactly what ratings and reviews do.
        when(gameService.getOrCreateCatalogGame(555)).thenReturn(game);
        when(wishlistEntryRepository.findByUserAndGame(user, game)).thenReturn(Optional.empty());
        when(wishlistEntryRepository.save(any(WishlistEntry.class))).thenAnswer(i -> {
            WishlistEntry entry = i.getArgument(0);
            entry.setAddedAt(Instant.parse("2026-03-01T00:00:00Z"));
            return entry;
        });

        WishlistEntryDto dto = wishlistService.addToWishlist(user, 555);

        assertThat(dto.getGameId()).isEqualTo(10L);
        assertThat(dto.getExternalId()).isEqualTo(555);
        assertThat(dto.getGameName()).isEqualTo("Wanted Game");

        ArgumentCaptor<WishlistEntry> captor = ArgumentCaptor.forClass(WishlistEntry.class);
        verify(wishlistEntryRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
        assertThat(captor.getValue().getGame()).isEqualTo(game);
    }

    @Test
    void addingAGameAlreadyInTheLibraryIsRefused() {
        when(userGameRepository.existsByUserAndGameExternalId(user, 555)).thenReturn(true);

        assertThatThrownBy(() -> wishlistService.addToWishlist(user, 555))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("This game is already in your library");

        // Rejected before resolving a catalog row, so an owned game never creates one just
        // to be turned away.
        verifyNoInteractions(gameService, wishlistEntryRepository);
    }

    @Test
    void addingAGameAlreadyOnTheListReturnsTheExistingEntryRatherThanADuplicate() {
        WishlistEntry existing = WishlistEntry.builder().id(7L).user(user).game(game)
            .addedAt(Instant.parse("2026-01-01T00:00:00Z")).build();
        when(gameService.getOrCreateCatalogGame(555)).thenReturn(game);
        when(wishlistEntryRepository.findByUserAndGame(user, game)).thenReturn(Optional.of(existing));

        WishlistEntryDto dto = wishlistService.addToWishlist(user, 555);

        assertThat(dto.getGameId()).isEqualTo(10L);
        verify(wishlistEntryRepository, never()).save(any());
    }

    @Test
    void removingAnAddedGameDeletesTheEntry() {
        WishlistEntry existing = WishlistEntry.builder().id(7L).user(user).game(game).build();
        when(gameRepository.findFirstByExternalId(555)).thenReturn(Optional.of(game));
        when(wishlistEntryRepository.findByUserAndGame(user, game)).thenReturn(Optional.of(existing));

        wishlistService.removeFromWishlist(user, 555);

        verify(wishlistEntryRepository).delete(existing);
    }

    @Test
    void removingAGameThatWasNeverAddedIsANoOpRatherThanAnError() {
        when(gameRepository.findFirstByExternalId(555)).thenReturn(Optional.of(game));
        when(wishlistEntryRepository.findByUserAndGame(user, game)).thenReturn(Optional.empty());

        wishlistService.removeFromWishlist(user, 555);

        verify(wishlistEntryRepository, never()).delete(any());
    }

    @Test
    void removingAGameWithNoCatalogRowAtAllIsAlsoANoOp() {
        // Nobody has ever rated, reviewed or wishlisted this game, so it cannot possibly be
        // on anyone's wishlist either - there is nothing to look up an entry against.
        when(gameRepository.findFirstByExternalId(999)).thenReturn(Optional.empty());

        wishlistService.removeFromWishlist(user, 999);

        verifyNoInteractions(wishlistEntryRepository);
    }

    @Test
    void getWishlistMapsEntriesToDtosInRepositoryOrder() {
        Game second = Game.builder().id(11L).name("Another Game").externalId(556).build();
        WishlistEntry first = WishlistEntry.builder().id(1L).user(user).game(second)
            .addedAt(Instant.parse("2026-03-02T00:00:00Z")).build();
        WishlistEntry older = WishlistEntry.builder().id(2L).user(user).game(game)
            .addedAt(Instant.parse("2026-03-01T00:00:00Z")).build();
        // The repository query is what orders these newest-first; the service just maps.
        when(wishlistEntryRepository.findByUserOrderByAddedAtDesc(user)).thenReturn(List.of(first, older));

        List<WishlistEntryDto> result = wishlistService.getWishlist(user);

        assertThat(result).extracting(WishlistEntryDto::getGameId).containsExactly(11L, 10L);
    }
}
