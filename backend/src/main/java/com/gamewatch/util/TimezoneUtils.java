package com.gamewatch.util;

import com.gamewatch.entity.User;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Resolves the calendar settings — zone and week start — that a user's day, week and month
 * boundaries should be computed against. Anything that buckets activity by date has to go
 * through here, so that two pages never disagree about which day a session belongs to.
 */
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

    /**
     * The first day of the week containing {@code reference}, honouring the user's
     * Monday/Sunday preference. Defaults to Monday when unset or unrecognised.
     */
    public static LocalDate startOfWeek(User user, LocalDate reference) {
        DayOfWeek startDay = "SUNDAY".equals(user.getFirstDayOfWeek())
            ? DayOfWeek.SUNDAY
            : DayOfWeek.MONDAY;

        LocalDate weekStart = reference.with(startDay);
        // LocalDate.with(DayOfWeek) can move forward, which would put the "start" of the
        // week after the day it is supposed to contain.
        if (weekStart.isAfter(reference)) {
            weekStart = weekStart.minusWeeks(1);
        }
        return weekStart;
    }
}
