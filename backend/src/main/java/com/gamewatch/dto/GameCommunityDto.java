package com.gamewatch.dto;

import lombok.*;

/**
 * What this app's own users have done with a game, as opposed to what it is.
 *
 * The completion figures come from measured session time rather than self-reported
 * estimates, which is the one thing this can say that HowLongToBeat cannot.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameCommunityDto {
    private Long gameId;
    private String gameName;
    private String bannerImageUrl;

    private int playerCount;
    private int finisherCount;

    /**
     * Null until enough people have finished it for an aggregate to describe a group
     * rather than an individual.
     */
    private Long medianCompletionSeconds;
    private Long fastestCompletionSeconds;
    private Long slowestCompletionSeconds;

    /** IGDB's own average time-to-beat, for comparison against what was actually measured here. */
    private Long typicalCompletionSeconds;

    private Double dropRatePercentage;
    private Long medianSecondsBeforeDropping;

    /** False when too few people have played it to report anything without exposing them. */
    private boolean hasEnoughDataToAggregate;
    private int minimumPlayersRequired;

    private GameRatingSummaryDto rating;
}
