package com.gamewatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.gamewatch.dto.GameSearchResultDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * IGDB is queried with the Apicalypse query language over POST, authenticated with a
 * Twitch app-access token rather than a per-request API key - the token is fetched once
 * and reused until it's close to expiry (it lives ~60 days), not refetched per call.
 */
@Service
@Slf4j
public class IgdbApiService {

    private static final String GAME_FIELDS = "fields id,name,cover.image_id,summary,first_release_date,rating,"
            + "rating_count,genres.id,genres.name,platforms.name,involved_companies.company.id,"
            + "involved_companies.company.name,involved_companies.developer,involved_companies.publisher,"
            + "keywords.id,keywords.name,slug,websites.url,websites.type,"
            + "age_ratings.organization.name,age_ratings.rating_category.rating,alternative_names.name;";

    private final WebClient webClient;
    private final WebClient authClient;
    private final String clientId;
    private final String clientSecret;

    private volatile String accessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    public IgdbApiService(
            WebClient.Builder webClientBuilder,
            @Value("${igdb.client-id}") String clientId,
            @Value("${igdb.client-secret}") String clientSecret,
            @Value("${igdb.base-url:https://api.igdb.com/v4}") String baseUrl,
            @Value("${igdb.auth-url:https://id.twitch.tv/oauth2/token}") String authUrl) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(10 * 1024 * 1024))
                .build();
        this.authClient = webClientBuilder.clone().baseUrl(authUrl).build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    private synchronized String getAccessToken() {
        if (accessToken == null || Instant.now().isAfter(tokenExpiresAt)) {
            JsonNode response = authClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("client_id", clientId)
                            .queryParam("client_secret", clientSecret)
                            .queryParam("grant_type", "client_credentials")
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null || !response.has("access_token")) {
                throw new IllegalStateException("Failed to obtain IGDB/Twitch access token");
            }

            accessToken = response.get("access_token").asText();
            int expiresInSeconds = response.has("expires_in") ? response.get("expires_in").asInt() : 3600;
            // Refreshed a minute early so a token that's technically still valid never expires mid-request.
            tokenExpiresAt = Instant.now().plusSeconds(Math.max(0, expiresInSeconds - 60));
        }
        return accessToken;
    }

    private JsonNode query(String endpoint, String body) {
        return webClient.post()
                .uri(endpoint)
                .header("Client-ID", clientId)
                .header("Authorization", "Bearer " + getAccessToken())
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(10))
                .block();
    }

    private List<GameSearchResultDto> queryGames(String body) {
        try {
            JsonNode response = query("/games", body);
            if (response != null && response.isArray()) {
                return StreamSupport.stream(response.spliterator(), false)
                        .map(this::mapToSearchResult)
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error querying games from IGDB API", e);
        }
        return new ArrayList<>();
    }

    public List<GameSearchResultDto> searchGames(String query) {
        String escaped = query.replace("\"", "\\\"");
        return queryGames(GAME_FIELDS + " search \"" + escaped + "\"; limit 10;");
    }

    public GameSearchResultDto getGameDetails(Integer gameId) {
        List<GameSearchResultDto> results = queryGames(GAME_FIELDS + " where id = " + gameId + ";");
        if (results.isEmpty()) {
            return null;
        }
        GameSearchResultDto details = results.get(0);
        details.setAverageCompletionSeconds(fetchAverageCompletionSeconds(gameId));
        return details;
    }

    /**
     * IGDB serves time-to-beat as a separate endpoint from /games, so it's only fetched
     * here (persisting the one game a user is adding) - not for search or the
     * recommendation engine's candidate lists, where it would mean one extra request per
     * result for a figure nothing there actually uses.
     */
    private Integer fetchAverageCompletionSeconds(Integer gameId) {
        try {
            JsonNode response = query("/game_time_to_beats", "fields normally; where game_id = " + gameId + ";");
            if (response != null && response.isArray() && response.size() > 0
                    && response.get(0).has("normally")) {
                return response.get(0).get("normally").asInt();
            }
        } catch (Exception e) {
            log.error("Error fetching time-to-beat for game {} from IGDB API", gameId, e);
        }
        return null;
    }

    public JsonNode getGameDetailsRaw(Integer gameId) {
        try {
            JsonNode response = query("/games", GAME_FIELDS + " where id = " + gameId + ";");
            if (response != null && response.isArray() && response.size() > 0) {
                return response.get(0);
            }
        } catch (Exception e) {
            log.error("Error fetching raw game details from IGDB API", e);
        }
        return null;
    }

    public List<JsonNode> getMultipleGameDetailsRaw(List<Integer> gameIds) {
        if (gameIds.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            String ids = gameIds.stream().map(String::valueOf).collect(Collectors.joining(","));
            JsonNode response = query("/games", GAME_FIELDS + " where id = (" + ids + "); limit " + gameIds.size() + ";");
            if (response != null && response.isArray()) {
                List<JsonNode> result = new ArrayList<>();
                response.forEach(result::add);
                return result;
            }
        } catch (Exception e) {
            log.error("Error fetching raw game details for IDs {} from IGDB API", gameIds, e);
        }
        return new ArrayList<>();
    }

    public List<GameSearchResultDto> searchGamesByDeveloperId(Integer developerId, int pageSize) {
        return queryGames(GAME_FIELDS + " where involved_companies.company = (" + developerId + ")"
                + " & involved_companies.developer = true; sort rating desc; limit " + pageSize + ";");
    }

    public List<GameSearchResultDto> searchGamesByPublisherId(Integer publisherId, int pageSize) {
        return queryGames(GAME_FIELDS + " where involved_companies.company = (" + publisherId + ")"
                + " & involved_companies.publisher = true; sort rating desc; limit " + pageSize + ";");
    }

    public List<GameSearchResultDto> searchGamesByGenre(Integer genreId, int pageSize) {
        return queryGames(GAME_FIELDS + " where genres = (" + genreId + "); sort rating desc; limit " + pageSize + ";");
    }

    public List<GameSearchResultDto> searchGamesByTag(Integer keywordId, int pageSize) {
        return queryGames(GAME_FIELDS + " where keywords = (" + keywordId + "); sort rating desc; limit " + pageSize + ";");
    }

    public List<GameSearchResultDto> searchGamesByMultipleGenres(List<Integer> genreIds, int pageSize) {
        if (genreIds.isEmpty()) {
            return new ArrayList<>();
        }
        String ids = genreIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        return queryGames(GAME_FIELDS + " where genres = (" + ids + "); sort rating desc; limit " + pageSize + ";");
    }

    public List<GameSearchResultDto> searchGamesByMultipleTags(List<Integer> keywordIds, int pageSize) {
        if (keywordIds.isEmpty()) {
            return new ArrayList<>();
        }
        String ids = keywordIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        return queryGames(GAME_FIELDS + " where keywords = (" + ids + "); sort rating desc; limit " + pageSize + ";");
    }

    public List<Integer> extractGenreIdsFromDetails(JsonNode gameDetailsNode) {
        return extractIds(gameDetailsNode, "genres");
    }

    public List<Integer> extractTagIdsFromDetails(JsonNode gameDetailsNode, int limit) {
        List<Integer> ids = extractIds(gameDetailsNode, "keywords");
        return ids.size() > limit ? ids.subList(0, limit) : ids;
    }

    public List<Integer> extractDeveloperIdsFromDetails(JsonNode gameDetailsNode) {
        return extractCompanyIds(gameDetailsNode, "developer");
    }

    public List<Integer> extractPublisherIdsFromDetails(JsonNode gameDetailsNode) {
        return extractCompanyIds(gameDetailsNode, "publisher");
    }

    private List<Integer> extractIds(JsonNode node, String fieldName) {
        List<Integer> ids = new ArrayList<>();
        if (node.has(fieldName)) {
            for (JsonNode item : node.get(fieldName)) {
                if (item.has("id")) {
                    ids.add(item.get("id").asInt());
                }
            }
        }
        return ids;
    }

    private List<Integer> extractCompanyIds(JsonNode node, String role) {
        List<Integer> ids = new ArrayList<>();
        if (node.has("involved_companies")) {
            for (JsonNode involved : node.get("involved_companies")) {
                if (involved.has(role) && involved.get(role).asBoolean()
                        && involved.has("company") && involved.get("company").has("id")) {
                    ids.add(involved.get("company").get("id").asInt());
                }
            }
        }
        return ids;
    }

    private GameSearchResultDto mapToSearchResult(JsonNode node) {
        String bannerImageUrl = null;
        if (node.has("cover") && node.get("cover").has("image_id")) {
            bannerImageUrl = "https://images.igdb.com/igdb/image/upload/t_1080p/"
                    + node.get("cover").get("image_id").asText() + ".jpg";
        }

        Double rating = node.has("rating") ? node.get("rating").asDouble() / 20.0 : null;

        return GameSearchResultDto.builder()
                .id(node.get("id").asInt())
                .name(node.get("name").asText())
                .bannerImageUrl(bannerImageUrl)
                .releaseDate(extractReleaseDate(node))
                .rating(rating)
                .ratingsCount(node.has("rating_count") ? node.get("rating_count").asInt() : null)
                .genres(extractNames(node, "genres"))
                .platforms(extractPlatformNames(node))
                .description(node.has("summary") ? node.get("summary").asText() : null)
                .developers(extractCompanyNames(node, "developer"))
                .publishers(extractCompanyNames(node, "publisher"))
                .tags(extractNames(node, "keywords"))
                .slug(node.has("slug") ? node.get("slug").asText() : null)
                .website(extractOfficialWebsite(node))
                .esrbRating(extractEsrbRating(node))
                .alternativeNames(extractNames(node, "alternative_names"))
                .build();
    }

    private String extractReleaseDate(JsonNode node) {
        if (!node.has("first_release_date")) {
            return null;
        }
        return DateTimeFormatter.ISO_LOCAL_DATE
                .withZone(ZoneOffset.UTC)
                .format(Instant.ofEpochSecond(node.get("first_release_date").asLong()));
    }

    private String extractOfficialWebsite(JsonNode node) {
        if (!node.has("websites")) {
            return null;
        }
        for (JsonNode site : node.get("websites")) {
            if (site.has("type") && site.get("type").asInt() == 1 && site.has("url")) {
                return site.get("url").asText();
            }
        }
        return null;
    }

    private String extractEsrbRating(JsonNode node) {
        if (!node.has("age_ratings")) {
            return null;
        }
        for (JsonNode ageRating : node.get("age_ratings")) {
            JsonNode org = ageRating.get("organization");
            if (org != null && org.has("name") && "ESRB".equals(org.get("name").asText())) {
                JsonNode category = ageRating.get("rating_category");
                if (category != null && category.has("rating")) {
                    return category.get("rating").asText();
                }
            }
        }
        return null;
    }

    private String extractNames(JsonNode node, String fieldName) {
        if (node.has(fieldName)) {
            return StreamSupport.stream(node.get(fieldName).spliterator(), false)
                    .map(item -> item.get("name").asText())
                    .collect(Collectors.joining(", "));
        }
        return null;
    }

    private String extractPlatformNames(JsonNode node) {
        return extractNames(node, "platforms");
    }

    private String extractCompanyNames(JsonNode node, String role) {
        if (!node.has("involved_companies")) {
            return null;
        }
        String names = StreamSupport.stream(node.get("involved_companies").spliterator(), false)
                .filter(involved -> involved.has(role) && involved.get(role).asBoolean())
                .filter(involved -> involved.has("company") && involved.get("company").has("name"))
                .map(involved -> involved.get("company").get("name").asText())
                .collect(Collectors.joining(", "));
        return names.isEmpty() ? null : names;
    }
}
