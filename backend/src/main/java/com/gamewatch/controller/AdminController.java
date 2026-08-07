package com.gamewatch.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
public class AdminController {

    /**
     * Deliberately has no @PreAuthorize: a non-admin has to be able to call this too, to
     * learn they aren't one. Gating it would make "not admin" indistinguishable from a
     * network error on the frontend, which is what decides whether to show the admin nav.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, List<String>>> getCurrentAdminPermissions(Authentication authentication) {
        List<String> permissions = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("admin:"))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("permissions", permissions));
    }
}
