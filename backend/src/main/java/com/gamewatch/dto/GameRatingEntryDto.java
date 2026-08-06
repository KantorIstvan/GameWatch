package com.gamewatch.dto;

import lombok.*;

import java.time.Instant;

/**
 * One game a user has rated, and the score they gave it - the row shape behind the
 * "Ratings" tab on a profile. Distinct from {@link UserStatisticsDto.GameRankingDto}: that
 * type is built around playtime (and the many playtime-shaped fields that come with it),
 * this one is built around a 1-10 score and nothing else.
 *
 * The review fields are null whenever this user rated the game without writing anything -
 * a rating and a written review are recorded separately, and most rated games never get a
 * review, so this row has to represent both "just a score" and "score plus a write-up".
 *
 * The catalog fields below (developers, publishers, genres, release date, description,
 * community score) are what the row renders as its metadata lines, and what the tab's
 * filter and sort controls work off - the client filters the list it already holds rather
 * than asking for a filtered one, which only works because every value it filters by is
 * carried here. They cost nothing extra to read: the query behind this list already
 * fetches the game row, so these are fields of an object that is loaded either way.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRatingEntryDto {
    private Long gameId;
    /** IGDB's id - the catalog's address for this game, for linking out to it. */
    private Integer externalId;
    private String gameName;
    private String bannerImageUrl;
    private Integer score;
    private Instant ratedAt;
    private String reviewBody;
    private Instant reviewCreatedAt;
    private boolean containsSpoilers;

    /** Comma-separated, exactly as the catalog stores them - see {@link com.gamewatch.entity.Game}. */
    private String developers;
    private String publishers;
    private String genres;
    private String releaseDate;
    private String description;
    /** IGDB's average time to beat, in seconds - the games equivalent of a film's runtime. */
    private Integer averageCompletionSeconds;
    /** This app's own shrunk community score for the game, and how many ratings back it. */
    private Double communityRatingScore;
    private Integer communityRatingCount;
    /**
     * How long this profile's owner has actually recorded on the game. Null when they have
     * rated it without ever tracking a session here, which is the common case for a game
     * they played before joining - the row leaves the slot out rather than claiming zero.
     */
    private Long playtimeSeconds;
}
