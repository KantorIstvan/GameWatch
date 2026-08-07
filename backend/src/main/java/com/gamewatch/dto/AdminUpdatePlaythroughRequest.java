package com.gamewatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * PATCH-style admin override: every field optional, only non-null ones are applied.
 *
 * Deliberately has no isActive/isPaused - those are live-timer states with a lot of
 * bookkeeping behind them (startedAt, sessionStartTime, pauseCount...) that only the
 * owning user's actual start/pause/resume actions keep consistent. An admin can only move
 * a playthrough between "still in progress" (neither flag set), completed, or dropped.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdatePlaythroughRequest {
    private String title;
    private String platform;
    private Long durationSeconds;
    private Boolean isCompleted;
    private Boolean isDropped;
    private LocalDate startDate;
    private LocalDate endDate;
}
