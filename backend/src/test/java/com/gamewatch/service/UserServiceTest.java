package com.gamewatch.service;

import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private UserService userService;

    private Jwt mockJwt;
    private User testUser;

    @BeforeEach
    void setUp() {
        mockJwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .subject("auth0|123")
            .claim("email", "test@example.com")
            .claim("nickname", "testuser")
            .claim("picture", "https://example.com/picture.jpg")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        testUser = User.builder()
            .id(1L)
            .auth0UserId("auth0|123")
            .email("test@example.com")
            .username("testuser")
            .profilePictureUrl("https://example.com/picture.jpg")
            .build();
    }

    @Test
    void getOrCreateUser_ExistingUser_ReturnsUser() {
        when(authentication.getPrincipal()).thenReturn(mockJwt);
        when(userRepository.findByAuth0UserId("auth0|123")).thenReturn(Optional.of(testUser));

        User result = userService.getOrCreateUser(authentication);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getAuth0UserId()).isEqualTo("auth0|123");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getUsername()).isEqualTo("testuser");

        verify(userRepository).findByAuth0UserId("auth0|123");
        verify(userRepository, never()).save(any());
    }

    @Test
    void getOrCreateUser_NewUser_CreatesAndReturnsUser() {
        when(authentication.getPrincipal()).thenReturn(mockJwt);
        when(userRepository.findByAuth0UserId("auth0|123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User result = userService.getOrCreateUser(authentication);

        assertThat(result).isNotNull();
        assertThat(result.getAuth0UserId()).isEqualTo("auth0|123");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getUsername()).isEqualTo("testuser");

        verify(userRepository).findByAuth0UserId("auth0|123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void getOrCreateUser_ConcurrentCreation_HandlesRaceCondition() {
        when(authentication.getPrincipal()).thenReturn(mockJwt);
        when(userRepository.findByAuth0UserId("auth0|123"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class)))
            .thenThrow(new RuntimeException("Unique constraint violation"));

        User result = userService.getOrCreateUser(authentication);

        assertThat(result).isNotNull();
        assertThat(result.getAuth0UserId()).isEqualTo("auth0|123");

        verify(userRepository, times(2)).findByAuth0UserId("auth0|123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void getUserByAuth0Id_ExistingUser_ReturnsUser() {
        when(userRepository.findByAuth0UserId("auth0|123")).thenReturn(Optional.of(testUser));

        User result = userService.getUserByAuth0Id("auth0|123");

        assertThat(result).isNotNull();
        assertThat(result.getAuth0UserId()).isEqualTo("auth0|123");

        verify(userRepository).findByAuth0UserId("auth0|123");
    }

    @Test
    void getUserByAuth0Id_NonExistingUser_ThrowsException() {
        when(userRepository.findByAuth0UserId("auth0|999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserByAuth0Id("auth0|999"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("User not found");

        verify(userRepository).findByAuth0UserId("auth0|999");
    }

    @Test
    void deleteAccount_Success() {
        doNothing().when(userRepository).delete(testUser);

        userService.deleteAccount(testUser);

        verify(userRepository).delete(testUser);
    }

    @Test
    void getOrCreateUser_WithNullClaims_CreatesUserWithNullFields() {
        Jwt minimalJwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .subject("auth0|456")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        User minimalUser = User.builder()
            .id(2L)
            .auth0UserId("auth0|456")
            .email(null)
            .username(null)
            .profilePictureUrl(null)
            .build();

        when(authentication.getPrincipal()).thenReturn(minimalJwt);
        when(userRepository.findByAuth0UserId("auth0|456")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(minimalUser);

        User result = userService.getOrCreateUser(authentication);

        assertThat(result).isNotNull();
        assertThat(result.getAuth0UserId()).isEqualTo("auth0|456");

        verify(userRepository).save(any(User.class));
    }

    @Test
    void getOrCreateUser_ExtractsAllJwtClaims() {
        when(authentication.getPrincipal()).thenReturn(mockJwt);
        when(userRepository.findByAuth0UserId("auth0|123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            assertThat(savedUser.getAuth0UserId()).isEqualTo("auth0|123");
            assertThat(savedUser.getEmail()).isEqualTo("test@example.com");
            assertThat(savedUser.getUsername()).isEqualTo("testuser");
            assertThat(savedUser.getProfilePictureUrl()).isEqualTo("https://example.com/picture.jpg");
            return testUser;
        });

        User result = userService.getOrCreateUser(authentication);

        assertThat(result).isNotNull();
        verify(userRepository).save(any(User.class));
    }
}
