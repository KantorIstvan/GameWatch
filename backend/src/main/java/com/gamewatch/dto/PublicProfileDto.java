package com.gamewatch.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

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
    private boolean isOwnProfile;

    /** Null when the viewer may see the profile but not the library behind it. */
    private ProfileLibraryDto library;

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
    }
}
