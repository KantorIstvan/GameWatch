package com.gamewatch.util;

import java.text.Normalizer;
import java.util.function.Predicate;

/**
 * Derives a starting handle for an account that has not chosen one.
 *
 * Every social surface in this app addresses people by handle: profile URLs are
 * {@code /u/:handle}, follows key on it, and search only returns rows that have one. An
 * account without a handle is therefore invisible and unreachable - so one is assigned at
 * sign-up rather than waiting for the user to discover the settings form. It stays fully
 * editable afterwards; this only guarantees there is something to address.
 *
 * The generated handle is a suggestion derived from whatever Auth0 gave us, squeezed
 * through the same rules {@link HandleValidator} enforces on a hand-typed one - so a
 * generated handle can never be something the user would have been refused.
 */
public final class HandleGenerator {

    private static final int MIN_LENGTH = 3;
    private static final int MAX_LENGTH = 30;

    /** Leaves room for the disambiguating suffix without overflowing MAX_LENGTH. */
    private static final int BASE_MAX_LENGTH = 24;

    private static final String FALLBACK_BASE = "player";

    /** Bounded so a pathological collision run fails loudly instead of spinning. */
    private static final int MAX_ATTEMPTS = 1000;

    private HandleGenerator() {
    }

    /**
     * Turns arbitrary text into the longest leading fragment that satisfies the handle
     * rules: unicode folded to ASCII, everything outside [a-z0-9_] dropped, underscores
     * collapsed and trimmed from the ends.
     *
     * @return a usable base, or {@link #FALLBACK_BASE} when the input reduces to nothing
     *         (a handle of purely non-latin characters, an empty nickname, and so on).
     */
    public static String toBase(String source) {
        if (source == null || source.isBlank()) {
            return FALLBACK_BASE;
        }

        // An email is a common source and everything after the @ is the provider, not the
        // person - "ada@example.com" should suggest "ada", not "adaexamplecom".
        String local = source.contains("@") ? source.substring(0, source.indexOf('@')) : source;

        String ascii = Normalizer.normalize(local, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase();

        String cleaned = ascii.replaceAll("[^a-z0-9_]+", "_")
            .replaceAll("_{2,}", "_")
            .replaceAll("^_+|_+$", "");

        if (cleaned.length() > BASE_MAX_LENGTH) {
            cleaned = cleaned.substring(0, BASE_MAX_LENGTH).replaceAll("_+$", "");
        }

        if (cleaned.isEmpty()) {
            return FALLBACK_BASE;
        }
        // A base under the minimum length is returned as-is rather than padded: it is
        // still worth keeping as a prefix, and the caller suffixes it into range. "jo"
        // becoming "jo1" reads far better than discarding it for "player1".
        return cleaned;
    }

    /**
     * Finds a free handle starting from {@code source}, appending an incrementing number
     * only when it has to.
     *
     * @param isTaken answers whether a candidate is already claimed. Advisory, exactly as
     *                in the settings form: the unique index on LOWER(handle) is still what
     *                decides, and the caller has to be able to survive losing that race.
     */
    public static String generateUnique(String source, Predicate<String> isTaken) {
        String base = toBase(source);

        // A base that is valid on its own gets offered unsuffixed, so the common case is
        // "ada" rather than "ada1".
        if (base.length() >= MIN_LENGTH && HandleValidator.rejectionReason(base) == null
            && !isTaken.test(base)) {
            return base;
        }

        for (int suffix = 1; suffix <= MAX_ATTEMPTS; suffix++) {
            String candidate = truncateForSuffix(base, suffix) + suffix;
            if (HandleValidator.rejectionReason(candidate) == null && !isTaken.test(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("Could not generate a free handle from: " + source);
    }

    private static String truncateForSuffix(String base, int suffix) {
        int room = MAX_LENGTH - String.valueOf(suffix).length();
        String truncated = base.length() > room ? base.substring(0, room) : base;
        // Trailing underscores are rejected, and stripping one can empty the string.
        truncated = truncated.replaceAll("_+$", "");
        return truncated.isEmpty() ? FALLBACK_BASE : truncated;
    }
}
