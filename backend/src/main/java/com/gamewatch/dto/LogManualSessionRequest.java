package com.gamewatch.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class LogManualSessionRequest {
    
    @NotNull(message = "Start time is required")
    private Instant startedAt;
    
    @NotNull(message = "End time is required")
    private Instant endedAt;
}
