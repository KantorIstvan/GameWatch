package com.gamewatch.dto;

import lombok.*;

/**
 * Whether an account has the identity it cannot function without, and what to prefill the
 * onboarding form with if it does not.
 *
 * There is no stored "onboarded" flag behind this - {@code completed} is derived from the
 * two fields the app actually requires. A separate column would be a second copy of the
 * same fact, free to drift out of step with the columns it claims to describe.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingStatusDto {

    /** True once both a handle and a display name are set. */
    private boolean completed;

    /** Null until the user claims one. */
    private String handle;

    private String displayName;

    /**
     * A free handle derived from whatever Auth0 gave us, offered as a starting point rather
     * than assigned. Only populated while {@link #handle} is null - once a handle is
     * claimed there is nothing to suggest.
     */
    private String suggestedHandle;

    /**
     * The Auth0 nickname, which is the closest thing to a name the person already chose.
     * Not unique and not an identity, so it is only ever a prefill.
     */
    private String suggestedDisplayName;
}
