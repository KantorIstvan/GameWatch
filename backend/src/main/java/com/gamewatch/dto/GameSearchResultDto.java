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

    private String dominantColor1;
    private String dominantColor2;
}
