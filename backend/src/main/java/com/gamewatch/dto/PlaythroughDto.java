package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaythroughDto {
    private Long id;
    private Long gameId;
    private String gameName;
    private String gameBannerImageUrl;
    private String playthroughType;
    private String title;
    private String platform;
    private Instant startedAt;
    private Instant stoppedAt;
    private Long durationSeconds;
    private Boolean isActive;
    private Boolean isCompleted;
    private Boolean isDropped;
    private Boolean isPaused;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer sessionCount;
    private Instant lastPlayedAt;
    private Instant droppedAt;
    private Instant pickedUpAt;
    private Instant createdAt;
    private Long importedFromPlaythroughId;
    private Long importedDurationSeconds;
    private Long lastSessionHistoryId;
    private Instant sessionStartTime;
    private Long sessionStartDurationSeconds;
}
