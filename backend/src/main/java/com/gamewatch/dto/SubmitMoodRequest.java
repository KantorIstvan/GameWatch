package com.gamewatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitMoodRequest {
    private Long sessionHistoryId; // Optional - can be null for manual mood entry
    private Integer moodRating; // 1-5
    private String note; // Optional
}
