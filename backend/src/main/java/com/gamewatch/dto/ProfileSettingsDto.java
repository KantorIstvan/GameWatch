package com.gamewatch.dto;

import com.gamewatch.entity.Visibility;
import lombok.*;

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
}
