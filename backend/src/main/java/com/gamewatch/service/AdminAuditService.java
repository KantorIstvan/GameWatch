package com.gamewatch.service;

import com.gamewatch.dto.AdminAuditLogDto;
import com.gamewatch.dto.PagedResponseDto;
import com.gamewatch.entity.AdminAction;
import com.gamewatch.entity.AdminAuditLog;
import com.gamewatch.entity.User;
import com.gamewatch.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional
    public void record(User admin, User target, AdminAction action, String details) {
        adminAuditLogRepository.save(AdminAuditLog.builder()
            .adminUser(admin)
            .targetUser(target)
            .action(action)
            .details(details)
            .build());
    }

    @Transactional(readOnly = true)
    public PagedResponseDto<AdminAuditLogDto> getLogForUser(Long targetUserId, Pageable pageable) {
        Page<AdminAuditLog> page = adminAuditLogRepository.findByTargetUserIdOrderByCreatedAtDesc(targetUserId, pageable);
        return PagedResponseDto.from(page, this::toDto);
    }

    private AdminAuditLogDto toDto(AdminAuditLog log) {
        return AdminAuditLogDto.builder()
            .id(log.getId())
            .adminEmail(log.getAdminUser().getEmail())
            .action(log.getAction())
            .details(log.getDetails())
            .createdAt(log.getCreatedAt())
            .build();
    }
}
