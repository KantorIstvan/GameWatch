package com.gamewatch.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitReviewRequest {
    private String body;
    private Boolean containsSpoilers;
    /** The UI language the review was written in, for the reader's language filter. */
    private String language;
}
