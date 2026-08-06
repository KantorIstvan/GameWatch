package com.gamewatch.service;

import com.gamewatch.entity.User;
import com.gamewatch.entity.UserAvatar;
import com.gamewatch.repository.UserAvatarRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserAvatarServiceTest {

    @Mock private UserAvatarRepository userAvatarRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private UserAvatarService userAvatarService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).auth0UserId("auth0|1").handle("someone").build();
    }

    private static byte[] pngBytes() {
        return new byte[] {
            (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13
        };
    }

    private MockMultipartFile upload(String declaredType, byte[] bytes) {
        return new MockMultipartFile("file", "avatar", declaredType, bytes);
    }

    @Test
    void anUploadedPictureBecomesTheUrlEverySurfaceAlreadyReads() {
        // Writing the URL onto the user is what makes one upload show up in search results,
        // follow lists, review authors and group members without any of them knowing about
        // avatars at all.
        when(userAvatarRepository.findByUser(user)).thenReturn(Optional.empty());
        when(userAvatarRepository.save(any(UserAvatar.class))).thenAnswer(i -> i.getArgument(0));

        String url = userAvatarService.upload(user, upload("image/png", pngBytes()));

        assertThat(url).startsWith("/api/avatars/");
        assertThat(user.getProfilePictureUrl()).isEqualTo(url);
        verify(userRepository).save(user);
    }

    @Test
    void theContentTypeComesFromTheBytesNotFromWhatTheCallerClaimed() {
        // A Content-Type header is whatever the caller chose to write. Trusting it would let
        // anything at all be stored and then served back to a browser as an image.
        when(userAvatarRepository.findByUser(user)).thenReturn(Optional.empty());
        when(userAvatarRepository.save(any(UserAvatar.class))).thenAnswer(i -> i.getArgument(0));

        userAvatarService.upload(user, upload("image/jpeg", pngBytes()));

        verify(userAvatarRepository).save(argThat(saved ->
            UserAvatarService.PNG.equals(saved.getContentType())));
    }

    @Test
    void somethingThatIsNotAnImageIsRefusedWhateverItIsCalled() {
        byte[] notAnImage = "MZ this is an executable".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> userAvatarService.upload(user, upload("image/png", notAnImage)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("JPEG, PNG and WebP");

        verify(userAvatarRepository, never()).save(any());
    }

    @Test
    void replacingAPictureRotatesTheKeySoTheOldUrlStopsResolving() {
        // The key doubles as cache busting: a changed picture is a different URL, which is
        // what lets the serving endpoint mark its responses immutable.
        UserAvatar existing = UserAvatar.builder()
            .id(3L).user(user).avatarKey("old-key").contentType(UserAvatarService.PNG)
            .imageData(pngBytes()).byteSize(pngBytes().length).build();

        when(userAvatarRepository.findByUser(user)).thenReturn(Optional.of(existing));
        when(userAvatarRepository.save(any(UserAvatar.class))).thenAnswer(i -> i.getArgument(0));

        String url = userAvatarService.upload(user, upload("image/png", pngBytes()));

        assertThat(existing.getAvatarKey()).isNotEqualTo("old-key");
        assertThat(url).doesNotContain("old-key");
    }

    @Test
    void removingAPictureLeavesTheAccountWithNoneRatherThanABrokenLink() {
        UserAvatar existing = UserAvatar.builder().id(3L).user(user).avatarKey("key").build();
        user.setProfilePictureUrl("/api/avatars/key");
        when(userAvatarRepository.findByUser(user)).thenReturn(Optional.of(existing));

        userAvatarService.delete(user);

        verify(userAvatarRepository).delete(existing);
        assertThat(user.getProfilePictureUrl()).isNull();
    }
}
