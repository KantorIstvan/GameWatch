package com.gamewatch.repository;

import com.gamewatch.entity.Follow;
import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    Optional<Follow> findByFollowerAndFollowee(User follower, User followee);

    @Query("SELECT f FROM Follow f WHERE f.followee.id = :userId AND f.status = 'ACCEPTED' "
        + "ORDER BY f.createdAt DESC")
    List<Follow> findAcceptedFollowers(@Param("userId") Long userId);

    @Query("SELECT f FROM Follow f WHERE f.follower.id = :userId AND f.status = 'ACCEPTED' "
        + "ORDER BY f.createdAt DESC")
    List<Follow> findAcceptedFollowing(@Param("userId") Long userId);

    @Query("SELECT f FROM Follow f WHERE f.followee.id = :userId AND f.status = 'PENDING' "
        + "ORDER BY f.createdAt DESC")
    List<Follow> findPendingRequests(@Param("userId") Long userId);

    /**
     * Whether the viewer is inside the owner's followers circle. This is the single check
     * that {@link com.gamewatch.entity.Visibility#FOLLOWERS} resolves to, so it must only
     * ever count accepted follows - a pending request is someone asking, not someone let in.
     */
    @Query("SELECT COUNT(f) > 0 FROM Follow f WHERE f.follower.id = :viewerId "
        + "AND f.followee.id = :ownerId AND f.status = 'ACCEPTED'")
    boolean isAcceptedFollower(@Param("viewerId") Long viewerId, @Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(f) FROM Follow f WHERE f.followee.id = :userId AND f.status = 'ACCEPTED'")
    long countAcceptedFollowers(@Param("userId") Long userId);

    @Query("SELECT COUNT(f) FROM Follow f WHERE f.follower.id = :userId AND f.status = 'ACCEPTED'")
    long countAcceptedFollowing(@Param("userId") Long userId);
}
