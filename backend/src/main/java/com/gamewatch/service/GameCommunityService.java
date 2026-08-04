package com.gamewatch.service;

import com.gamewatch.dto.GameCommunityDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameCommunityService {

    /**
     * How many distinct players a game needs before its aggregates are shown.
     *
     * These figures are built from playthroughs regardless of whose library setting says
     * what, because an aggregate is not personal data - but only while it describes a
     * group. "The one person who played this took 46 hours" is that person's playtime with
     * a label on it, and a follower who knows they own the game can read it straight off.
     * Below this threshold nothing is reported at all.
     */
    private static final int MIN_PLAYERS_TO_AGGREGATE = 5;

    private final GameRepository gameRepository;
    private final PlaythroughRepository playthroughRepository;
    private final GameRatingService gameRatingService;

    @Transactional(readOnly = true)
    public GameCommunityDto getCommunityStats(User viewer, Long gameId) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        List<Playthrough> playthroughs = playthroughRepository.findAllByGameId(gameId);

        long playerCount = playthroughs.stream()
            .map(p -> p.getUser().getId())
            .distinct()
            .count();

        List<Long> completionTimes = playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .map(Playthrough::effectivePlaytimeSeconds)
            .filter(seconds -> seconds > 0)
            .sorted()
            .collect(Collectors.toList());

        List<Long> droppedTimes = playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsDropped()))
            .map(Playthrough::effectivePlaytimeSeconds)
            .sorted()
            .collect(Collectors.toList());

        boolean enoughData = playerCount >= MIN_PLAYERS_TO_AGGREGATE;
        int endedEitherWay = completionTimes.size() + droppedTimes.size();

        return GameCommunityDto.builder()
            .gameId(game.getId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .playerCount((int) playerCount)
            .finisherCount(completionTimes.size())
            .medianCompletionSeconds(enoughData ? percentile(completionTimes, 0.50) : null)
            .fastestCompletionSeconds(enoughData && !completionTimes.isEmpty()
                ? completionTimes.get(0) : null)
            .slowestCompletionSeconds(enoughData && !completionTimes.isEmpty()
                ? completionTimes.get(completionTimes.size() - 1) : null)
            .typicalCompletionSeconds(game.getAverageCompletionSeconds() != null && game.getAverageCompletionSeconds() > 0
                ? game.getAverageCompletionSeconds().longValue() : null)
            .dropRatePercentage(enoughData && endedEitherWay > 0
                ? (double) droppedTimes.size() / endedEitherWay * 100.0 : null)
            .medianSecondsBeforeDropping(enoughData ? percentile(droppedTimes, 0.50) : null)
            .hasEnoughDataToAggregate(enoughData)
            .minimumPlayersRequired(MIN_PLAYERS_TO_AGGREGATE)
            .rating(gameRatingService.getSummary(viewer, gameId))
            .build();
    }

    private Long percentile(List<Long> ascending, double fraction) {
        if (ascending.isEmpty()) {
            return null;
        }
        int rank = (int) Math.ceil(fraction * ascending.size()) - 1;
        return ascending.get(Math.max(0, Math.min(ascending.size() - 1, rank)));
    }
}
