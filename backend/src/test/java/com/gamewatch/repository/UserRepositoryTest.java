package com.gamewatch.repository;

import com.gamewatch.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByAuth0UserId_ExistingUser_ReturnsUser() {
        User user = User.builder()
            .auth0UserId("auth0|test123")
            .email("test@example.com")
            .username("testuser")
            .profilePictureUrl("https://example.com/picture.jpg")
            .build();
        entityManager.persist(user);
        entityManager.flush();

        Optional<User> result = userRepository.findByAuth0UserId("auth0|test123");

        assertThat(result).isPresent();
        assertThat(result.get().getAuth0UserId()).isEqualTo("auth0|test123");
        assertThat(result.get().getEmail()).isEqualTo("test@example.com");
        assertThat(result.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    void findByAuth0UserId_NonExistingUser_ReturnsEmpty() {
        Optional<User> result = userRepository.findByAuth0UserId("auth0|nonexistent");

        assertThat(result).isEmpty();
    }

    @Test
    void save_PersistsUser() {
        User user = User.builder()
            .auth0UserId("auth0|newuser")
            .email("newuser@example.com")
            .username("newuser")
            .profilePictureUrl("https://example.com/new.jpg")
            .build();

        User saved = userRepository.save(user);
        entityManager.flush();
        entityManager.clear();

        User found = entityManager.find(User.class, saved.getId());
        assertThat(found).isNotNull();
        assertThat(found.getAuth0UserId()).isEqualTo("auth0|newuser");
        assertThat(found.getEmail()).isEqualTo("newuser@example.com");
    }

    @Test
    void save_UpdatesExistingUser() {
        User user = User.builder()
            .auth0UserId("auth0|update")
            .email("old@example.com")
            .username("oldname")
            .build();
        entityManager.persist(user);
        entityManager.flush();
        entityManager.clear();

        User found = userRepository.findByAuth0UserId("auth0|update").orElseThrow();
        found.setEmail("new@example.com");
        found.setUsername("newname");
        userRepository.save(found);
        entityManager.flush();
        entityManager.clear();

        User updated = userRepository.findByAuth0UserId("auth0|update").orElseThrow();
        assertThat(updated.getEmail()).isEqualTo("new@example.com");
        assertThat(updated.getUsername()).isEqualTo("newname");
    }

    @Test
    void delete_RemovesUser() {
        User user = User.builder()
            .auth0UserId("auth0|delete")
            .email("delete@example.com")
            .username("deleteuser")
            .build();
        entityManager.persist(user);
        entityManager.flush();
        Long userId = user.getId();

        userRepository.delete(user);
        entityManager.flush();

        User found = entityManager.find(User.class, userId);
        assertThat(found).isNull();
        assertThat(userRepository.findByAuth0UserId("auth0|delete")).isEmpty();
    }

    @Test
    void save_WithMinimalFields() {
        User user = User.builder()
            .auth0UserId("auth0|minimal")
            .build();

        User saved = userRepository.save(user);
        entityManager.flush();

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getAuth0UserId()).isEqualTo("auth0|minimal");
        assertThat(saved.getEmail()).isNull();
        assertThat(saved.getUsername()).isNull();
    }

    @Test
    void findByAuth0UserId_IsCaseSensitive() {
        User user = User.builder()
            .auth0UserId("auth0|CaseSensitive")
            .email("test@example.com")
            .build();
        entityManager.persist(user);
        entityManager.flush();

        Optional<User> upperCase = userRepository.findByAuth0UserId("auth0|CASESENSITIVE");
        Optional<User> lowerCase = userRepository.findByAuth0UserId("auth0|casesensitive");
        Optional<User> correct = userRepository.findByAuth0UserId("auth0|CaseSensitive");

        assertThat(upperCase).isEmpty();
        assertThat(lowerCase).isEmpty();
        assertThat(correct).isPresent();
    }
}
