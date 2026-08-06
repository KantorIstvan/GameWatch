package com.gamewatch.dto;

import lombok.*;

/**
 * One game a user has rated, and the score they gave it - the row shape behind the
 * "Ratings" tab on a profile. Distinct from {@link UserStatisticsDto.GameRankingDto}: that
 * type is built around playtime (and the many playtime-shaped fields that come with it),
 * this one is built around a 1-10 score and nothing else.
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
}
