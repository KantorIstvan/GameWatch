package com.gamewatch.service;

import com.gamewatch.entity.AdminAction;
import com.gamewatch.entity.User;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Every action here reaches Auth0 before touching the local database. Deliberately not
 * wrapped in an outer @Transactional: that would hold a DB connection open across the
 * network round-trip, and a Spring transaction cannot roll back something Auth0 already
 * did anyway. Each local write below (userRepository.save, userService.deleteAccount,
 * adminAuditService.record) is already transactional on its own - Spring Data's save()
 * and the other beans' @Transactional methods each get their own transaction when called
 * this way, which is exactly the granularity wanted here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminModerationService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final AdminAuditService adminAuditService;
    private final Auth0ManagementApiService auth0ManagementApiService;
    private final Auth0AuthenticationApiService auth0AuthenticationApiService;

    public void blockUser(User admin, Long targetId) {
        User target = getTarget(targetId);
        auth0ManagementApiService.blockUser(target.getAuth0UserId());
        target.setBlocked(true);
        target.setBlockedAt(Instant.now());
        userRepository.save(target);
        adminAuditService.record(admin, target, AdminAction.BLOCK, "Blocked " + target.getEmail());
    }

    public void unblockUser(User admin, Long targetId) {
        User target = getTarget(targetId);
        auth0ManagementApiService.unblockUser(target.getAuth0UserId());
        target.setBlocked(false);
        target.setBlockedAt(null);
        userRepository.save(target);
        adminAuditService.record(admin, target, AdminAction.UNBLOCK, "Unblocked " + target.getEmail());
    }

    /**
     * Checks hasPasswordIdentity first because Auth0's change-password endpoint returns
     * 200 whether or not the email actually exists in that connection (its own
     * anti-enumeration design) - without this check, a social-login-only account would
     * silently no-op instead of surfacing a real error.
     */
    public void sendPasswordResetEmail(User admin, Long targetId) {
        User target = getTarget(targetId);
        if (!auth0ManagementApiService.hasPasswordIdentity(target.getAuth0UserId())) {
            throw new IllegalArgumentException(
                "This account signs in via a social login and has no password to reset");
        }
        auth0AuthenticationApiService.sendPasswordResetEmail(target.getEmail());
        adminAuditService.record(admin, target, AdminAction.PASSWORD_RESET_SENT,
            "Sent a password reset email to " + target.getEmail());
    }

    /**
     * Auth0-first, deliberately: if the local row were deleted first and this call then
     * failed, the row (and everything FK-cascaded from it) would be gone for good while
     * the Auth0 identity survived - and the next login would silently create a brand-new
     * blank local row for that same auth0UserId, an unintended "undelete". Auth0-first
     * means a failure after this point leaves a safe, recoverable state: the identity
     * really is gone, but the data is still here for another admin retry.
     *
     * The residual gap: if the audit write below fails right after deleteAccount
     * succeeds, that one action goes unlogged - not a data-consistency problem (Auth0 has
     * already committed to the deletion either way), just a rare hole in the trail.
     */
    public void deleteUser(User admin, Long targetId) {
        User target = getTarget(targetId);
        String email = target.getEmail();
        String handle = target.getHandle();
        String auth0UserId = target.getAuth0UserId();

        auth0ManagementApiService.deleteUser(auth0UserId);

        userService.deleteAccount(target);
        adminAuditService.record(admin, null, AdminAction.DELETE_ACCOUNT,
            "Deleted account " + email + (handle != null ? " (@" + handle + ")" : "") + ", auth0UserId=" + auth0UserId);
    }

    private User getTarget(Long targetId) {
        return userRepository.findById(targetId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
