package com.gamewatch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePlaythroughRequest {
    @NotNull(message = "Game ID is required")
    private Long gameId;
    
    @NotBlank(message = "Playthrough type is required")
    private String playthroughType = "story";
    
    private String title;
    
    private String platform;
    
    private LocalDate startDate;
}
