package com.gamewatch.service;

import com.gamewatch.dto.GameTimeToBeatDto;
import com.gamewatch.dto.TimeToBeatCategoryDto;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * The community's own measured time to beat, split by playthrough type - the catalog
 * page's replacement for IGDB's single self-reported average, shown alongside rather
 * than trusting one estimate for every play style.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GameTimeToBeatService {

    /**
     * How many distinct players a category needs before its average is shown.
     *
     * Same floor and the same reasoning as {@link GameCommunityService}'s aggregate gate:
     * below this an "average" is one or two people's playtime with a label on it, not a
     * figure that describes a group. Gating on distinct players rather than raw
     * playthrough count also keeps one person's several playthroughs of their own
     * favourite game from single-handedly producing a "community" average.
     */
    private static final int MIN_PLAYERS_TO_AGGREGATE = 5;

    private static final String STORY = "story";
    private static final String HUNDRED_PERCENT = "100%";
    private static final String SPEEDRUN = "speedrun";

    private final GameRepository gameRepository;
    private final PlaythroughRepository playthroughRepository;

    @Transactional(readOnly = true)
    public GameTimeToBeatDto getTimeToBeat(Long gameId) {
        if (!gameRepository.existsById(gameId)) {
            throw new IllegalArgumentException("Game not found");
        }

        Map<String, TimeToBeatCategoryDto> byType = new HashMap<>();
        for (Object[] row : playthroughRepository.findCompletionStatsByGameId(gameId)) {
            String type = (String) row[0];
            long sampleSize = ((Number) row[1]).longValue();
            long playerCount = ((Number) row[2]).longValue();
            double averageSeconds = ((Number) row[3]).doubleValue();
            byType.put(type, toDto(sampleSize, playerCount, averageSeconds));
        }

        return GameTimeToBeatDto.builder()
            .gameId(gameId)
            .story(byType.getOrDefault(STORY, emptyCategory()))
            .hundredPercent(byType.getOrDefault(HUNDRED_PERCENT, emptyCategory()))
            .speedrun(byType.getOrDefault(SPEEDRUN, emptyCategory()))
            .build();
    }

    private TimeToBeatCategoryDto toDto(long sampleSize, long playerCount, double averageSeconds) {
        boolean enoughData = playerCount >= MIN_PLAYERS_TO_AGGREGATE;
        return TimeToBeatCategoryDto.builder()
            .sampleSize((int) sampleSize)
            .playerCount((int) playerCount)
            .averageSeconds(enoughData ? Math.round(averageSeconds) : null)
            .hasEnoughData(enoughData)
            .minimumPlayersRequired(MIN_PLAYERS_TO_AGGREGATE)
            .build();
    }

    private TimeToBeatCategoryDto emptyCategory() {
        return toDto(0, 0, 0);
    }
}
