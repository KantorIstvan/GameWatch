package com.gamewatch.dto;

import lombok.*;

import java.util.List;

/**
 * The bell's whole contents in one response.
 *
 * The count travels with the list rather than behind its own endpoint because the header
 * needs both on every page load, and two requests to draw one badge is one request too many.
 * It is also not derivable from the list: the list is capped, and the count is not.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationFeedDto {
    private List<NotificationDto> notifications;
    private long unreadCount;
}
