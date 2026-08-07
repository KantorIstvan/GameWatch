package com.gamewatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Instant;
import java.util.Map;

/**
 * Auth0's Management API - the only place this backend ever touches account state Auth0
 * itself owns (the blocked flag, deletion, identity lookup). Structural copy of
 * IgdbApiService's pattern: a client-credentials token is fetched once and cached, not
 * refetched per call.
 */
@Service
@Slf4j
public class Auth0ManagementApiService {

    private final WebClient webClient;
    private final WebClient authClient;
    private final String clientId;
    private final String clientSecret;
    private final String audience;

    private volatile String accessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    public Auth0ManagementApiService(
            WebClient.Builder webClientBuilder,
            @Value("${auth0.domain}") String domain,
            @Value("${auth0.management.client-id}") String clientId,
            @Value("${auth0.management.client-secret}") String clientSecret) {
        this.webClient = webClientBuilder.clone().baseUrl("https://" + domain + "/api/v2").build();
        this.authClient = webClientBuilder.clone().baseUrl("https://" + domain).build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.audience = "https://" + domain + "/api/v2/";
    }

    private synchronized String getAccessToken() {
        if (accessToken == null || Instant.now().isAfter(tokenExpiresAt)) {
            JsonNode response = authClient.post()
                    .uri("/oauth/token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "client_id", clientId,
                            "client_secret", clientSecret,
                            "audience", audience,
                            "grant_type", "client_credentials"))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null || !response.has("access_token")) {
                throw new IllegalStateException("Failed to obtain an Auth0 Management API token");
            }

            accessToken = response.get("access_token").asText();
            int expiresInSeconds = response.has("expires_in") ? response.get("expires_in").asInt() : 3600;
            // Refreshed a minute early so a token that's technically still valid never expires mid-request.
            tokenExpiresAt = Instant.now().plusSeconds(Math.max(0, expiresInSeconds - 60));
        }
        return accessToken;
    }

    public void blockUser(String auth0UserId) {
        setBlocked(auth0UserId, true);
    }

    public void unblockUser(String auth0UserId) {
        setBlocked(auth0UserId, false);
    }

    private void setBlocked(String auth0UserId, boolean blocked) {
        webClient.patch()
                .uri("/users/{id}", auth0UserId)
                .header("Authorization", "Bearer " + getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("blocked", blocked))
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    /**
     * Idempotent by design: a 404 (already deleted, e.g. a retried admin action) is
     * treated as success rather than an error, which is what makes
     * AdminModerationService.deleteUser safely retryable.
     */
    public void deleteUser(String auth0UserId) {
        try {
            webClient.delete()
                    .uri("/users/{id}", auth0UserId)
                    .header("Authorization", "Bearer " + getAccessToken())
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                log.info("Auth0 user {} was already deleted", auth0UserId);
                return;
            }
            throw e;
        }
    }

    /**
     * A social-login-only account (Google, GitHub, ...) has no password to reset - see
     * Auth0AuthenticationApiService for why that matters. True only if at least one
     * linked identity is the actual username/password database connection.
     */
    public boolean hasPasswordIdentity(String auth0UserId) {
        JsonNode response = webClient.get()
                .uri("/users/{id}", auth0UserId)
                .header("Authorization", "Bearer " + getAccessToken())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        if (response == null || !response.has("identities")) {
            return false;
        }
        for (JsonNode identity : response.get("identities")) {
            if (identity.has("provider") && "auth0".equals(identity.get("provider").asText())) {
                return true;
            }
        }
        return false;
    }
}
