package com.gamewatch.service;

import com.gamewatch.dto.AdminUserSummaryDto;
import com.gamewatch.dto.PagedResponseDto;
import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PagedResponseDto<AdminUserSummaryDto> searchUsers(String query, Pageable pageable) {
        String normalized = query == null ? "" : query.trim().toLowerCase();
        Page<User> page = userRepository.searchForAdmin(normalized, pageable);
        return PagedResponseDto.from(page, this::toSummary);
    }

    /**
     * Same "not found" convention as every other lookup in this codebase
     * (UserService.getUserByAuth0Id, PlaythroughService, ...) - a miss throws a plain
     * RuntimeException, which GlobalExceptionHandler maps to a 500, not a 404. That's a
     * pre-existing repo-wide convention, not something to special-case here; the admin
     * frontend treats any failed GET as "not found" regardless of status code.
     */
    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private AdminUserSummaryDto toSummary(User user) {
        return AdminUserSummaryDto.builder()
            .id(user.getId())
            .auth0UserId(user.getAuth0UserId())
            .email(user.getEmail())
            .username(user.getUsername())
            .handle(user.getHandle())
            .displayName(user.getDisplayName())
            .profilePictureUrl(user.getProfilePictureUrl())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
