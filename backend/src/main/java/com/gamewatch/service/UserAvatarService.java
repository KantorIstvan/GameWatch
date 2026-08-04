package com.gamewatch.service;

import com.gamewatch.entity.User;
import com.gamewatch.entity.UserAvatar;
import com.gamewatch.repository.UserAvatarRepository;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * Uploading, replacing and removing a profile picture.
 *
 * The bytes live in PostgreSQL rather than on disk or in object storage. An avatar is a few
 * tens of kilobytes and there are at most as many of them as there are accounts, so the
 * alternative buys nothing here except another piece of infrastructure to run, back up and
 * keep in sync with the row that points at it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserAvatarService {

    /**
     * Ceiling on a stored picture.
     *
     * The uploader downscales to 512px before sending, so a real avatar lands far under
     * this. It is a backstop against a direct API call, not the size anything is expected
     * to be, which is why it can afford to be generous.
     */
    private static final int MAX_BYTES = 2 * 1024 * 1024;

    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";
    public static final String WEBP = "image/webp";

    private final UserAvatarRepository userAvatarRepository;
    private final UserRepository userRepository;

    /**
     * Replaces this user's picture, and points their profile at the new bytes.
     *
     * {@code profile_picture_url} on the user is rewritten rather than left alone, because
     * every other surface that shows a face - search results, follow lists, review authors,
     * group members, the comparison page - already reads that one column. Writing the URL
     * there is what makes an upload show up in all of them without each one learning about
     * avatars.
     */
    @Transactional
    public String upload(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No image was uploaded");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("That image is too large. The limit is 2 MB.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("That image could not be read");
        }

        // Sniffed, not taken from the request: a Content-Type header is whatever the caller
        // chose to write, so trusting it would let anything at all be stored and then served
        // back to a browser as an image.
        String contentType = detectContentType(bytes);
        if (contentType == null) {
            throw new IllegalArgumentException("Only JPEG, PNG and WebP images are supported");
        }

        UserAvatar avatar = userAvatarRepository.findByUser(user)
            .orElseGet(() -> UserAvatar.builder().user(user).build());

        // A new key on every upload: the old URL keeps pointing at bytes that no longer
        // exist rather than at a stale picture, and caches never need invalidating.
        avatar.setAvatarKey(UUID.randomUUID().toString());
        avatar.setContentType(contentType);
        avatar.setImageData(bytes);
        avatar.setByteSize(bytes.length);
        avatar = userAvatarRepository.save(avatar);

        String url = publicUrl(avatar.getAvatarKey());
        user.setProfilePictureUrl(url);
        userRepository.save(user);

        log.info("User {} uploaded a {} byte {} avatar", user.getId(), bytes.length, contentType);
        return url;
    }

    /**
     * Removes the uploaded picture, leaving the account with no picture at all.
     *
     * Not a revert to the Auth0 one: that value was copied into the column when the account
     * was created and has been overwritten by now, so there is nothing to revert to. An
     * account with no picture falls back to its initial, which is a deliberate look rather
     * than a broken image.
     */
    @Transactional
    public void delete(User user) {
        userAvatarRepository.findByUser(user).ifPresent(userAvatarRepository::delete);
        user.setProfilePictureUrl(null);
        userRepository.save(user);
        log.info("User {} removed their avatar", user.getId());
    }

    @Transactional(readOnly = true)
    public UserAvatar findByKey(String avatarKey) {
        return userAvatarRepository.findByAvatarKey(avatarKey)
            .orElseThrow(() -> new IllegalArgumentException("Avatar not found"));
    }

    /**
     * Relative on purpose. Both the dev server and the production nginx serve the API under
     * {@code /api} on the same origin as the app, so a relative URL survives moving between
     * them - and, unlike an absolute one, does not get baked into the database pointing at
     * whichever host happened to be running when the picture was uploaded.
     */
    private String publicUrl(String avatarKey) {
        return "/api/avatars/" + avatarKey;
    }

    /** The image formats a browser will render, identified by their leading bytes. */
    private String detectContentType(byte[] bytes) {
        if (bytes.length >= 3
            && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return JPEG;
        }
        if (bytes.length >= 8
            && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
            && bytes[4] == '\r' && bytes[5] == '\n' && (bytes[6] & 0xFF) == 0x1A && bytes[7] == '\n') {
            return PNG;
        }
        // "RIFF" .... "WEBP"
        if (bytes.length >= 12
            && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
            && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return WEBP;
        }
        return null;
    }
}
