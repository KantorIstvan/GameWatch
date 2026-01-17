package com.gamewatch.service;

import com.gamewatch.dto.CreateGameRequest;
import com.gamewatch.dto.GameDto;
import com.gamewatch.entity.Game;
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

        when(gameRepository.findById(1L)).thenReturn(Optional.of(testGame));
        when(userGameRepository.findByUserAndGame(testUser, testGame)).thenReturn(Optional.of(userGame));
        doNothing().when(userGameRepository).delete(userGame);
        doNothing().when(gameRepository).deleteById(1L);

        gameService.deleteGame(1L, testUser);

        verify(gameRepository).findById(1L);
        verify(userGameRepository).findByUserAndGame(testUser, testGame);
        verify(userGameRepository).delete(userGame);
        verify(gameRepository).deleteById(1L);
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
