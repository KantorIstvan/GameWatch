package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/**
 * A review, with the evidence behind its author's opinion.
 *
 * Playtime and completion travel with the review because they are the thing this app can
 * show that a review site cannot: whether the person writing actually played the game.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameReviewDto {
    private Long id;
    private String authorHandle;
    private String authorDisplayName;
    private String authorPictureUrl;
    /** The author's own score, when they left one. */
    private Integer authorScore;
    private long authorPlaytimeSeconds;
    private boolean authorFinished;

    private String body;
    private boolean containsSpoilers;
    private String language;
    private int helpfulCount;
    private boolean viewerFoundHelpful;
    private boolean isOwnReview;
    private Instant createdAt;
}
