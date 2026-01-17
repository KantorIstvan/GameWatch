package com.gamewatch.controller;

import com.gamewatch.dto.CreateGameRequest;
import com.gamewatch.dto.GameDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.GameService;
import com.gamewatch.service.RawgApiService;
import com.gamewatch.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GameController.class)
class GameControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GameService gameService;

    @MockBean
    private UserService userService;

    @MockBean
    private RawgApiService rawgApiService;

    private ObjectMapper objectMapper;
    private User testUser;
    private GameDto testGameDto;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .email("test@example.com")
            .username("testuser")
            .build();

        testGameDto = GameDto.builder()
            .id(1L)
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .description("A test game")
            .releaseDate("2023-01-01")
            .rating(4.5)
            .genres("Action,Adventure")
            .platforms("PC,PlayStation")
            .build();
    }

    @Test
    @WithMockUser
    void createGame_Success() throws Exception {
        CreateGameRequest request = CreateGameRequest.builder()
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .description("A test game")
            .releaseDate("2023-01-01")
            .rating(4.5)
            .build();

        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(gameService.createGame(any(CreateGameRequest.class), eq(testUser)))
            .thenReturn(testGameDto);

        mockMvc.perform(post("/games")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Test Game"))
            .andExpect(jsonPath("$.externalId").value(12345));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(gameService).createGame(any(CreateGameRequest.class), eq(testUser));
    }

    @Test
    @WithMockUser
    void getUserGames_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(gameService.getAllGames(testUser)).thenReturn(List.of(testGameDto));

        mockMvc.perform(get("/games"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("Test Game"));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(gameService).getAllGames(testUser);
    }

    @Test
    @WithMockUser
    void getGameById_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(gameService.getGameById(1L, testUser)).thenReturn(testGameDto);

        mockMvc.perform(get("/games/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Test Game"));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(gameService).getGameById(1L, testUser);
    }

    @Test
    @WithMockUser
    void deleteGame_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        doNothing().when(gameService).deleteGame(1L, testUser);

        mockMvc.perform(delete("/games/1")
                .with(csrf()))
            .andExpect(status().isNoContent());

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(gameService).deleteGame(1L, testUser);
    }

    @Test
    void createGame_Unauthorized_Returns401() throws Exception {
        CreateGameRequest request = CreateGameRequest.builder()
            .name("Test Game")
            .build();

        mockMvc.perform(post("/games")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());

        verify(gameService, never()).createGame(any(), any());
    }

    @Test
    @WithMockUser
    void createGame_DuplicateGame_Returns400() throws Exception {
        CreateGameRequest request = CreateGameRequest.builder()
            .name("Test Game")
            .externalId(12345)
            .build();

        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(gameService.createGame(any(CreateGameRequest.class), eq(testUser)))
            .thenThrow(new IllegalArgumentException("already have this game in your library"));

        mockMvc.perform(post("/games")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

        verify(gameService).createGame(any(CreateGameRequest.class), eq(testUser));
    }
}
