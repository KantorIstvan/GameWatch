package com.gamewatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** One row of the admin user directory - deliberately not the full User entity. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserSummaryDto {
    private Long id;
    private String auth0UserId;
    private String email;
    private String username;
    private String handle;
    private String displayName;
    private String profilePictureUrl;
    private Instant createdAt;
}
