package com.gamewatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** PATCH-style admin override: every field optional, only non-null ones are applied. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdatePlaythroughRequest {
    private String title;
    private String platform;
    private Long durationSeconds;
    private Boolean isActive;
    private Boolean isPaused;
    private Boolean isCompleted;
    private Boolean isDropped;
    private LocalDate startDate;
    private LocalDate endDate;
}
