package com.gamewatch.dto;

import lombok.*;

/**
 * One link on a profile, as far as either side of the API needs to know about it.
 *
 * Carries only the URL - which platform it is (X, GitHub, a plain website...) is worked
 * out client-side from the host, not decided or stored server-side, so the detection
 * rules can be extended without a migration or an API change.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileLinkDto {
    private String url;
}
