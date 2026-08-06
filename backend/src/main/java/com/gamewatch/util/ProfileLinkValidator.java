package com.gamewatch.util;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Rules for a link a user attaches to their profile.
 *
 * The frontend normalises and previews these before they are ever submitted, but that is
 * advisory - this is the check that actually decides what gets stored and, later,
 * rendered as a clickable anchor on someone else's screen. Restricting to http/https here
 * is what keeps a {@code javascript:} or other non-web scheme from ever reaching the
 * database, independent of whatever the client happened to send.
 */
public final class ProfileLinkValidator {

    private static final int MAX_LENGTH = 500;

    /** Kept modest on purpose - this is a profile's link list, not a link directory. */
    private static final int MAX_LINKS = 10;

    private ProfileLinkValidator() {
    }

    public static int maxLinks() {
        return MAX_LINKS;
    }

    /**
     * @return null when the URL is acceptable to store and render as a clickable link,
     *         otherwise a reason suitable for showing to the person who typed it.
     */
    public static String rejectionReason(String url) {
        if (url == null || url.isBlank()) {
            return "Link cannot be empty";
        }

        String trimmed = url.trim();
        if (trimmed.length() > MAX_LENGTH) {
            return "Link must be at most " + MAX_LENGTH + " characters";
        }

        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException e) {
            return "That does not look like a valid link";
        }

        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            return "Link must start with http:// or https://";
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            return "That does not look like a valid link";
        }

        return null;
    }

    /** Normalizes a URL that has already passed {@link #rejectionReason} for storage. */
    public static String normalize(String url) {
        return url.trim();
    }
}
