package com.gamewatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRecommendationDto {
    private String externalId;
    private String name;
    private String bannerImageUrl;
    private List<String> platforms;
    private Double similarityScore;
    private List<String> matchingDevelopers;
    private List<String> matchingPublishers;
    private List<String> matchingGenres;
    private List<String> matchingTags;
}
