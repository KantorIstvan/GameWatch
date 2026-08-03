package com.gamewatch.dto;

import lombok.*;

import java.util.List;

/**
 * Two libraries side by side.
 *
 * Only reachable when the other person's library is visible to the viewer, so this adds no
 * new access - it rearranges what a profile already shows into a form that can be read
 * against your own.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileComparisonDto {
    private SideDto you;
    private SideDto them;
    private List<SharedGameDto> sharedGames;
    private int sharedGameCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SideDto {
        private String handle;
        private String displayName;
        private String profilePictureUrl;
        private long totalPlaytimeSeconds;
        private int gamesInLibrary;
        private int gamesCompleted;
        private int totalSessions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedGameDto {
        private Long gameId;
        private String gameName;
        private String bannerImageUrl;
        private long yourSeconds;
        private long theirSeconds;
        private boolean youFinished;
        private boolean theyFinished;
    }
}
