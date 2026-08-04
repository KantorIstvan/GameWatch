package com.gamewatch.dto;

import com.gamewatch.entity.Notification;
import lombok.*;

import java.time.Instant;

/**
 * One thing that happened to the viewer.
 *
 * Deliberately carries no sentence. The wording lives in the frontend's translation files,
 * so a notification written months ago still reads in whatever language is selected now, and
 * a change of phrasing does not have to be backfilled across every stored row.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private Long id;
    private Notification.NotificationType type;

    /** Null for anything the system raised rather than a person. */
    private String actorHandle;
    private String actorDisplayName;
    private String actorPictureUrl;

    /**
     * The catalog's address for the game, which is IGDB's id rather than this app's row id.
     *
     * Both travel: the row id identifies the review being talked about, but a game page is
     * only reachable by external id.
     */
    private Long gameId;
    private Integer gameExternalId;
    private String gameName;

    private Long reviewId;

    private boolean read;
    private Instant createdAt;
}
