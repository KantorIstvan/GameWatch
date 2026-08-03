package com.gamewatch.service;

import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import com.gamewatch.util.HandleValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public User getOrCreateUser(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String auth0UserId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String username = jwt.getClaimAsString("nickname");
        String pictureUrl = jwt.getClaimAsString("picture");

        Optional<User> existingUser = userRepository.findByAuth0UserId(auth0UserId);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }
        
        try {
            log.info("Creating new user for auth0UserId: {}", auth0UserId);
            User newUser = User.builder()
                .auth0UserId(auth0UserId)
                .email(email)
                .username(username)
                .profilePictureUrl(pictureUrl)
                .build();
            return userRepository.save(newUser);
        } catch (Exception e) {
            log.debug("Concurrent user creation detected, fetching existing user");
            return userRepository.findByAuth0UserId(auth0UserId)
                .orElseThrow(() -> new RuntimeException("Failed to create or find user"));
        }
    }

    public User getUserByAuth0Id(String auth0UserId) {
        return userRepository.findByAuth0UserId(auth0UserId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateAge(User user, Integer age) {
        if (age != null && (age < 0 || age > 150)) {
            throw new RuntimeException("Invalid age. Must be between 0 and 150.");
        }
        user.setAge(age);
        user = userRepository.save(user);
        log.info("Updated age for user {}: {}", user.getId(), age);
        return user;
    }

    @Transactional
    public User updateTimezone(User user, String timezone) {
        user.setTimezone(timezone);
        user = userRepository.save(user);
        log.info("Updated timezone for user {}: {}", user.getId(), timezone);
        return user;
    }

    @Transactional
    public User updateFirstDayOfWeek(User user, String firstDayOfWeek) {
        if (firstDayOfWeek != null && !firstDayOfWeek.equals("MONDAY") && !firstDayOfWeek.equals("SUNDAY")) {
            throw new RuntimeException("Invalid first day of week. Must be MONDAY or SUNDAY.");
        }
        user.setFirstDayOfWeek(firstDayOfWeek);
        user = userRepository.save(user);
        log.info("Updated first day of week for user {}: {}", user.getId(), firstDayOfWeek);
        return user;
    }

    @Transactional(readOnly = true)
    public ProfileSettingsDto getProfileSettings(User user) {
        return mapToProfileSettings(user);
    }

    /**
     * Updates the parts of a profile the user controls.
     *
     * Handles are claimed case-insensitively and cannot be taken from another account. The
     * uniqueness check races against concurrent claims, so the database index is the real
     * guarantee and the constraint violation is translated back into the same message
     * rather than surfacing as a 500.
     */
    @Transactional
    public ProfileSettingsDto updateProfileSettings(User user, ProfileSettingsDto request) {
        if (request.getHandle() != null && !request.getHandle().isBlank()) {
            String normalized = HandleValidator.normalize(request.getHandle());
            String rejection = HandleValidator.rejectionReason(normalized);
            if (rejection != null) {
                throw new IllegalArgumentException(rejection);
            }

            Long ownId = user.getId();
            boolean claimedBySomeoneElse = userRepository.findByHandleIgnoreCase(normalized)
                .filter(owner -> !owner.getId().equals(ownId))
                .isPresent();
            if (claimedBySomeoneElse) {
                throw new IllegalArgumentException("That handle is already taken");
            }

            user.setHandle(normalized);
        }

        if (request.getDisplayName() != null) {
            String trimmed = request.getDisplayName().trim();
            if (trimmed.length() > 50) {
                throw new IllegalArgumentException("Display name must be at most 50 characters");
            }
            user.setDisplayName(trimmed.isEmpty() ? null : trimmed);
        }

        if (request.getBio() != null) {
            String trimmed = request.getBio().trim();
            if (trimmed.length() > 300) {
                throw new IllegalArgumentException("Bio must be at most 300 characters");
            }
            user.setBio(trimmed.isEmpty() ? null : trimmed);
        }

        // A profile nobody can see cannot meaningfully expose a library, so the library
        // setting is clamped rather than silently contradicting the profile setting.
        if (request.getProfileVisibility() != null) {
            user.setProfileVisibility(request.getProfileVisibility());
        }
        if (request.getLibraryVisibility() != null) {
            user.setLibraryVisibility(request.getLibraryVisibility());
        }
        if (user.getLibraryVisibility().isMoreVisibleThan(user.getProfileVisibility())) {
            user.setLibraryVisibility(user.getProfileVisibility());
        }

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Lost the race for this handle between the check above and the write.
            throw new IllegalArgumentException("That handle is already taken");
        }

        log.info("Updated profile settings for user {}", user.getId());
        return mapToProfileSettings(user);
    }

    @Transactional(readOnly = true)
    public boolean isHandleAvailable(User user, String handle) {
        String normalized = HandleValidator.normalize(handle);
        if (HandleValidator.rejectionReason(normalized) != null) {
            return false;
        }
        return userRepository.findByHandleIgnoreCase(normalized)
            .map(owner -> owner.getId().equals(user.getId()))
            .orElse(true);
    }

    private ProfileSettingsDto mapToProfileSettings(User user) {
        return ProfileSettingsDto.builder()
            .handle(user.getHandle())
            .displayName(user.getDisplayName())
            .bio(user.getBio())
            .profileVisibility(user.getProfileVisibility())
            .libraryVisibility(user.getLibraryVisibility())
            .build();
    }

    @Transactional
    public void deleteAccount(User user) {
        log.info("Deleting account for user: {}", user.getId());
        userRepository.delete(user);
        log.info("Account deleted successfully for user: {}", user.getId());
    }
}
