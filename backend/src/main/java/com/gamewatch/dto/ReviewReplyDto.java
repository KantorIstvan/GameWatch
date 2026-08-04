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

    /**
     * True for the reply's author, and for nobody else.
     *
     * Deliberately not extended to the author of the review above it: words belong to
     * whoever wrote them, and a reviewer who could delete replies would leave every thread
     * showing only the responses that reviewer was willing to tolerate.
     *
     * Named for the permission rather than for the relationship ("ownReply") so that the
     * field the UI gates on stays the field the server enforces, even if the rule widens
     * later.
     */
    private boolean viewerCanDelete;

    private Instant createdAt;
}
