package com.gamewatch.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupDto {
    @NotBlank(message = "Backup version is required")
    private String version;
    
    @NotNull(message = "Backup timestamp is required")
    private Instant timestamp;
    
    @NotNull(message = "Backup data is required")
    @Valid
    private BackupDataDto data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupDataDto {
        private List<BackupGameDto> games;
        private List<BackupPlaythroughDto> playthroughs;
        private List<BackupSessionDto> sessions;
        private List<BackupMoodEntryDto> moodEntries;
        private BackupHealthSettingsDto healthSettings;
        private BackupMetadataDto metadata;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupGameDto {
        private Long originalId;
        private Integer externalId;
        private String name;
        private String slug;
        private String bannerImageUrl;
        private String description;
        private String released;
        private Double rating;
        private Integer ratingsCount;
        private Integer metacritic;
        private Integer playtime;
        private String esrbRating;
        private String platforms;
        private String genres;
        private String tags;
        private String developers;
        private String publishers;
        private String stores;
        private String website;
        private String alternativeNames;
        private String dominantColor1;
        private String dominantColor2;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupPlaythroughDto {
        private Long originalId;
        private Long gameOriginalId;
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
        private String startDate;
        private String endDate;
        private Integer sessionCount;
        private Integer pauseCount;
        private Instant lastPlayedAt;
        private Instant droppedAt;
        private Instant pickedUpAt;
        private Long importedFromPlaythroughOriginalId;
        private Long importedDurationSeconds;
        private Boolean manualTimeSet;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupSessionDto {
        private Long originalId;
        private Long playthroughOriginalId;
        private Integer sessionNumber;
        private Long durationSeconds;
        private Integer pauseCount;
        private Instant startedAt;
        private Instant endedAt;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupMoodEntryDto {
        private Long originalId;
        private Long sessionHistoryOriginalId;
        private Integer moodRating;
        private String note;
        private Instant recordedAt;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupHealthSettingsDto {
        private Boolean notificationsEnabled;
        private Boolean soundsEnabled;
        private Boolean hydrationReminderEnabled;
        private Integer hydrationIntervalMinutes;
        private Boolean standReminderEnabled;
        private Integer standIntervalMinutes;
        private Boolean breakReminderEnabled;
        private Integer breakIntervalMinutes;
        private Integer breakDurationMinutes;
        private Boolean goalsEnabled;
        private Boolean maxHoursPerDayEnabled;
        private Double maxHoursPerDay;
        private Boolean maxSessionsPerDayEnabled;
        private Integer maxSessionsPerDay;
        private Boolean maxHoursPerWeekEnabled;
        private Double maxHoursPerWeek;
        private Boolean goalNotificationsEnabled;
        private Boolean moodPromptEnabled;
        private Boolean moodPromptRequired;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackupMetadataDto {
        private Integer totalGames;
        private Integer totalPlaythroughs;
        private Integer totalSessions;
        private Integer totalMoodEntries;
        private Long totalPlaytimeSeconds;
    }
}
