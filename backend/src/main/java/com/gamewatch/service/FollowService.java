package com.gamewatch.service;

import com.gamewatch.dto.FollowRequestDto;
import com.gamewatch.dto.FollowStateDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.User;
import com.gamewatch.entity.Visibility;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;

    /**
     * Whether {@code viewer} may see something the owner has marked at {@code required}.
     *
     * The one place visibility is decided. Every endpoint that returns another user's data
     * has to route through here rather than comparing enums itself, or the rules drift
     * apart the first time a new surface is added.
     */
    @Transactional(readOnly = true)
    public boolean canView(User viewer, User owner, Visibility required) {
        if (required == Visibility.PUBLIC) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        // Your own data is always yours to see, whatever the setting says.
        if (viewer.getId().equals(owner.getId())) {
            return true;
        }
        if (required == Visibility.PRIVATE) {
            return false;
        }
        return followRepository.isAcceptedFollower(viewer.getId(), owner.getId());
    }

    /**
     * Follows, or asks to.
     *
     * A public profile accepts immediately. A followers-only profile records the request
     * for the owner to decide on - that consent step is the only thing separating
     * FOLLOWERS from PUBLIC. A private profile cannot be followed at all, and says the
     * same thing it would say if it did not exist, so its existence is not confirmed to
     * someone who was not meant to find it.
     */
    @Transactional
    public FollowStateDto follow(User follower, String handle) {
        User followee = requireUserByHandle(handle);

        if (followee.getId().equals(follower.getId())) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }
        if (followee.getProfileVisibility() == Visibility.PRIVATE) {
            throw new IllegalArgumentException("Profile not found");
        }

        Follow existing = followRepository.findByFollowerAndFollowee(follower, followee).orElse(null);
        if (existing != null) {
            return toState(followee, existing);
        }

        boolean acceptedImmediately = followee.getProfileVisibility() == Visibility.PUBLIC;
        Follow follow = followRepository.save(Follow.builder()
            .follower(follower)
            .followee(followee)
            .status(acceptedImmediately ? Follow.FollowStatus.ACCEPTED : Follow.FollowStatus.PENDING)
            .respondedAt(acceptedImmediately ? Instant.now() : null)
            .build());

        log.info("User {} follow of {} recorded as {}", follower.getId(), followee.getId(), follow.getStatus());
        return toState(followee, follow);
    }

    /** Unfollows, or withdraws a request that has not been answered. */
    @Transactional
    public FollowStateDto unfollow(User follower, String handle) {
        User followee = requireUserByHandle(handle);
        followRepository.findByFollowerAndFollowee(follower, followee)
            .ifPresent(followRepository::delete);
        return toState(followee, null);
    }

    @Transactional(readOnly = true)
    public FollowStateDto getFollowState(User viewer, String handle) {
        User followee = requireUserByHandle(handle);
        Follow existing = viewer == null
            ? null
            : followRepository.findByFollowerAndFollowee(viewer, followee).orElse(null);
        return toState(followee, existing);
    }

    @Transactional(readOnly = true)
    public List<FollowRequestDto> getPendingRequests(User user) {
        return followRepository.findPendingRequests(user.getId()).stream()
            .map(follow -> toRequestDto(follow, follow.getFollower()))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FollowRequestDto> getFollowers(User user) {
        return followRepository.findAcceptedFollowers(user.getId()).stream()
            .map(follow -> toRequestDto(follow, follow.getFollower()))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FollowRequestDto> getFollowing(User user) {
        return followRepository.findAcceptedFollowing(user.getId()).stream()
            .map(follow -> toRequestDto(follow, follow.getFollowee()))
            .collect(Collectors.toList());
    }

    @Transactional
    public void respondToRequest(User owner, Long followId, boolean accept) {
        Follow follow = followRepository.findById(followId)
            .orElseThrow(() -> new IllegalArgumentException("Follow request not found"));

        // Answering someone else's request would let anyone grant themselves access to a
        // third party's followers-only data.
        if (!follow.getFollowee().getId().equals(owner.getId())) {
            throw new IllegalArgumentException("Follow request not found");
        }
        if (follow.getStatus() != Follow.FollowStatus.PENDING) {
            throw new IllegalArgumentException("That request has already been answered");
        }

        if (accept) {
            follow.setStatus(Follow.FollowStatus.ACCEPTED);
            follow.setRespondedAt(Instant.now());
            followRepository.save(follow);
        } else {
            followRepository.delete(follow);
        }
        log.info("User {} {} follow request {}", owner.getId(), accept ? "accepted" : "rejected", followId);
    }

    private User requireUserByHandle(String handle) {
        return userRepository.findByHandleIgnoreCase(handle)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
    }

    private FollowStateDto toState(User followee, Follow follow) {
        return FollowStateDto.builder()
            .handle(followee.getHandle())
            .following(follow != null && follow.getStatus() == Follow.FollowStatus.ACCEPTED)
            .requestPending(follow != null && follow.getStatus() == Follow.FollowStatus.PENDING)
            .followerCount(followRepository.countAcceptedFollowers(followee.getId()))
            .followingCount(followRepository.countAcceptedFollowing(followee.getId()))
            .build();
    }

    private FollowRequestDto toRequestDto(Follow follow, User other) {
        return FollowRequestDto.builder()
            .followId(follow.getId())
            .handle(other.getHandle())
            .displayName(other.getDisplayName() != null ? other.getDisplayName() : other.getUsername())
            .profilePictureUrl(other.getProfilePictureUrl())
            .createdAt(follow.getCreatedAt())
            .build();
    }
}
