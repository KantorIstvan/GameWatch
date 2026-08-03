package com.gamewatch.service;

import com.gamewatch.dto.CreateGameRequest;
import com.gamewatch.dto.GameDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.entity.UserGame;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.SessionHistoryRepository;
import com.gamewatch.repository.UserGameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @Mock
    private PlaythroughRepository playthroughRepository;

    @Mock
    private SessionHistoryRepository sessionHistoryRepository;

    @Mock
    private PlaythroughService playthroughService;

    @InjectMocks
    private GameService gameService;

    private User testUser;
    private Game testGame;
    private CreateGameRequest createGameRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .email("test@example.com")
            .username("testuser")
            .build();

        testGame = Game.builder()
            .id(1L)
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .description("A test game")
            .releaseDate("2023-01-01")
            .rating(4.5)
            .ratingTop(5)
            .ratingsCount(1000)
            .genres("Action,Adventure")
            .platforms("PC,PlayStation")
            .developers("Test Dev")
            .publishers("Test Pub")
            .build();

        createGameRequest = CreateGameRequest.builder()
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .description("A test game")
            .releaseDate("2023-01-01")
            .rating(4.5)
            .ratingTop(5)
            .ratingsCount(1000)
            .genres("Action,Adventure")
            .platforms("PC,PlayStation")
            .developers("Test Dev")
            .publishers("Test Pub")
            .build();
    }

    @Test
    void createGame_Success() {
        when(userGameRepository.existsByUserAndGameExternalId(testUser, 12345)).thenReturn(false);
        when(gameRepository.save(any(Game.class))).thenReturn(testGame);
        when(userGameRepository.save(any(UserGame.class))).thenReturn(new UserGame());

        GameDto result = gameService.createGame(createGameRequest, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Test Game");
        assertThat(result.getExternalId()).isEqualTo(12345);
        assertThat(result.getBannerImageUrl()).isEqualTo("https://example.com/banner.jpg");

        verify(userGameRepository).existsByUserAndGameExternalId(testUser, 12345);
        verify(gameRepository).save(any(Game.class));
        verify(userGameRepository).save(any(UserGame.class));
    }

    @Test
    void createGame_DuplicateExternalId_ThrowsException() {
        when(userGameRepository.existsByUserAndGameExternalId(testUser, 12345)).thenReturn(true);

        assertThatThrownBy(() -> gameService.createGame(createGameRequest, testUser))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already have this game in your library");

        verify(userGameRepository).existsByUserAndGameExternalId(testUser, 12345);
        verify(gameRepository, never()).save(any());
        verify(userGameRepository, never()).save(any(UserGame.class));
    }

    @Test
    void createGame_WithoutExternalId_Success() {
        createGameRequest.setExternalId(null);
        when(gameRepository.save(any(Game.class))).thenReturn(testGame);
        when(userGameRepository.save(any(UserGame.class))).thenReturn(new UserGame());

        GameDto result = gameService.createGame(createGameRequest, testUser);

        assertThat(result).isNotNull();
        verify(userGameRepository, never()).existsByUserAndGameExternalId(any(), anyInt());
        verify(gameRepository).save(any(Game.class));
        verify(userGameRepository).save(any(UserGame.class));
    }

    @Test
    void getAllGames_Success() {
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(playthroughRepository.findByUserIdAndGameIdIn(eq(1L), anyList())).thenReturn(List.of());

        List<GameDto> results = gameService.getAllGames(testUser);

        assertThat(results).isNotEmpty();
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Test Game");

        verify(userGameRepository).findGamesByUser(testUser);
    }

    @Test
    void getAllGames_ReportsHowManyPlaythroughsAGameCarries() {
        // Deleting a game cascades to its playthroughs and their sessions. The frontend
        // type already declared playthroughCount, but nothing ever populated it, so the
        // confirmation dialog had no way to say how much was about to be destroyed.
        Playthrough first = Playthrough.builder()
            .id(1L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L).sessionCount(2)
            .isActive(false).isCompleted(true).isDropped(false).isPaused(false)
            .build();
        Playthrough second = Playthrough.builder()
            .id(2L).user(testUser).game(testGame).playthroughType("100%")
            .durationSeconds(1800L).importedDurationSeconds(0L).sessionCount(1)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .build();

        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of(testGame));
        when(playthroughRepository.findByUserIdAndGameIdIn(eq(1L), anyList()))
            .thenReturn(List.of(first, second));

        List<GameDto> results = gameService.getAllGames(testUser);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getPlaythroughCount()).isEqualTo(2);
        assertThat(results.get(0).getSessionCount()).isEqualTo(3);
        assertThat(results.get(0).getTotalPlaytimeSeconds()).isEqualTo(5400L);
    }

    @Test
    void getAllGames_EmptyList() {
        when(userGameRepository.findGamesByUser(testUser)).thenReturn(List.of());

        List<GameDto> results = gameService.getAllGames(testUser);

        assertThat(results).isEmpty();

        verify(userGameRepository).findGamesByUser(testUser);
    }

    @Test
    void getGameById_Success() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.existsByUserAndGame(testUser, testGame)).thenReturn(true);
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(1L, 1L)).thenReturn(List.of());

        GameDto result = gameService.getGameById(1L, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Test Game");

        verify(gameRepository).findById(1L);
        verify(userGameRepository).existsByUserAndGame(testUser, testGame);
    }

    @Test
    void getGameById_NotFound_ThrowsException() {
        when(gameRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gameService.getGameById(999L, testUser))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not found");

        verify(gameRepository).findById(999L);
    }

    @Test
    void getGameById_NoAccess_ThrowsException() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.existsByUserAndGame(testUser, testGame)).thenReturn(false);

        assertThatThrownBy(() -> gameService.getGameById(1L, testUser))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("access denied");

        verify(gameRepository).findById(1L);
        verify(userGameRepository).existsByUserAndGame(testUser, testGame);
    }

    @Test
    void deleteGame_Success() {
        UserGame userGame = UserGame.builder()
            .id(1L)
            .user(testUser)
            .game(testGame)
            .build();

        Playthrough own = Playthrough.builder()
            .id(5L).user(testUser).game(testGame).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isActive(false).isCompleted(false).isDropped(false).isPaused(false)
            .build();

        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.findByUserAndGame(testUser, testGame)).thenReturn(Optional.of(userGame));
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(1L, 1L))
            .thenReturn(List.of(own));

        gameService.deleteGame(1L, testUser);

        verify(userGameRepository).delete(userGame);
        // The user's own playthroughs go, routed through PlaythroughService so each one
        // still releases its imports and rebuilds the affected health metrics.
        verify(playthroughService).deletePlaythrough(testUser, 5L);
        // The catalogue row survives. Deleting it would, against a shared catalogue, take
        // every other user's playthroughs and session history for that game with it.
        verify(gameRepository, never()).deleteById(any());
        verify(gameRepository, never()).delete(any());
    }

    @Test
    void createGame_ReusesTheCatalogueRowWhenTheGameIsAlreadyKnown() {
        // Every add used to insert a brand new games row, so two users playing the same
        // game held two unrelated rows and nothing could be aggregated across them.
        when(userGameRepository.existsByUserAndGameExternalId(testUser, 12345)).thenReturn(false);
        when(gameRepository.findFirstByExternalId(12345)).thenReturn(Optional.of(testGame));

        GameDto result = gameService.createGame(createGameRequest, testUser);

        assertThat(result.getId()).isEqualTo(1L);
        verify(userGameRepository).save(any(UserGame.class));
        verify(gameRepository, never()).save(any(Game.class));
    }

    @Test
    void createGame_InsertsACatalogueRowWhenTheGameIsNew() {
        when(userGameRepository.existsByUserAndGameExternalId(testUser, 12345)).thenReturn(false);
        when(gameRepository.findFirstByExternalId(12345)).thenReturn(Optional.empty());
        when(gameRepository.save(any(Game.class))).thenReturn(testGame);
        when(userGameRepository.save(any(UserGame.class))).thenReturn(new UserGame());

        gameService.createGame(createGameRequest, testUser);

        verify(gameRepository).save(any(Game.class));
        verify(userGameRepository).save(any(UserGame.class));
    }

    @Test
    void deleteGame_NotFound_ThrowsException() {
        when(gameRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gameService.deleteGame(999L, testUser))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("not found");

        verify(gameRepository).findById(999L);
        verify(userGameRepository, never()).delete(any());
    }

    @Test
    void createGame_WithMinimalFields() {
        CreateGameRequest minimalRequest = CreateGameRequest.builder()
            .name("Minimal Game")
            .build();

        Game minimalGame = Game.builder()
            .id(2L)
            .name("Minimal Game")
            .build();

        when(gameRepository.save(any(Game.class))).thenReturn(minimalGame);
        when(userGameRepository.save(any(UserGame.class))).thenReturn(new UserGame());

        GameDto result = gameService.createGame(minimalRequest, testUser);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Minimal Game");

        verify(gameRepository).save(any(Game.class));
        verify(userGameRepository).save(any(UserGame.class));
    }
}
