package com.gamewatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Auth0's Authentication API - deliberately a separate client from
 * Auth0ManagementApiService, with a separate trust boundary: nothing here ever uses the
 * Management API's M2M credentials. The two methods below authenticate two different
 * ways: sendPasswordResetEmail is a public, unauthenticated call keyed only by the SPA's
 * public client id; fetchEmail forwards the *caller's own* access token, the standard
 * OIDC UserInfo pattern.
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

    /**
     * Standard OIDC UserInfo call - claims here reflect whatever scopes were actually
     * granted at login (this app requests "openid profile email"), regardless of whether
     * the resource-server access token JWT itself happens to embed an email claim, which
     * it often doesn't unless a tenant-side Action explicitly adds one. This is what lets
     * UserService.getOrCreateUser reliably capture a real email for every account, social
     * login included, instead of leaving it null whenever the JWT is missing the claim.
     *
     * Failure is swallowed to null rather than propagated: a hiccup on Auth0's side must
     * never break the request that triggered it, since this is a best-effort backfill,
     * not something the caller depends on to proceed.
     */
    public String fetchEmail(String accessToken) {
        try {
            JsonNode response = authClient.get()
                    .uri("/userinfo")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (response != null && response.hasNonNull("email")) {
                return response.get("email").asText();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch email from Auth0 userinfo", e);
        }
        return null;
    }
}
