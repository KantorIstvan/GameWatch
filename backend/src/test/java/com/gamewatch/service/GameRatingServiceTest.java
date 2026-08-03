package com.gamewatch.service;

import com.gamewatch.dto.GameRatingSummaryDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameRating;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRatingRepository;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.UserGameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameRatingServiceTest {

    @Mock
    private GameRatingRepository gameRatingRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @InjectMocks
    private GameRatingService gameRatingService;

    private User user;
    private Game game;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).auth0UserId("auth0|123").build();
        game = Game.builder().id(1L).name("Test Game").ratingCount(0).ratingSum(0L).build();
    }

    private void stubAggregate(long count, long sum, Double globalMean) {
        when(gameRatingRepository.findCountAndSum(1L))
            .thenReturn(Collections.singletonList(new Object[]{count, sum}));
        lenient().when(gameRatingRepository.findGlobalMeanScore()).thenReturn(globalMean);
        lenient().when(gameRepository.save(any(Game.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void aSingleTenDoesNotOutrankAWellSupportedNine() {
        // The failure mode of every raw-average leaderboard: one enthusiastic rating puts
        // an obscure game top. Shrinkage towards the global mean is what prevents it.
        stubAggregate(1, 10, 7.0);

        gameRatingService.recomputeAggregate(game);
        double loneTen = game.getBayesianScore();

        Game popular = Game.builder().id(2L).name("Popular").ratingCount(0).ratingSum(0L).build();
        when(gameRatingRepository.findCountAndSum(2L))
            .thenReturn(Collections.singletonList(new Object[]{200L, 1880L})); // mean 9.4

        gameRatingService.recomputeAggregate(popular);
        double wellSupported = popular.getBayesianScore();

        assertThat(loneTen).isLessThan(wellSupported);
        // The lone 10 is dragged most of the way back to the 7.0 prior.
        assertThat(loneTen).isCloseTo(7.27, within(0.05));
        assertThat(wellSupported).isCloseTo(9.29, within(0.05));
    }

    @Test
    void aGameWithNoRatingsHasNoScoreRatherThanAZero() {
        // Null keeps "nobody has rated this" distinguishable from "rated badly", which a
        // zero or a defaulted mid-scale value would not.
        when(gameRatingRepository.findCountAndSum(1L))
            .thenReturn(Collections.singletonList(new Object[]{0L, 0L}));
        when(gameRepository.save(any(Game.class))).thenAnswer(i -> i.getArgument(0));

        gameRatingService.recomputeAggregate(game);

        assertThat(game.getBayesianScore()).isNull();
        assertThat(game.getRatingCount()).isZero();
    }

    @Test
    void theFirstEverRatingFallsBackToANeutralPrior() {
        stubAggregate(1, 8, null);

        gameRatingService.recomputeAggregate(game);

        // (1/11)*8 + (10/11)*5.5
        assertThat(game.getBayesianScore()).isCloseTo(5.727, within(0.01));
    }

    @Test
    void ratingIsLimitedToGamesInYourLibrary() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(userGameRepository.existsByUserAndGame(user, game)).thenReturn(false);

        assertThatThrownBy(() -> gameRatingService.rate(user, 1L, 8))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("library");

        verify(gameRatingRepository, never()).save(any());
    }

    @Test
    void scoresOutsideOneToTenAreRejected() {
        assertThatThrownBy(() -> gameRatingService.rate(user, 1L, 0))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> gameRatingService.rate(user, 1L, 11))
            .isInstanceOf(IllegalArgumentException.class);

        verify(gameRepository, never()).findById(anyLong());
    }

    @Test
    void ratingTheSameGameTwiceUpdatesTheOpinionRatherThanAddingASecond() {
        GameRating existing = GameRating.builder().id(5L).user(user).game(game).score(4).build();

        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(userGameRepository.existsByUserAndGame(user, game)).thenReturn(true);
        when(gameRatingRepository.findByUserAndGame(user, game)).thenReturn(Optional.of(existing));
        stubAggregate(1, 9, 7.0);
        when(gameRatingRepository.findScoreDistribution(1L)).thenReturn(List.of());
        when(gameRatingRepository.findScoresWithRecordedPlaytime(anyLong(), anyLong()))
            .thenReturn(List.of());
        when(gameRatingRepository.findScoresFromFinishers(1L)).thenReturn(List.of());

        gameRatingService.rate(user, 1L, 9);

        assertThat(existing.getScore()).isEqualTo(9);
        verify(gameRatingRepository).save(existing);
    }

    @Test
    void summaryReportsFinishersSeparatelyFromEveryone() {
        // The differentiator over Metacritic and RAWG: this app knows who actually played
        // and finished, so it can say what they thought without guessing.
        game.setRatingCount(4);
        game.setRatingSum(24L); // overall mean 6.0
        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(gameRatingRepository.findScoreDistribution(1L))
            .thenReturn(List.of(new Object[]{3, 2L}, new Object[]{9, 2L}));
        when(gameRatingRepository.findScoresWithRecordedPlaytime(anyLong(), anyLong()))
            .thenReturn(List.of(9, 9, 3));
        when(gameRatingRepository.findScoresFromFinishers(1L)).thenReturn(List.of(9, 9));
        when(gameRatingRepository.findByUserAndGame(user, game)).thenReturn(Optional.empty());

        GameRatingSummaryDto summary = gameRatingService.getSummary(user, 1L);

        assertThat(summary.getAverageScore()).isEqualTo(6.0);
        assertThat(summary.getFinisherCount()).isEqualTo(2);
        assertThat(summary.getFinisherAverageScore()).isEqualTo(9.0);
        assertThat(summary.getVerifiedAverageScore()).isCloseTo(7.0, within(0.01));
        // Every bucket present, so the histogram has no gaps to special-case.
        assertThat(summary.getDistribution()).hasSize(10);
        assertThat(summary.getDistribution().get(3)).isEqualTo(2L);
        assertThat(summary.getDistribution().get(5)).isZero();
    }
}
