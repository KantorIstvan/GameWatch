package com.gamewatch.service;

import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Transactional
    public void deleteAccount(User user) {
        log.info("Deleting account for user: {}", user.getId());
        userRepository.delete(user);
        log.info("Account deleted successfully for user: {}", user.getId());
    }
}
