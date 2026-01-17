package com.gamewatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameDto {
    private Long id;
    private String name;
    private String bannerImageUrl;
    private String description;
    private Integer externalId;
    
    private String releaseDate;
    private Double rating;
    private Integer ratingTop;
    private Integer ratingsCount;
    private String genres;
    private String platforms;
    private String developers;
    private String publishers;
    private String tags;
    
    private String nameOriginal;
    private String slug;
    private Boolean tba;
    private String updated;
    private String website;
    private Integer metacritic;
    private String metacriticUrl;
    
    private String backgroundImageAdditional;
    private Integer playtime;
    private Integer screenshotsCount;
    private Integer moviesCount;
    private Integer creatorsCount;
    private Integer achievementsCount;
    private String parentAchievementsCount;
    
    private String redditUrl;
    private String redditName;
    private String redditDescription;
    private String redditLogo;
    private Integer redditCount;
    private String twitchCount;
    private String youtubeCount;
    
    private Integer added;
    private String reviewsTextCount;
    private Integer suggestionsCount;
    private Integer parentsCount;
    private Integer additionsCount;
    private Integer gameSeriesCount;
    
    private String esrbRating;
    
    private String alternativeNames;
    
    private String dominantColor1;
    private String dominantColor2;
    
    private String status; 
    private Long totalPlaytimeSeconds;
    private Integer sessionCount;
    private String lastPlayedDate; 
}
