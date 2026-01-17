package com.gamewatch.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImportSessionsRequest {
    
    @NotNull(message = "Source playthrough ID is required")
    private Long sourcePlaythroughId;
}
