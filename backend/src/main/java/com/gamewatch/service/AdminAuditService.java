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
            .adminEmail(identify(log.getAdminUser()))
            .action(log.getAction())
            .details(log.getDetails())
            .createdAt(log.getCreatedAt())
            .build();
    }

    /**
     * A readable identifier for an audit-trail line, for accounts whose email is null -
     * some Auth0 social connections never put an email claim on the access token
     * UserService.getOrCreateUser reads, so this column is nullable in practice, not just
     * in the schema. Shared by every admin service that writes a detail string mentioning
     * a target (or reads one back for display), so "for null"/"by null" can't recur.
     */
    static String identify(User user) {
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }
        if (user.getHandle() != null && !user.getHandle().isBlank()) {
            return "@" + user.getHandle();
        }
        return "user #" + user.getId();
    }
}
