package com.gamewatch.dto;

import com.gamewatch.entity.AdminAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogDto {
    private Long id;
    private String adminEmail;
    private AdminAction action;
    private String details;
    private Instant createdAt;
}
