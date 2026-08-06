package com.gamewatch.dto;

import com.gamewatch.entity.Visibility;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileSettingsDto {
    private String handle;
    private String displayName;
    private String bio;
    private Visibility profileVisibility;
    private Visibility libraryVisibility;
    private Visibility wishlistVisibility;

    /**
     * Read-only here, so the edit form can show what is currently set.
     *
     * Changing it goes through the avatar upload endpoint rather than this one - the picture
     * is bytes, not a field, and letting this DTO write the column would let a caller point
     * their face at any URL on the internet.
     */
    private String profilePictureUrl;

    /**
     * Sent and returned as the whole set, in display order - a save replaces every link
     * rather than patching one, the same way the edit sheet already treats this list as a
     * single field rather than one row at a time.
     */
    private List<ProfileLinkDto> links;
}
