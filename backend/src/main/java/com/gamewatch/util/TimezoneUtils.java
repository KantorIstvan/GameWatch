package com.gamewatch.util;

import com.gamewatch.entity.User;

import java.time.DateTimeException;
import java.time.ZoneId;

public final class TimezoneUtils {

    private TimezoneUtils() {
    }

    /**
     * Resolves the timezone that day/week/month boundaries should be computed in for
     * this user. Falls back to the server's zone when the user has no preference saved
     * yet, or when a stored value somehow isn't a valid IANA zone id.
     */
    public static ZoneId resolveZone(User user) {
        String timezone = user.getTimezone();
        if (timezone == null || timezone.isBlank()) {
            return ZoneId.systemDefault();
        }
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            return ZoneId.systemDefault();
        }
    }
}
