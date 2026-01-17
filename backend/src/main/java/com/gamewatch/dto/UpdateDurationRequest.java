package com.gamewatch.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDurationRequest {
    @NotNull(message = "Duration is required")
    @Min(value = 0, message = "Duration must be non-negative")
    private Long durationSeconds;
}
