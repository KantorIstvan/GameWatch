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

    private String status;
    private Long totalPlaytimeSeconds;
    private Integer playthroughCount;
    private Integer sessionCount;
    private String lastPlayedDate;

    /**
     * This app's own shrunk community score and how many ratings back it - populated only
     * for the catalog (see {@link com.gamewatch.controller.GameController}'s /catalog
     * endpoints). Deliberately absent from the library-scoped responses above, which is
     * why {@link com.gamewatch.service.GameService}'s per-user mappers never set these.
     */
    private Double communityRatingScore;
    private Integer communityRatingCount;
}
