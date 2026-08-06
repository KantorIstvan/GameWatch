package com.gamewatch.dto;

import lombok.*;

/**
 * One playthrough category's community-measured time to beat (Story / 100% / Speedrun).
 *
 * The average comes from every qualifying playthrough of that type across all users, not
 * just this game's most active player, and stays null until enough distinct players have
 * logged one - see {@link GameTimeToBeatDto}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeToBeatCategoryDto {
    /** Null until {@link #isHasEnoughData()} - see GameTimeToBeatService for the threshold. */
    private Long averageSeconds;
    private int sampleSize;
    private int playerCount;
    private boolean hasEnoughData;
    private int minimumPlayersRequired;
}
