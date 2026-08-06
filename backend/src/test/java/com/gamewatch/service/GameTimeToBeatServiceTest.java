package com.gamewatch.service;

import com.gamewatch.dto.GameTimeToBeatDto;
import com.gamewatch.dto.TimeToBeatCategoryDto;
import com.gamewatch.repository.GameRepository;
import com.gamewatch.repository.PlaythroughRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameTimeToBeatServiceTest {

    @Mock private GameRepository gameRepository;
    @Mock private PlaythroughRepository playthroughRepository;

    @InjectMocks private GameTimeToBeatService gameTimeToBeatService;

    @Test
    void categoriesWithFewerThanFivePlayersAreWithheldEvenIfSampleSizeIsHigher() {
        // One person with six playthroughs of their own favourite game must not read as a
        // community average - the gate is on distinct players, not raw row count.
        when(gameRepository.existsById(1L)).thenReturn(true);
        when(playthroughRepository.findCompletionStatsByGameId(1L)).thenReturn(List.<Object[]>of(
            new Object[]{"story", 6L, 1L, 12_000.0}
        ));

        GameTimeToBeatDto dto = gameTimeToBeatService.getTimeToBeat(1L);

        assertThat(dto.getStory().isHasEnoughData()).isFalse();
        assertThat(dto.getStory().getAverageSeconds()).isNull();
        assertThat(dto.getStory().getSampleSize()).isEqualTo(6);
        assertThat(dto.getStory().getPlayerCount()).isEqualTo(1);
        assertThat(dto.getStory().getMinimumPlayersRequired()).isEqualTo(5);
    }

    @Test
    void categoryWithEnoughDistinctPlayersReportsARoundedAverage() {
        when(gameRepository.existsById(1L)).thenReturn(true);
        when(playthroughRepository.findCompletionStatsByGameId(1L)).thenReturn(List.<Object[]>of(
            new Object[]{"speedrun", 7L, 5L, 3_599.6}
        ));

        GameTimeToBeatDto dto = gameTimeToBeatService.getTimeToBeat(1L);

        assertThat(dto.getSpeedrun().isHasEnoughData()).isTrue();
        assertThat(dto.getSpeedrun().getAverageSeconds()).isEqualTo(3_600L);
        assertThat(dto.getSpeedrun().getSampleSize()).isEqualTo(7);
        assertThat(dto.getSpeedrun().getPlayerCount()).isEqualTo(5);
    }

    @Test
    void categoriesWithNoPlaythroughsAtAllComeBackAsAbsentRatherThanZero() {
        when(gameRepository.existsById(1L)).thenReturn(true);
        when(playthroughRepository.findCompletionStatsByGameId(1L)).thenReturn(List.of());

        GameTimeToBeatDto dto = gameTimeToBeatService.getTimeToBeat(1L);

        for (TimeToBeatCategoryDto category : List.of(dto.getStory(), dto.getHundredPercent(), dto.getSpeedrun())) {
            assertThat(category.isHasEnoughData()).isFalse();
            assertThat(category.getAverageSeconds()).isNull();
            assertThat(category.getSampleSize()).isZero();
            assertThat(category.getPlayerCount()).isZero();
        }
    }

    @Test
    void unknownGameIsRejected() {
        when(gameRepository.existsById(404L)).thenReturn(false);

        assertThatThrownBy(() -> gameTimeToBeatService.getTimeToBeat(404L))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
