package com.gamewatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.gamewatch.dto.GameSearchResultDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@Slf4j
public class RawgApiService {

    private final WebClient webClient;
    private final String apiKey;
    private final ColorExtractionService colorExtractionService;

    public RawgApiService(
            WebClient.Builder webClientBuilder,
            @Value("${rawg.api.key}") String apiKey,
            @Value("${rawg.api.base-url:https://api.rawg.io/api}") String baseUrl,
            ColorExtractionService colorExtractionService) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(10 * 1024 * 1024))
                .build();
        this.apiKey = apiKey;
        this.colorExtractionService = colorExtractionService;
    }

    public List<GameSearchResultDto> searchGames(String query) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games")
                            .queryParam("key", apiKey)
                            .queryParam("search", query)
                            .queryParam("page_size", 10)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("results")) {
                return StreamSupport.stream(response.get("results").spliterator(), false)
                        .map(node -> mapToSearchResult(node, false))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error searching games from RAWG API", e);
        }
        return new ArrayList<>();
    }

    public List<GameSearchResultDto> searchGamesByDeveloperId(Integer developerId, int pageSize) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games")
                            .queryParam("key", apiKey)
                            .queryParam("developers", developerId)
                            .queryParam("page_size", pageSize)
                            .queryParam("ordering", "-rating")
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();

            if (response != null && response.has("results")) {
                return StreamSupport.stream(response.get("results").spliterator(), false)
                        .map(node -> mapToSearchResult(node, false))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error searching games by developer ID from RAWG API", e);
        }
        return new ArrayList<>();
    }

    public List<GameSearchResultDto> searchGamesByPublisherId(Integer publisherId, int pageSize) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games")
                            .queryParam("key", apiKey)
                            .queryParam("publishers", publisherId)
                            .queryParam("page_size", pageSize)
                            .queryParam("ordering", "-rating")
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();

            if (response != null && response.has("results")) {
                return StreamSupport.stream(response.get("results").spliterator(), false)
                        .map(node -> mapToSearchResult(node, false))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error searching games by publisher ID from RAWG API", e);
        }
        return new ArrayList<>();
    }

    public List<Integer> extractPublisherIdsFromDetails(JsonNode gameDetailsNode) {
        List<Integer> publisherIds = new ArrayList<>();
        if (gameDetailsNode.has("publishers")) {
            for (JsonNode pub : gameDetailsNode.get("publishers")) {
                if (pub.has("id")) {
                    publisherIds.add(pub.get("id").asInt());
                }
            }
        }
        return publisherIds;
    }

    public GameSearchResultDto getGameDetails(Integer gameId) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games/{id}")
                            .queryParam("key", apiKey)
                            .build(gameId))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null) {
                return mapToSearchResult(response, true);
            }
        } catch (Exception e) {
            log.error("Error fetching game details from RAWG API", e);
        }
        return null;
    }

    private GameSearchResultDto mapToSearchResult(JsonNode node, boolean extractColors) {
        String backgroundImage = node.has("background_image") ? node.get("background_image").asText() : null;
        
        String[] colors = null;
        if (extractColors && backgroundImage != null) {
            colors = colorExtractionService.extractDominantColors(backgroundImage);
        }
        
        return GameSearchResultDto.builder()
                .id(node.get("id").asInt())
                .name(node.get("name").asText())
                .bannerImageUrl(backgroundImage)
                .dominantColor1(colors != null && colors.length > 0 ? colors[0] : null)
                .dominantColor2(colors != null && colors.length > 1 ? colors[1] : null)
                .releaseDate(node.has("released") ? node.get("released").asText() : null)
                .rating(node.has("rating") ? node.get("rating").asDouble() : null)
                .ratingTop(node.has("rating_top") ? node.get("rating_top").asInt() : null)
                .ratingsCount(node.has("ratings_count") ? node.get("ratings_count").asInt() : null)
                .genres(extractNames(node, "genres"))
                .platforms(extractPlatformNames(node))
                .description(node.has("description_raw") ? node.get("description_raw").asText() : 
                           (node.has("description") ? stripHtml(node.get("description").asText()) : null))
                .developers(extractNames(node, "developers"))
                .publishers(extractNames(node, "publishers"))
                .tags(extractNames(node, "tags"))
                .nameOriginal(node.has("name_original") ? node.get("name_original").asText() : null)
                .slug(node.has("slug") ? node.get("slug").asText() : null)
                .tba(node.has("tba") ? node.get("tba").asBoolean() : null)
                .updated(node.has("updated") ? node.get("updated").asText() : null)
                .website(node.has("website") ? node.get("website").asText() : null)
                .metacritic(node.has("metacritic") ? node.get("metacritic").asInt() : null)
                .metacriticUrl(node.has("metacritic_url") ? node.get("metacritic_url").asText() : null)
                .backgroundImageAdditional(node.has("background_image_additional") ? node.get("background_image_additional").asText() : null)
                .playtime(node.has("playtime") ? node.get("playtime").asInt() : null)
                .screenshotsCount(node.has("screenshots_count") ? node.get("screenshots_count").asInt() : null)
                .moviesCount(node.has("movies_count") ? node.get("movies_count").asInt() : null)
                .creatorsCount(node.has("creators_count") ? node.get("creators_count").asInt() : null)
                .achievementsCount(node.has("achievements_count") ? node.get("achievements_count").asInt() : null)
                .parentAchievementsCount(node.has("parent_achievements_count") ? node.get("parent_achievements_count").asText() : null)
                .redditUrl(node.has("reddit_url") ? node.get("reddit_url").asText() : null)
                .redditName(node.has("reddit_name") ? node.get("reddit_name").asText() : null)
                .redditDescription(node.has("reddit_description") ? node.get("reddit_description").asText() : null)
                .redditLogo(node.has("reddit_logo") ? node.get("reddit_logo").asText() : null)
                .redditCount(node.has("reddit_count") ? node.get("reddit_count").asInt() : null)
                .twitchCount(node.has("twitch_count") ? node.get("twitch_count").asText() : null)
                .youtubeCount(node.has("youtube_count") ? node.get("youtube_count").asText() : null)
                .added(node.has("added") ? node.get("added").asInt() : null)
                .reviewsTextCount(node.has("reviews_text_count") ? node.get("reviews_text_count").asText() : null)
                .suggestionsCount(node.has("suggestions_count") ? node.get("suggestions_count").asInt() : null)
                .parentsCount(node.has("parents_count") ? node.get("parents_count").asInt() : null)
                .additionsCount(node.has("additions_count") ? node.get("additions_count").asInt() : null)
                .gameSeriesCount(node.has("game_series_count") ? node.get("game_series_count").asInt() : null)
                .esrbRating(extractEsrbRating(node))
                .alternativeNames(extractAlternativeNames(node))
                .build();
    }

    private String extractEsrbRating(JsonNode node) {
        if (node.has("esrb_rating") && !node.get("esrb_rating").isNull()) {
            JsonNode esrb = node.get("esrb_rating");
            return esrb.has("name") ? esrb.get("name").asText() : null;
        }
        return null;
    }

    private String extractAlternativeNames(JsonNode node) {
        if (node.has("alternative_names")) {
            return StreamSupport.stream(node.get("alternative_names").spliterator(), false)
                    .map(JsonNode::asText)
                    .collect(Collectors.joining(", "));
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
        if (node.has("platforms")) {
            return StreamSupport.stream(node.get("platforms").spliterator(), false)
                    .map(item -> item.get("platform").get("name").asText())
                    .collect(Collectors.joining(", "));
        }
        return null;
    }

    private String stripHtml(String html) {
        if (html == null) {
            return null;
        }
        return html.replaceAll("<[^>]*>", "");
    }

    public List<GameSearchResultDto> searchGamesByGenre(Integer genreId, int pageSize) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games")
                            .queryParam("key", apiKey)
                            .queryParam("genres", genreId)
                            .queryParam("page_size", pageSize)
                            .queryParam("ordering", "-rating")
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("results")) {
                return StreamSupport.stream(response.get("results").spliterator(), false)
                        .map(node -> mapToSearchResult(node, false))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error searching games by genre from RAWG API", e);
        }
        return new ArrayList<>();
    }

    public List<GameSearchResultDto> searchGamesByTag(Integer tagId, int pageSize) {
        try {
            JsonNode response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games")
                            .queryParam("key", apiKey)
                            .queryParam("tags", tagId)
                            .queryParam("page_size", pageSize)
                            .queryParam("ordering", "-rating")
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("results")) {
                return StreamSupport.stream(response.get("results").spliterator(), false)
                        .map(node -> mapToSearchResult(node, false))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Error searching games by tag from RAWG API", e);
        }
        return new ArrayList<>();
    }

    public List<Integer> extractGenreIdsFromDetails(JsonNode gameDetailsNode) {
        List<Integer> genreIds = new ArrayList<>();
        if (gameDetailsNode.has("genres")) {
            for (JsonNode genre : gameDetailsNode.get("genres")) {
                if (genre.has("id")) {
                    genreIds.add(genre.get("id").asInt());
                }
            }
        }
        return genreIds;
    }

    public List<Integer> extractTagIdsFromDetails(JsonNode gameDetailsNode, int limit) {
        List<Integer> tagIds = new ArrayList<>();
        if (gameDetailsNode.has("tags")) {
            int count = 0;
            for (JsonNode tag : gameDetailsNode.get("tags")) {
                if (count >= limit) break;
                if (tag.has("id")) {
                    tagIds.add(tag.get("id").asInt());
                    count++;
                }
            }
        }
        return tagIds;
    }

    public List<Integer> extractDeveloperIdsFromDetails(JsonNode gameDetailsNode) {
        List<Integer> developerIds = new ArrayList<>();
        if (gameDetailsNode.has("developers")) {
            for (JsonNode dev : gameDetailsNode.get("developers")) {
                if (dev.has("id")) {
                    developerIds.add(dev.get("id").asInt());
                }
            }
        }
        return developerIds;
    }

    public JsonNode getGameDetailsRaw(Integer gameId) {
        try {
            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/games/{id}")
                            .queryParam("key", apiKey)
                            .build(gameId))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            log.error("Error fetching raw game details from RAWG API", e);
            return null;
        }
    }

    public List<JsonNode> getMultipleGameDetailsRaw(List<Integer> gameIds) {
        return Flux.fromIterable(gameIds)
                .parallel()
                .runOn(Schedulers.boundedElastic())
                .flatMap(gameId -> 
                    webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/games/{id}")
                                .queryParam("key", apiKey)
                                .build(gameId))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .timeout(Duration.ofSeconds(5))
                        .onErrorResume(e -> {
                            log.error("Error fetching game details for ID {}", gameId, e);
                            return Mono.empty();
                        })
                )
                .sequential()
                .collectList()
                .block();
    }

    public List<GameSearchResultDto> searchGamesByMultipleGenres(List<Integer> genreIds, int pageSize) {
        return Flux.fromIterable(genreIds)
                .parallel()
                .runOn(Schedulers.boundedElastic())
                .flatMap(genreId -> 
                    Mono.fromCallable(() -> searchGamesByGenre(genreId, pageSize))
                        .subscribeOn(Schedulers.boundedElastic())
                )
                .sequential()
                .flatMap(Flux::fromIterable)
                .distinct(GameSearchResultDto::getId)
                .collectList()
                .block();
    }

    public List<GameSearchResultDto> searchGamesByMultipleTags(List<Integer> tagIds, int pageSize) {
        return Flux.fromIterable(tagIds)
                .parallel()
                .runOn(Schedulers.boundedElastic())
                .flatMap(tagId -> 
                    Mono.fromCallable(() -> searchGamesByTag(tagId, pageSize))
                        .subscribeOn(Schedulers.boundedElastic())
                )
                .sequential()
                .flatMap(Flux::fromIterable)
                .distinct(GameSearchResultDto::getId)
                .collectList()
                .block();
    }
}
