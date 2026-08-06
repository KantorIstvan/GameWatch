package com.gamewatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameSearchResultDto {
    private Integer id;
    private String name;
    private String bannerImageUrl;
    private String description;

    private String releaseDate;
    private Double rating;
    private Integer ratingsCount;
    private String genres;
    private String platforms;
    private String developers;
    private String publishers;
    private String tags;

    private String slug;
    private String website;

    private Integer averageCompletionSeconds;

    private String esrbRating;

    private String alternativeNames;

    // No dominantColor1/2 here: IGDB's API doesn't return dominant colors, and nothing in
    // IgdbApiService computes them, so this DTO never legitimately carries them. Colors are
    // computed separately from the banner image once a game is catalogued - see
    // GameService.getOrCreateCatalogGame - and read off the persisted Game/GameDto from then on.
}
