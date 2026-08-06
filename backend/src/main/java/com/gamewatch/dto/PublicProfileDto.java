package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Another user's profile, as far as the viewer is allowed to see it.
 *
 * The library block is null rather than zeroed when the viewer is not allowed to see it.
 * Zeros would be indistinguishable from a real empty library, which both misleads the
 * viewer and quietly reveals that a hidden library exists.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProfileDto {
    private String handle;
    private String displayName;
    private String bio;
    private String profilePictureUrl;
    private LocalDate joinedDate;

    private long followerCount;
    private long followingCount;
    private boolean viewerIsFollowing;
    private boolean viewerRequestPending;

    /**
     * Not named {@code isOwnProfile}: Lombok generates {@code isOwnProfile()} for that
     * field, which Jackson serialises as {@code ownProfile} - so the field name would claim
     * a wire name the API never actually sends.
     */
    private boolean ownProfile;

    /** Null when the viewer may see the profile but not the library behind it. */
    private ProfileLibraryDto library;

    /** Null when the viewer may see the profile but not the wishlist behind it. */
    private List<WishlistEntryDto> wishlist;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileLibraryDto {
        private long totalPlaytimeSeconds;
        private int gamesInLibrary;
        private int gamesCompleted;
        private int totalSessions;
        private List<UserStatisticsDto.GameRankingDto> topGames;

        /** How many games this user has personally rated. */
        private long ratingsGiven;

        /** Score (1-10) to how many times this user has given it, for their own histogram. */
        private Map<Integer, Long> ratingDistribution;

        /** This user's most recent written reviews, newest first. */
        private List<ProfileReviewDto> recentReviews;
    }

    /**
     * One review, as it appears on its author's own profile.
     *
     * A leaner shape than {@link GameReviewDto}: the author is implicitly whoever owns this
     * profile, so the game being reviewed is the interesting subject here instead.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileReviewDto {
        private Long gameId;
        private String gameName;
        private String gameBannerImageUrl;

        /** The author's own score for this game, when they left one. */
        private Integer score;

        private String body;
        private boolean containsSpoilers;
        private Instant createdAt;
    }
}
