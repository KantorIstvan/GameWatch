package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/** One game on a wishlist, with just enough of the catalog row to render it as a card. */
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
}
