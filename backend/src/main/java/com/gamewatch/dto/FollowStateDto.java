package com.gamewatch.dto;

import lombok.*;

/** The viewer's relationship to a profile, and that profile's follower counts. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowStateDto {
    private String handle;
    private boolean following;
    /** True while a request to a followers-only profile is waiting to be answered. */
    private boolean requestPending;
    private long followerCount;
    private long followingCount;
}
