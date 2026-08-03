package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/** The other person in a follow relationship, for request and follower lists. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowRequestDto {
    private Long followId;
    private String handle;
    private String displayName;
    private String profilePictureUrl;
    private Instant createdAt;
}
