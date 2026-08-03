package com.gamewatch.repository;

import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByAuth0UserId(String auth0UserId);

    /**
     * Handles are compared case-insensitively so @Kantor and @kantor cannot both exist.
     * Backed by the LOWER(handle) unique index, which is the real guarantee.
     */
    Optional<User> findByHandleIgnoreCase(String handle);

    /**
     * Candidates for handle search. Rows without a handle cannot be addressed at all, so
     * they are excluded here rather than filtered out afterwards.
     *
     * Handles match on prefix and display names on substring: a handle is an identifier
     * people type from the start, a display name is prose they remember a fragment of.
     */
    @Query("SELECT u FROM User u WHERE u.handle IS NOT NULL AND ("
        + "LOWER(u.handle) LIKE CONCAT(:query, '%') "
        + "OR LOWER(u.displayName) LIKE CONCAT('%', :query, '%'))")
    List<User> searchByHandleOrDisplayName(@Param("query") String query);
}
