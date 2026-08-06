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
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRatingEntryDto {
    private Long gameId;
    private String gameName;
    private String bannerImageUrl;
    private Integer score;
    private Instant ratedAt;
    private String reviewBody;
    private Instant reviewCreatedAt;
    private boolean containsSpoilers;
}
