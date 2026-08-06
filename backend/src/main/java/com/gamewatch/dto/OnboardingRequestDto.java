package com.gamewatch.dto;

import lombok.*;

/**
 * The two fields an account cannot exist without.
 *
 * Deliberately separate from {@link ProfileSettingsDto}, whose every field is optional
 * because it patches an existing profile. Here both are mandatory, and a request that
 * omits one is rejected rather than partially applied - the point of the endpoint is that
 * it either finishes onboarding or does nothing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingRequestDto {
    private String handle;
    private String displayName;
}
