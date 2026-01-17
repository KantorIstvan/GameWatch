package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodEntryDto {
    private Long id;
    private Long sessionHistoryId;
    private Integer moodRating; // 1-5
    private String note;
    private Instant recordedAt;
}
