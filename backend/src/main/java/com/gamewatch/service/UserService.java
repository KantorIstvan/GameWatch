package com.gamewatch.service;

import com.gamewatch.dto.OnboardingRequestDto;
import com.gamewatch.dto.OnboardingStatusDto;
import com.gamewatch.dto.ProfileSettingsDto;
import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import com.gamewatch.util.HandleGenerator;
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

    private static final int DISPLAY_NAME_MAX_LENGTH = 50;

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
            // Deliberately no handle and no display name: both are chosen in onboarding,
            // which the account is held in until it has them. Assigning a handle here
            // would claim a name in the unique index that the person never agreed to, and
            // would leave "has this account chosen an identity yet?" with no honest answer.
            User newUser = User.builder()
                .auth0UserId(auth0UserId)
                .email(email)
                .username(username)
                .profilePictureUrl(pictureUrl)
                .build();
            return userRepository.save(newUser);
        } catch (Exception e) {
            // The same account signing in twice at once ends up here, and the row the
            // other request wrote is what we want.
            log.debug("User creation failed for {}, re-reading", auth0UserId, e);
            return userRepository.findByAuth0UserId(auth0UserId)
                .orElseThrow(() -> new RuntimeException("Failed to create or find user"));
        }
    }

    /**
     * A free handle to offer as a starting point, never one that gets assigned.
     *
     * Nickname first, email local-part second: the nickname is the closest thing Auth0
     * gives us to a name the person chose. Both can be absent for some connections, in
     * which case {@link HandleGenerator} falls back to a generic base.
     *
     * Advisory, like every availability answer here - another account can claim the
     * suggestion between this call and the moment it is submitted, and the unique index is
     * what actually decides.
     */
    private String suggestHandle(User user) {
        String source = user.getUsername() != null && !user.getUsername().isBlank()
            ? user.getUsername()
            : user.getEmail();
        return HandleGenerator.generateUnique(
            source,
            candidate -> userRepository.findByHandleIgnoreCase(candidate).isPresent());
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

    /**
     * Whether an account has the identity the rest of the app assumes it has.
     *
     * Derived rather than flagged. Every social surface addresses people by handle and
     * labels them by display name; an account missing either is one the app cannot render,
     * so "is onboarding done?" and "are both fields set?" are the same question. A stored
     * flag would be a second copy of that answer, and the moment the two disagree the flag
     * is the one that is wrong.
     *
     * Accounts that predate onboarding satisfy this already - handles were backfilled in
     * V40 - so nobody who has both fields is sent back through the form.
     */
    public static boolean isOnboardingComplete(User user) {
        return hasText(user.getHandle()) && hasText(user.getDisplayName());
    }

    @Transactional(readOnly = true)
    public OnboardingStatusDto getOnboardingStatus(User user) {
        return mapToOnboardingStatus(user);
    }

    /**
     * Claims the handle and display name a new account cannot function without.
     *
     * Separate from {@link #updateProfileSettings} because the shapes are different: that
     * one patches whichever fields were sent, this one refuses to half-finish. Handle rules
     * come from {@link HandleValidator}, the same ones the settings form is held to, so a
     * name accepted here can never be one the settings form would have rejected.
     *
     * The uniqueness check races against concurrent claims exactly as the settings form
     * does, and the unique index on LOWER(handle) is the real guarantee - the violation is
     * translated back into the same message rather than surfacing as a 500.
     */
    @Transactional
    public OnboardingStatusDto completeOnboarding(User user, OnboardingRequestDto request) {
        String handle = HandleValidator.normalize(request.getHandle());
        String rejection = HandleValidator.rejectionReason(handle);
        if (rejection != null) {
            throw new IllegalArgumentException(rejection);
        }

        String displayName = request.getDisplayName() == null ? "" : request.getDisplayName().trim();
        if (displayName.isEmpty()) {
            throw new IllegalArgumentException("Display name is required");
        }
        if (displayName.length() > DISPLAY_NAME_MAX_LENGTH) {
            throw new IllegalArgumentException(
                "Display name must be at most " + DISPLAY_NAME_MAX_LENGTH + " characters");
        }

        Long ownId = user.getId();
        boolean claimedBySomeoneElse = userRepository.findByHandleIgnoreCase(handle)
            .filter(owner -> !owner.getId().equals(ownId))
            .isPresent();
        if (claimedBySomeoneElse) {
            throw new IllegalArgumentException("That handle is already taken");
        }

        user.setHandle(handle);
        user.setDisplayName(displayName);

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("That handle is already taken");
        }

        log.info("Completed onboarding for user {}", user.getId());
        return mapToOnboardingStatus(user);
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

        // Clearing it is not an edit, it is an account that can no longer be rendered - and
        // it would bounce its owner straight back into onboarding on the next navigation.
        if (request.getDisplayName() != null) {
            String trimmed = request.getDisplayName().trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("Display name is required");
            }
            if (trimmed.length() > DISPLAY_NAME_MAX_LENGTH) {
                throw new IllegalArgumentException(
                    "Display name must be at most " + DISPLAY_NAME_MAX_LENGTH + " characters");
            }
            user.setDisplayName(trimmed);
        }

        if (request.getBio() != null) {
            String trimmed = request.getBio().trim();
            if (trimmed.length() > 300) {
                throw new IllegalArgumentException("Bio must be at most 300 characters");
            }
            user.setBio(trimmed.isEmpty() ? null : trimmed);
        }

        // A profile nobody can see cannot meaningfully expose a library or a wishlist, so
        // both settings are clamped rather than silently contradicting the profile setting.
        if (request.getProfileVisibility() != null) {
            user.setProfileVisibility(request.getProfileVisibility());
        }
        if (request.getLibraryVisibility() != null) {
            user.setLibraryVisibility(request.getLibraryVisibility());
        }
        if (request.getWishlistVisibility() != null) {
            user.setWishlistVisibility(request.getWishlistVisibility());
        }
        if (user.getLibraryVisibility().isMoreVisibleThan(user.getProfileVisibility())) {
            user.setLibraryVisibility(user.getProfileVisibility());
        }
        if (user.getWishlistVisibility().isMoreVisibleThan(user.getProfileVisibility())) {
            user.setWishlistVisibility(user.getProfileVisibility());
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

    private OnboardingStatusDto mapToOnboardingStatus(User user) {
        boolean hasHandle = hasText(user.getHandle());
        return OnboardingStatusDto.builder()
            .completed(isOnboardingComplete(user))
            .handle(user.getHandle())
            .displayName(user.getDisplayName())
            // Generating one costs a lookup loop, so it is skipped entirely once there is
            // nothing left to suggest.
            .suggestedHandle(hasHandle ? null : suggestHandle(user))
            .suggestedDisplayName(user.getUsername())
            .build();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private ProfileSettingsDto mapToProfileSettings(User user) {
        return ProfileSettingsDto.builder()
            .handle(user.getHandle())
            .displayName(user.getDisplayName())
            .bio(user.getBio())
            .profileVisibility(user.getProfileVisibility())
            .libraryVisibility(user.getLibraryVisibility())
            .wishlistVisibility(user.getWishlistVisibility())
            .profilePictureUrl(user.getProfilePictureUrl())
            .build();
    }

    @Transactional
    public void deleteAccount(User user) {
        log.info("Deleting account for user: {}", user.getId());
        userRepository.delete(user);
        log.info("Account deleted successfully for user: {}", user.getId());
    }
}
