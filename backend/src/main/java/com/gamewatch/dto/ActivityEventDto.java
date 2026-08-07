package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/**
 * One thing someone you follow did - finished, dropped, picked up or started a
 * playthrough; wrote a review; rated a game; or added one to their wishlist.
 *
 * Derived from that underlying state rather than stored as its own row. A denormalised
 * feed table would have to be written on every one of those actions and then kept in step
 * with edits, deletions and visibility changes; deriving it means a playthrough that
 * becomes private, or a review that is deleted, simply stops appearing.
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

    /** FINISHED, DROPPED, PICKED_UP, STARTED, REVIEWED, RATED or WISHLISTED. */
    private String type;

    private Long gameId;
    private String gameName;
    private String bannerImageUrl;

    /** Only meaningful for the playthrough-derived types (FINISHED/DROPPED/PICKED_UP/STARTED). */
    private long playtimeSeconds;

    /** Only set for RATED - the 1-10 score given. */
    private Integer score;

    private Instant occurredAt;
}
