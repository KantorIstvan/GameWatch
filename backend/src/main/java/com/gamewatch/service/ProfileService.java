package com.gamewatch.service;

import com.gamewatch.dto.PublicProfileDto;
import com.gamewatch.dto.UserStatisticsDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.entity.Visibility;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.UserRepository;
import com.gamewatch.util.TimezoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private static final int TOP_GAMES_ON_PROFILE = 5;

    private final UserRepository userRepository;
    private final PlaythroughRepository playthroughRepository;
    private final UserGameRepository userGameRepository;
    private final FollowRepository followRepository;
    private final FollowService followService;

    /**
     * A profile as far as the viewer is allowed to see it.
     *
     * A profile the viewer may not see is reported as absent rather than forbidden. The
     * difference matters: "you are not allowed to see this" confirms the handle belongs to
     * someone, which is exactly what a private profile is trying not to do.
     */
    @Transactional(readOnly = true)
    public PublicProfileDto getProfile(User viewer, String handle) {
        User owner = userRepository.findByHandleIgnoreCase(handle)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        if (!followService.canView(viewer, owner, owner.getProfileVisibility())) {
            throw new IllegalArgumentException("Profile not found");
        }

        boolean isOwnProfile = viewer != null && viewer.getId().equals(owner.getId());
        boolean libraryVisible = followService.canView(viewer, owner, owner.getLibraryVisibility());

        return PublicProfileDto.builder()
            .handle(owner.getHandle())
            .displayName(owner.getDisplayName() != null ? owner.getDisplayName() : owner.getUsername())
            .bio(owner.getBio())
            .profilePictureUrl(owner.getProfilePictureUrl())
            .joinedDate(owner.getCreatedAt().atZone(TimezoneUtils.resolveZone(owner)).toLocalDate())
            .followerCount(followRepository.countAcceptedFollowers(owner.getId()))
            .followingCount(followRepository.countAcceptedFollowing(owner.getId()))
            .viewerIsFollowing(!isOwnProfile && viewer != null
                && followRepository.isAcceptedFollower(viewer.getId(), owner.getId()))
            .viewerRequestPending(!isOwnProfile && viewer != null
                && followRepository.findByFollowerAndFollowee(viewer, owner)
                    .map(follow -> follow.getStatus() == Follow.FollowStatus.PENDING)
                    .orElse(false))
            .isOwnProfile(isOwnProfile)
            // Null, not an empty block: zeros are indistinguishable from a real empty
            // library, which misleads the viewer and hints that a hidden one exists.
            .library(libraryVisible ? buildLibrary(owner) : null)
            .build();
    }

    private PublicProfileDto.ProfileLibraryDto buildLibrary(User owner) {
        List<Playthrough> playthroughs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(owner.getId());

        Map<Long, Long> playtimeByGame = playthroughs.stream()
            .collect(Collectors.groupingBy(
                p -> p.getGame().getId(),
                Collectors.summingLong(Playthrough::effectivePlaytimeSeconds)));

        Map<Long, Playthrough> anyPlaythroughForGame = playthroughs.stream()
            .collect(Collectors.toMap(p -> p.getGame().getId(), p -> p, (first, second) -> first));

        List<UserStatisticsDto.GameRankingDto> topGames = playtimeByGame.entrySet().stream()
            .filter(entry -> entry.getValue() > 0)
            .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
            .limit(TOP_GAMES_ON_PROFILE)
            .map(entry -> {
                Playthrough sample = anyPlaythroughForGame.get(entry.getKey());
                return UserStatisticsDto.GameRankingDto.builder()
                    .gameId(sample.getGame().getId())
                    .gameName(sample.getGame().getName())
                    .bannerImageUrl(sample.getGame().getBannerImageUrl())
                    .playtimeSeconds(entry.getValue())
                    .build();
            })
            .collect(Collectors.toList());

        return PublicProfileDto.ProfileLibraryDto.builder()
            .totalPlaytimeSeconds(playthroughs.stream()
                .mapToLong(Playthrough::effectivePlaytimeSeconds).sum())
            .gamesInLibrary(userGameRepository.findGamesByUser(owner).size())
            .gamesCompleted((int) playthroughs.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
                .map(p -> p.getGame().getId())
                .distinct()
                .count())
            .totalSessions(playthroughs.stream()
                .mapToInt(p -> p.getSessionCount() != null ? p.getSessionCount() : 0).sum())
            .topGames(topGames)
            .build();
    }

    /**
     * Handle search, restricted to profiles the viewer could actually open.
     *
     * Returning profiles the viewer cannot view would turn search into a way to enumerate
     * accounts that have deliberately hidden themselves. The viewer's own account never
     * appears here - there is nothing to search yourself up to do, and following yourself
     * is rejected anyway.
     *
     * Each result carries the same follow-state fields {@link #getProfile} returns, so a
     * follow button in a result row starts in the right state instead of defaulting to
     * "Follow" for someone already followed.
     */
    @Transactional(readOnly = true)
    public List<PublicProfileDto> search(User viewer, String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        return userRepository.searchByHandleOrDisplayName(query.trim().toLowerCase()).stream()
            .filter(candidate -> viewer == null || !candidate.getId().equals(viewer.getId()))
            .filter(candidate -> candidate.getProfileVisibility() != Visibility.PRIVATE)
            .filter(candidate -> followService.canView(viewer, candidate, candidate.getProfileVisibility()))
            .sorted(Comparator.comparing(User::getHandle))
            .limit(20)
            .map(candidate -> PublicProfileDto.builder()
                .handle(candidate.getHandle())
                .displayName(candidate.getDisplayName() != null
                    ? candidate.getDisplayName() : candidate.getUsername())
                .profilePictureUrl(candidate.getProfilePictureUrl())
                .followerCount(followRepository.countAcceptedFollowers(candidate.getId()))
                .followingCount(followRepository.countAcceptedFollowing(candidate.getId()))
                .viewerIsFollowing(viewer != null
                    && followRepository.isAcceptedFollower(viewer.getId(), candidate.getId()))
                .viewerRequestPending(viewer != null
                    && followRepository.findByFollowerAndFollowee(viewer, candidate)
                        .map(follow -> follow.getStatus() == Follow.FollowStatus.PENDING)
                        .orElse(false))
                .build())
            .collect(Collectors.toList());
    }
}
