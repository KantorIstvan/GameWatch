package com.gamewatch.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

class PlaythroughTest {

    @Test
    void builder_CreatesPlaythroughWithAllFields() {
        User user = User.builder().id(1L).auth0UserId("auth0|123").build();
        Game game = Game.builder().id(1L).name("Test Game").build();
        Instant now = Instant.now();
        LocalDate today = LocalDate.now();

        Playthrough playthrough = Playthrough.builder()
            .id(1L)
            .user(user)
            .game(game)
            .playthroughType("story")
            .title("First Playthrough")
            .platform("PC")
            .startedAt(now)
            .stoppedAt(now)
            .durationSeconds(3600L)
            .isActive(true)
            .isCompleted(false)
            .isDropped(false)
            .isPaused(false)
            .startDate(today)
            .endDate(today)
            .sessionCount(1)
            .pauseCount(0)
            .lastPlayedAt(now)
            .sessionStartDurationSeconds(0L)
            .importedDurationSeconds(0L)
            .build();

        assertThat(playthrough.getId()).isEqualTo(1L);
        assertThat(playthrough.getUser()).isEqualTo(user);
        assertThat(playthrough.getGame()).isEqualTo(game);
        assertThat(playthrough.getPlaythroughType()).isEqualTo("story");
        assertThat(playthrough.getTitle()).isEqualTo("First Playthrough");
        assertThat(playthrough.getPlatform()).isEqualTo("PC");
        assertThat(playthrough.getDurationSeconds()).isEqualTo(3600L);
        assertThat(playthrough.getIsActive()).isTrue();
        assertThat(playthrough.getIsCompleted()).isFalse();
        assertThat(playthrough.getSessionCount()).isEqualTo(1);
    }

    @Test
    void builder_DefaultValues() {
        User user = User.builder().id(1L).build();
        Game game = Game.builder().id(1L).build();

        Playthrough playthrough = Playthrough.builder()
            .user(user)
            .game(game)
            .build();

        assertThat(playthrough.getPlaythroughType()).isEqualTo("story");
        assertThat(playthrough.getDurationSeconds()).isEqualTo(0L);
        assertThat(playthrough.getIsActive()).isFalse();
        assertThat(playthrough.getIsCompleted()).isFalse();
        assertThat(playthrough.getIsDropped()).isFalse();
        assertThat(playthrough.getIsPaused()).isFalse();
        assertThat(playthrough.getSessionCount()).isEqualTo(0);
        assertThat(playthrough.getPauseCount()).isEqualTo(0);
        assertThat(playthrough.getImportedDurationSeconds()).isEqualTo(0L);
    }

    @Test
    void setters_UpdateFields() {
        User user = User.builder().id(1L).build();
        Game game = Game.builder().id(1L).build();
        Playthrough playthrough = Playthrough.builder()
            .user(user)
            .game(game)
            .build();

        playthrough.setIsActive(true);
        playthrough.setDurationSeconds(5000L);
        playthrough.setSessionCount(3);
        playthrough.setIsCompleted(true);
        playthrough.setPauseCount(2);

        assertThat(playthrough.getIsActive()).isTrue();
        assertThat(playthrough.getDurationSeconds()).isEqualTo(5000L);
        assertThat(playthrough.getSessionCount()).isEqualTo(3);
        assertThat(playthrough.getIsCompleted()).isTrue();
        assertThat(playthrough.getPauseCount()).isEqualTo(2);
    }

    @Test
    void importedFromPlaythrough_CanBeSet() {
        User user = User.builder().id(1L).build();
        Game game = Game.builder().id(1L).build();
        
        Playthrough sourcePlaythrough = Playthrough.builder()
            .id(1L)
            .user(user)
            .game(game)
            .durationSeconds(10000L)
            .build();

        Playthrough targetPlaythrough = Playthrough.builder()
            .id(2L)
            .user(user)
            .game(game)
            .build();

        targetPlaythrough.setImportedFromPlaythrough(sourcePlaythrough);
        targetPlaythrough.setImportedDurationSeconds(10000L);

        assertThat(targetPlaythrough.getImportedFromPlaythrough()).isEqualTo(sourcePlaythrough);
        assertThat(targetPlaythrough.getImportedDurationSeconds()).isEqualTo(10000L);
    }
}
