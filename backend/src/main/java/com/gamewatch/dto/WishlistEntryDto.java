package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/**
 * One game on a wishlist, with just enough of the catalog row to render it as a card.
 *
 * Carries the same catalog metadata {@link GameRatingEntryDto} does, because the profile
 * renders both lists with one row component - a wishlist row is a rating row without a
 * score and without a "rated on" date, not a different kind of row.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WishlistEntryDto {
    private Long gameId;
    /** IGDB's id - what the card links back to in the catalog. */
    private Integer externalId;
    private String gameName;
    private String bannerImageUrl;
    private String releaseDate;
    private Instant addedAt;

    /** Comma-separated, exactly as the catalog stores them - see {@link com.gamewatch.entity.Game}. */
    private String developers;
    private String publishers;
    private String genres;
    /** IGDB's average time to beat, in seconds - the games equivalent of a film's runtime. */
    private Integer averageCompletionSeconds;
    /** This app's own shrunk community score for the game, and how many ratings back it. */
    private Double communityRatingScore;
    private Integer communityRatingCount;
}
