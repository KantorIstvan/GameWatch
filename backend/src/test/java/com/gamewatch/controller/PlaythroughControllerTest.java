package com.gamewatch.controller;

import com.gamewatch.dto.CreatePlaythroughRequest;
import com.gamewatch.dto.LogManualSessionRequest;
import com.gamewatch.dto.PlaythroughDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.PlaythroughService;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PlaythroughController.class)
class PlaythroughControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlaythroughService playthroughService;

    @MockBean
    private UserService userService;

    private ObjectMapper objectMapper;
    private User testUser;
    private PlaythroughDto testPlaythroughDto;

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

        testPlaythroughDto = PlaythroughDto.builder()
            .id(1L)
            .gameId(1L)
            .gameName("Test Game")
            .playthroughType("story")
            .title("First Playthrough")
            .platform("PC")
            .startDate(LocalDate.now())
            .isActive(false)
            .isCompleted(false)
            .isDropped(false)
            .isPaused(false)
            .durationSeconds(0L)
            .sessionCount(0)
            .build();
    }

    @Test
    @WithMockUser
    void createPlaythrough_Success() throws Exception {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .gameId(1L)
            .playthroughType("story")
            .title("First Playthrough")
            .platform("PC")
            .startDate(LocalDate.now())
            .build();

        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.createPlaythrough(eq(testUser), any(CreatePlaythroughRequest.class)))
            .thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.gameId").value(1))
            .andExpect(jsonPath("$.gameName").value("Test Game"))
            .andExpect(jsonPath("$.playthroughType").value("story"));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).createPlaythrough(eq(testUser), any(CreatePlaythroughRequest.class));
    }

    @Test
    @WithMockUser
    void getUserPlaythroughs_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.getUserPlaythroughs(testUser)).thenReturn(List.of(testPlaythroughDto));

        mockMvc.perform(get("/playthroughs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].gameName").value("Test Game"));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).getUserPlaythroughs(testUser);
    }

    @Test
    @WithMockUser
    void getPlaythroughById_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.getPlaythroughById(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(get("/playthroughs/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.gameName").value("Test Game"));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).getPlaythroughById(testUser, 1L);
    }

    @Test
    @WithMockUser
    void startPlaythrough_Success() throws Exception {
        testPlaythroughDto.setIsActive(true);
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.startPlaythrough(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/start")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.isActive").value(true));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).startPlaythrough(testUser, 1L);
    }

    @Test
    @WithMockUser
    void stopPlaythrough_Success() throws Exception {
        testPlaythroughDto.setIsCompleted(true);
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.stopPlaythrough(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/stop")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.isCompleted").value(true));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).stopPlaythrough(testUser, 1L);
    }

    @Test
    @WithMockUser
    void dropPlaythrough_Success() throws Exception {
        testPlaythroughDto.setIsDropped(true);
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.dropPlaythrough(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/drop")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.isDropped").value(true));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).dropPlaythrough(testUser, 1L);
    }

    @Test
    @WithMockUser
    void pausePlaythrough_Success() throws Exception {
        testPlaythroughDto.setIsPaused(true);
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.pausePlaythrough(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/pause")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.isPaused").value(true));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).pausePlaythrough(testUser, 1L);
    }

    @Test
    @WithMockUser
    void endSessionPlaythrough_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.endSessionPlaythrough(testUser, 1L)).thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/end-session")
                .with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).endSessionPlaythrough(testUser, 1L);
    }

    @Test
    @WithMockUser
    void logManualSession_Success() throws Exception {
        LogManualSessionRequest request = new LogManualSessionRequest();
        request.setStartedAt(Instant.now().minusSeconds(3600));
        request.setEndedAt(Instant.now());

        testPlaythroughDto.setDurationSeconds(3600L);
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.logManualSession(eq(testUser), eq(1L), any(LogManualSessionRequest.class)))
            .thenReturn(testPlaythroughDto);

        mockMvc.perform(post("/playthroughs/1/log-manual-session")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.durationSeconds").value(3600));

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(playthroughService).logManualSession(eq(testUser), eq(1L), any(LogManualSessionRequest.class));
    }

    @Test
    void createPlaythrough_Unauthorized_Returns401() throws Exception {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .gameId(1L)
            .playthroughType("story")
            .build();

        mockMvc.perform(post("/playthroughs")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());

        verify(playthroughService, never()).createPlaythrough(any(), any());
    }

    @Test
    @WithMockUser
    void createPlaythrough_InvalidRequest_Returns400() throws Exception {
        CreatePlaythroughRequest request = CreatePlaythroughRequest.builder()
            .playthroughType("story")
            .build();

        mockMvc.perform(post("/playthroughs")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());

        verify(playthroughService, never()).createPlaythrough(any(), any());
    }

    @Test
    @WithMockUser
    void startPlaythrough_ServiceThrowsException_Returns500() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        when(playthroughService.startPlaythrough(testUser, 1L))
            .thenThrow(new RuntimeException("Playthrough already active"));

        mockMvc.perform(post("/playthroughs/1/start")
                .with(csrf()))
            .andExpect(status().isInternalServerError());

        verify(playthroughService).startPlaythrough(testUser, 1L);
    }
}
