package com.gamewatch.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTitleRequest {
    @NotBlank(message = "Playthrough title is required")
    private String title;
}
