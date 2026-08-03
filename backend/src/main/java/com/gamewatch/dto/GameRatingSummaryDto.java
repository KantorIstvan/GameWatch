package com.gamewatch.dto;

import lombok.*;

import java.util.Map;

/**
 * A game's rating from every angle worth showing.
 *
 * Both the raw average and the shrunk score are returned. The shrunk one is what a game is
 * ranked by; the raw one, next to the count and the distribution, is what makes the number
 * explainable instead of magic.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRatingSummaryDto {
    private Long gameId;
    private int ratingCount;
    /** Null when nobody has rated it, so "unrated" stays distinct from "rated badly". */
    private Double averageScore;
    private Double bayesianScore;
    private Map<Integer, Long> distribution;

    /** Ratings from people with real time recorded against the game. */
    private int verifiedCount;
    private Double verifiedAverageScore;

    /** Ratings from people who actually finished it. */
    private int finisherCount;
    private Double finisherAverageScore;

    private Integer yourScore;
}
