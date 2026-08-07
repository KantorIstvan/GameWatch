package com.gamewatch.repository;

import com.gamewatch.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * Candidates for people search. Rows without a handle cannot be addressed at all, so
     * they are excluded here rather than filtered out afterwards.
     *
     * Handles match on prefix and names on substring: a handle is an identifier people
     * type from the start, a name is prose they remember a fragment of.
     *
     * The Auth0 username is searched alongside the chosen display name because it is the
     * only name most accounts have - display_name is null until someone fills the settings
     * form in, and searching for a person by the name they actually go by should not
     * depend on whether they have done that.
     */
    @Query("SELECT u FROM User u WHERE u.handle IS NOT NULL AND ("
        + "LOWER(u.handle) LIKE CONCAT(:query, '%') "
        + "OR LOWER(u.displayName) LIKE CONCAT('%', :query, '%') "
        + "OR LOWER(u.username) LIKE CONCAT('%', :query, '%'))")
    List<User> searchByHandleOrName(@Param("query") String query);

    /**
     * The admin directory's search, deliberately not a reuse of searchByHandleOrName:
     * that one requires a non-null handle because it exists to find people who can be
     * followed. An account stuck mid-onboarding with no handle at all still needs to be
     * findable here - "can't get past onboarding" is exactly the kind of ticket this
     * search exists for. The exact id match is cheap to add and directly useful for a
     * support ticket that quotes a raw user id.
     */
    @Query("SELECT u FROM User u WHERE :query = '' "
        + "OR LOWER(u.email) LIKE CONCAT('%', :query, '%') "
        + "OR LOWER(u.handle) LIKE CONCAT('%', :query, '%') "
        + "OR LOWER(u.displayName) LIKE CONCAT('%', :query, '%') "
        + "OR LOWER(u.username) LIKE CONCAT('%', :query, '%') "
        + "OR CAST(u.id AS string) = :query")
    Page<User> searchForAdmin(@Param("query") String query, Pageable pageable);
}
