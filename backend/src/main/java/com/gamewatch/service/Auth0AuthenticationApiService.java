package com.gamewatch.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Auth0's public Authentication API - deliberately a separate client from
 * Auth0ManagementApiService, with a separate trust boundary: this call is unauthenticated
 * and uses the SPA's public client id, not the Management API's M2M credentials.
 */
@Service
@Slf4j
public class Auth0AuthenticationApiService {

    private final WebClient authClient;
    private final String clientId;
    private final String dbConnection;

    public Auth0AuthenticationApiService(
            WebClient.Builder webClientBuilder,
            @Value("${auth0.domain}") String domain,
            @Value("${auth0.client-id}") String clientId,
            @Value("${auth0.db-connection}") String dbConnection) {
        this.authClient = webClientBuilder.clone().baseUrl("https://" + domain).build();
        this.clientId = clientId;
        this.dbConnection = dbConnection;
    }

    /**
     * Triggers Auth0's standard password-reset email. This endpoint returns 200
     * regardless of whether the email actually exists in this connection - Auth0's own
     * anti-enumeration design - so success can never be read from the response. Callers
     * must check Auth0ManagementApiService.hasPasswordIdentity first, or this silently
     * no-ops for a social-login-only account instead of resetting anything.
     */
    public void sendPasswordResetEmail(String email) {
        authClient.post()
                .uri("/dbconnections/change_password")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "client_id", clientId,
                        "email", email,
                        "connection", dbConnection))
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}
