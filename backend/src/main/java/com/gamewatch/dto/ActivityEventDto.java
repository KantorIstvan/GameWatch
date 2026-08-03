package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/**
 * One thing someone you follow did.
 *
 * Derived from playthrough state rather than stored as its own row. A denormalised feed
 * table would have to be written on every timer action and then kept in step with edits,
 * deletions and visibility changes; deriving it means a playthrough that becomes private,
 * or is deleted, simply stops appearing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityEventDto {
    /** Stable within a response, for React keys - not a database id. */
    private String id;

    private String actorHandle;
    private String actorDisplayName;
    private String actorPictureUrl;

    /** FINISHED, DROPPED, PICKED_UP or STARTED. */
    private String type;

    private Long gameId;
    private String gameName;
    private String bannerImageUrl;
    private long playtimeSeconds;
    private Instant occurredAt;
}
