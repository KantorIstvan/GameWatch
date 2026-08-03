package com.gamewatch.service;

import com.gamewatch.dto.GameCommunityDto;
import com.gamewatch.dto.GameRatingSummaryDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameCommunityServiceTest {

    @Mock private GameRepository gameRepository;
    @Mock private PlaythroughRepository playthroughRepository;
    @Mock private GameRatingService gameRatingService;

    @InjectMocks private GameCommunityService gameCommunityService;

    private Game game;
    private User viewer;

    @BeforeEach
    void setUp() {
        game = Game.builder().id(1L).name("Test Game").playtime(40).build();
        viewer = User.builder().id(99L).auth0UserId("auth0|99").build();
    }

    private Playthrough completedBy(long userId, long seconds) {
        return Playthrough.builder()
            .id(userId).user(User.builder().id(userId).auth0UserId("auth0|" + userId).build())
            .game(game).playthroughType("story")
            .durationSeconds(seconds).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .build();
    }

    private Playthrough droppedBy(long userId, long seconds) {
        return Playthrough.builder()
            .id(userId).user(User.builder().id(userId).auth0UserId("auth0|" + userId).build())
            .game(game).playthroughType("story")
            .durationSeconds(seconds).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(true).isActive(false).isPaused(false)
            .build();
    }

    private void stubGame(List<Playthrough> playthroughs) {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(playthroughRepository.findAllByGameId(1L)).thenReturn(playthroughs);
        when(gameRatingService.getSummary(any(), anyLong()))
            .thenReturn(GameRatingSummaryDto.builder().gameId(1L).build());
    }

    @Test
    void aggregatesAreWithheldUntilTheyDescribeAGroupRatherThanAPerson() {
        // "The one person who played this took 46 hours" is that person's playtime with a
        // label on it, readable by anyone who knows they own the game.
        stubGame(List.of(completedBy(1L, 165_600L), completedBy(2L, 100_000L)));

        GameCommunityDto stats = gameCommunityService.getCommunityStats(viewer, 1L);

        assertThat(stats.isHasEnoughDataToAggregate()).isFalse();
        assertThat(stats.getMedianCompletionSeconds()).isNull();
        assertThat(stats.getFastestCompletionSeconds()).isNull();
        assertThat(stats.getDropRatePercentage()).isNull();
        // The raw counts are safe to show, and are what tells a reader why the rest is absent.
        assertThat(stats.getPlayerCount()).isEqualTo(2);
        assertThat(stats.getMinimumPlayersRequired()).isEqualTo(5);
    }

    @Test
    void completionTimesComeFromMeasuredPlayNotSelfReport() {
        // The one thing this can say that HowLongToBeat cannot.
        List<Playthrough> playthroughs = new ArrayList<>();
        playthroughs.add(completedBy(1L, 100_000L));
        playthroughs.add(completedBy(2L, 120_000L));
        playthroughs.add(completedBy(3L, 140_000L));
        playthroughs.add(completedBy(4L, 160_000L));
        playthroughs.add(completedBy(5L, 180_000L));
        stubGame(playthroughs);

        GameCommunityDto stats = gameCommunityService.getCommunityStats(viewer, 1L);

        assertThat(stats.isHasEnoughDataToAggregate()).isTrue();
        assertThat(stats.getFinisherCount()).isEqualTo(5);
        assertThat(stats.getMedianCompletionSeconds()).isEqualTo(140_000L);
        assertThat(stats.getFastestCompletionSeconds()).isEqualTo(100_000L);
        assertThat(stats.getSlowestCompletionSeconds()).isEqualTo(180_000L);
        // RAWG's 40 hours, alongside rather than instead of the measured figure.
        assertThat(stats.getTypicalCompletionSeconds()).isEqualTo(144_000L);
    }

    @Test
    void dropRateCountsOnlyPlaythroughsThatReachedAnEnding() {
        List<Playthrough> playthroughs = new ArrayList<>();
        playthroughs.add(completedBy(1L, 100_000L));
        playthroughs.add(completedBy(2L, 100_000L));
        playthroughs.add(completedBy(3L, 100_000L));
        playthroughs.add(droppedBy(4L, 7_200L));
        playthroughs.add(droppedBy(5L, 3_600L));
        // Still playing: has not decided yet, so it belongs in neither side of the ratio.
        playthroughs.add(Playthrough.builder()
            .id(6L).user(User.builder().id(6L).auth0UserId("auth0|6").build())
            .game(game).playthroughType("story")
            .durationSeconds(1_000L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false).build());
        stubGame(playthroughs);

        GameCommunityDto stats = gameCommunityService.getCommunityStats(viewer, 1L);

        assertThat(stats.getPlayerCount()).isEqualTo(6);
        assertThat(stats.getDropRatePercentage()).isEqualTo(40.0); // 2 of 5 that ended
        assertThat(stats.getMedianSecondsBeforeDropping()).isEqualTo(3_600L);
    }
}
