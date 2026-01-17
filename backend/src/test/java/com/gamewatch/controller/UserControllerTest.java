package com.gamewatch.controller;

import com.gamewatch.entity.User;
import com.gamewatch.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .email("test@example.com")
            .username("testuser")
            .profilePictureUrl("https://example.com/picture.jpg")
            .build();
    }

    @Test
    @WithMockUser
    void getCurrentUser_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);

        mockMvc.perform(get("/users/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.auth0UserId").value("auth0|123"))
            .andExpect(jsonPath("$.email").value("test@example.com"))
            .andExpect(jsonPath("$.username").value("testuser"));

        verify(userService).getOrCreateUser(any(Authentication.class));
    }

    @Test
    @WithMockUser
    void deleteAccount_Success() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        doNothing().when(userService).deleteAccount(testUser);

        mockMvc.perform(delete("/users/me")
                .with(csrf()))
            .andExpect(status().isNoContent());

        verify(userService).getOrCreateUser(any(Authentication.class));
        verify(userService).deleteAccount(testUser);
    }

    @Test
    void getCurrentUser_Unauthorized_Returns401() throws Exception {
        mockMvc.perform(get("/users/me"))
            .andExpect(status().isUnauthorized());

        verify(userService, never()).getOrCreateUser(any());
    }

    @Test
    void deleteAccount_Unauthorized_Returns401() throws Exception {
        mockMvc.perform(delete("/users/me")
                .with(csrf()))
            .andExpect(status().isUnauthorized());

        verify(userService, never()).deleteAccount(any());
    }

    @Test
    @WithMockUser
    void deleteAccount_ServiceThrowsException_Returns500() throws Exception {
        when(userService.getOrCreateUser(any(Authentication.class))).thenReturn(testUser);
        doThrow(new RuntimeException("Database error"))
            .when(userService).deleteAccount(testUser);

        mockMvc.perform(delete("/users/me")
                .with(csrf()))
            .andExpect(status().isInternalServerError());

        verify(userService).deleteAccount(testUser);
    }
}
