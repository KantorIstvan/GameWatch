package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/** One reply under a review. Flat - a reply is never itself replied to. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReplyDto {
    private Long id;
    private String authorHandle;
    private String authorDisplayName;
    private String authorPictureUrl;
    private String body;
    private boolean isOwnReply;

    /**
     * True for the reply's author and for the author of the review it sits under.
     *
     * Whoever wrote the review gets to clear what is said beneath it - that thread is
     * attached to their words whether they want it or not, so leaving them no way to remove
     * something from it would make writing a review the riskier choice.
     */
    private boolean viewerCanDelete;

    private Instant createdAt;
}
