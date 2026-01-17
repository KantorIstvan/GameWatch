package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class GameRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private GameRepository gameRepository;

    @Test
    void findById_ExistingGame_ReturnsGame() {
        Game game = Game.builder()
            .name("Test Game")
            .externalId(12345)
            .bannerImageUrl("https://example.com/banner.jpg")
            .description("A test game")
            .releaseDate("2023-01-01")
            .rating(4.5)
            .build();
        entityManager.persist(game);
        entityManager.flush();

        Optional<Game> result = gameRepository.findById(game.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Test Game");
        assertThat(result.get().getExternalId()).isEqualTo(12345);
    }

    @Test
    void save_PersistsGame() {
        Game game = Game.builder()
            .name("New Game")
            .externalId(54321)
            .bannerImageUrl("https://example.com/banner.jpg")
            .build();

        Game saved = gameRepository.save(game);
        entityManager.flush();
        entityManager.clear();

        Game found = entityManager.find(Game.class, saved.getId());
        assertThat(found).isNotNull();
        assertThat(found.getName()).isEqualTo("New Game");
        assertThat(found.getExternalId()).isEqualTo(54321);
    }

    @Test
    void delete_RemovesGame() {
        Game game = Game.builder()
            .name("Game to Delete")
            .externalId(77777)
            .build();
        entityManager.persist(game);
        entityManager.flush();
        Long gameId = game.getId();

        gameRepository.delete(game);
        entityManager.flush();

        Game found = entityManager.find(Game.class, gameId);
        assertThat(found).isNull();
    }
}
