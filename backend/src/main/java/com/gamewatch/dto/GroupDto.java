package com.gamewatch.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDto {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String ownerHandle;
    private int memberCount;
    private boolean viewerIsMember;
    private boolean viewerIsOwner;
    private List<ChallengeDto> challenges;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChallengeDto {
        private Long id;
        private String name;
        private String metric;
        private Integer target;
        private String startsOn;
        private String endsOn;
        private boolean active;
        private List<StandingDto> standings;
    }

    /**
     * One member's position in a challenge.
     *
     * Scores are counts of finishing, breadth or regularity - never hours. See
     * GroupChallenge.ChallengeMetric for why.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StandingDto {
        private String handle;
        private String displayName;
        private String profilePictureUrl;
        private int score;
        private boolean reachedTarget;
    }
}
