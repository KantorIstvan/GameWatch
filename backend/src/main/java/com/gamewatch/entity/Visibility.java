package com.gamewatch.entity;

/**
 * Who may see a piece of a user's profile.
 *
 * There is no value here that covers health data. Mood, hours and late-night minutes are
 * never shareable, so they are not modelled as a visibility choice at all - an option that
 * cannot be set wrong is worth more than one defaulted carefully.
 */
public enum Visibility {
    /** Only the owner. The default for every field, on new and existing accounts alike. */
    PRIVATE,

    /** The owner and accounts they have accepted as followers. */
    FOLLOWERS,

    /** Anyone, including signed-out visitors. */
    PUBLIC;

    public boolean isAtLeast(Visibility required) {
        return ordinal() >= required.ordinal();
    }

    public boolean isMoreVisibleThan(Visibility other) {
        return ordinal() > other.ordinal();
    }
}
