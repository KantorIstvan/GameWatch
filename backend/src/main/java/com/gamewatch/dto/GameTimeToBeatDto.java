package com.gamewatch.dto;

import lombok.*;

/**
 * The community's own measured time to beat for a game, broken out by playthrough type -
 * this app's replacement for IGDB's single self-reported average, built from actual
 * session time logged by everyone who has played it here.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameTimeToBeatDto {
    private Long gameId;
    private TimeToBeatCategoryDto story;
    private TimeToBeatCategoryDto hundredPercent;
    private TimeToBeatCategoryDto speedrun;
}
