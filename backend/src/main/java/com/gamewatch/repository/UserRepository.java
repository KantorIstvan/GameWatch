package com.gamewatch.repository;

import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByAuth0UserId(String auth0UserId);

    /**
     * Handles are compared case-insensitively so @Kantor and @kantor cannot both exist.
     * Backed by the LOWER(handle) unique index, which is the real guarantee.
     */
    Optional<User> findByHandleIgnoreCase(String handle);
}
