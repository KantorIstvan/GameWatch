package com.gamewatch.service;

import com.gamewatch.dto.GameRatingSummaryDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameRating;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRatingRepository;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.UserGameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameRatingService {

    /**
     * How many ratings a game needs before its own average carries most of the weight.
     *
     * At m ratings the score sits halfway between the game's mean and the global one. Low
     * enough that a game with genuine support reaches its real score quickly, high enough
     * that one enthusiastic 10 cannot put an obscure game top of the list.
     */
    private static final double PRIOR_WEIGHT = 10.0;

    /** Fallback prior before anything has been rated, mid-scale on 1-10. */
    private static final double NEUTRAL_MEAN = 5.5;

    /** Time on record before a rating counts as backed by having played the game. */
    private static final long VERIFIED_PLAYTIME_SECONDS = 1800L;

    private final GameRatingRepository gameRatingRepository;
    private final GameRepository gameRepository;
    private final UserGameRepository userGameRepository;

    @Transactional
    public GameRatingSummaryDto rate(User user, Long gameId, int score) {
        if (score < 1 || score > 10) {
            throw new IllegalArgumentException("Rating must be between 1 and 10");
        }

        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        // Rating is limited to games in your own library. It is a weak check - anyone can
        // add a game - but it costs nothing and stops a drive-by script rating the whole
        // catalogue without ever touching it.
        if (!userGameRepository.existsByUserAndGame(user, game)) {
            throw new IllegalArgumentException("Add this game to your library before rating it");
        }

        GameRating rating = gameRatingRepository.findByUserAndGame(user, game)
            .orElseGet(() -> GameRating.builder().user(user).game(game).build());
        rating.setScore(score);
        gameRatingRepository.save(rating);

        recomputeAggregate(game);
        return getSummary(user, gameId);
    }

    @Transactional
    public GameRatingSummaryDto removeRating(User user, Long gameId) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        gameRatingRepository.findByUserAndGame(user, game)
            .ifPresent(gameRatingRepository::delete);

        recomputeAggregate(game);
        return getSummary(user, gameId);
    }

    /**
     * Recomputes the cached count, sum and shrunk score from the rating rows.
     *
     * The denormalised columns are a cache of game_ratings and never the source, so every
     * write recomputes them from scratch rather than adjusting them incrementally - an
     * incremental update that drifts is unrecoverable without a full rebuild.
     */
    @Transactional
    public void recomputeAggregate(Game game) {
        Object[] row = gameRatingRepository.findCountAndSum(game.getId()).get(0);
        long count = ((Number) row[0]).longValue();
        long sum = ((Number) row[1]).longValue();

        game.setRatingCount((int) count);
        game.setRatingSum(sum);
        game.setBayesianScore(count == 0 ? null : bayesianScore(count, sum));
        gameRepository.save(game);
    }

    /**
     * The IMDb Top-250 formula: a game's own mean pulled towards the global mean in
     * proportion to how little evidence stands behind it.
     *
     * <pre>weighted = (v / (v + m)) * R + (m / (v + m)) * C</pre>
     *
     * Without this a single 10 outranks a game with two hundred ratings averaging 9.4,
     * which is the failure mode of every raw-average leaderboard.
     */
    private double bayesianScore(long ratingCount, long ratingSum) {
        double ownMean = (double) ratingSum / ratingCount;
        Double globalMean = gameRatingRepository.findGlobalMeanScore();
        double prior = globalMean != null ? globalMean : NEUTRAL_MEAN;

        return (ratingCount / (ratingCount + PRIOR_WEIGHT)) * ownMean
            + (PRIOR_WEIGHT / (ratingCount + PRIOR_WEIGHT)) * prior;
    }

    @Transactional(readOnly = true)
    public GameRatingSummaryDto getSummary(User user, Long gameId) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int score = 1; score <= 10; score++) {
            distribution.put(score, 0L);
        }
        for (Object[] row : gameRatingRepository.findScoreDistribution(gameId)) {
            distribution.put((Integer) row[0], ((Number) row[1]).longValue());
        }

        List<Integer> verified = gameRatingRepository
            .findScoresWithRecordedPlaytime(gameId, VERIFIED_PLAYTIME_SECONDS);
        List<Integer> finishers = gameRatingRepository.findScoresFromFinishers(gameId);

        Integer ownScore = gameRatingRepository.findByUserAndGame(user, game)
            .map(GameRating::getScore)
            .orElse(null);

        return GameRatingSummaryDto.builder()
            .gameId(gameId)
            .ratingCount(game.getRatingCount())
            .averageScore(game.getRatingCount() == 0
                ? null
                : (double) game.getRatingSum() / game.getRatingCount())
            .bayesianScore(game.getBayesianScore())
            .distribution(distribution)
            .verifiedCount(verified.size())
            .verifiedAverageScore(mean(verified))
            .finisherCount(finishers.size())
            .finisherAverageScore(mean(finishers))
            .yourScore(ownScore)
            .build();
    }

    private Double mean(List<Integer> scores) {
        return scores.isEmpty()
            ? null
            : scores.stream().mapToInt(Integer::intValue).average().orElse(0.0);
    }
}
