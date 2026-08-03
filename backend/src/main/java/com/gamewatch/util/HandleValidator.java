package com.gamewatch.util;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * Rules for the public handle a profile is addressed by.
 *
 * Handles end up in URLs and in mentions, so they are deliberately narrow: lowercase
 * letters, digits and underscores only. No dots (they read as file extensions in a path),
 * no hyphens (indistinguishable from an en dash in most UI fonts), no leading or trailing
 * underscore, and no unicode - a handle that cannot be typed from a plain keyboard, or that
 * can be spoofed with a homoglyph, is worse than no handle.
 */
public final class HandleValidator {

    private static final int MIN_LENGTH = 3;
    private static final int MAX_LENGTH = 30;

    private static final Pattern ALLOWED = Pattern.compile("^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$");

    /**
     * Names that must not become a profile, either because a route already uses them or
     * because holding one would let an account impersonate part of the app.
     */
    private static final Set<String> RESERVED = Set.of(
        "admin", "administrator", "api", "auth", "login", "logout", "signup", "register",
        "settings", "help", "support", "about", "terms", "privacy", "security", "legal",
        "gamewatch", "official", "staff", "moderator", "mod", "system", "root", "null",
        "undefined", "me", "you", "user", "users", "profile", "profiles", "game", "games",
        "statistics", "stats", "health", "timeline", "timers", "playthrough", "playthroughs",
        "feed", "explore", "search", "new", "edit", "delete", "static", "assets", "public"
    );

    private HandleValidator() {
    }

    /**
     * @return null when the handle is acceptable, otherwise a reason suitable for showing
     *         to the person who typed it.
     */
    public static String rejectionReason(String handle) {
        if (handle == null || handle.isBlank()) {
            return "Handle is required";
        }

        String candidate = handle.trim();

        if (candidate.length() < MIN_LENGTH) {
            return "Handle must be at least " + MIN_LENGTH + " characters";
        }
        if (candidate.length() > MAX_LENGTH) {
            return "Handle must be at most " + MAX_LENGTH + " characters";
        }
        if (!candidate.equals(candidate.toLowerCase())) {
            return "Handle must be lowercase";
        }
        if (!ALLOWED.matcher(candidate).matches()) {
            return "Handle may only contain lowercase letters, numbers and underscores, "
                + "and cannot start or end with an underscore";
        }
        if (RESERVED.contains(candidate)) {
            return "That handle is reserved";
        }
        return null;
    }

    public static String normalize(String handle) {
        return handle == null ? null : handle.trim().toLowerCase();
    }
}
