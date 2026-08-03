package com.gamewatch.service;

import com.gamewatch.dto.ProfileComparisonDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.entity.Visibility;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileComparisonServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PlaythroughRepository playthroughRepository;
    @Mock private UserGameRepository userGameRepository;
    @Mock private FollowService followService;

    @InjectMocks private ProfileComparisonService profileComparisonService;

    private User viewer;
    private User them;
    private Game shared;
    private Game onlyTheirs;

    @BeforeEach
    void setUp() {
        viewer = User.builder().id(1L).auth0UserId("auth0|1").handle("viewer")
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        them = User.builder().id(2L).auth0UserId("auth0|2").handle("them")
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        shared = Game.builder().id(10L).name("Shared Game").build();
        onlyTheirs = Game.builder().id(11L).name("Only Theirs").build();
    }

    private Playthrough playthrough(User user, Game game, long seconds, boolean completed) {
        return Playthrough.builder()
            .id(game.getId() + user.getId() * 100).user(user).game(game).playthroughType("story")
            .durationSeconds(seconds).importedDurationSeconds(0L).sessionCount(3)
            .isCompleted(completed).isDropped(false).isActive(false).isPaused(false)
            .build();
    }

    @Test
    void aHiddenLibraryCannotBeComparedAgainst() {
        // Comparison is gated on exactly the visibility a profile is, so it adds no
        // reachable data - and reports absence the same way a profile does.
        them.setLibraryVisibility(Visibility.PRIVATE);
        when(userRepository.findByHandleIgnoreCase("them")).thenReturn(Optional.of(them));
        when(followService.canView(viewer, them, Visibility.PRIVATE)).thenReturn(false);

        assertThatThrownBy(() -> profileComparisonService.compare(viewer, "them"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Profile not found");
    }

    @Test
    void comparingAProfileWithItselfIsRejected() {
        when(userRepository.findByHandleIgnoreCase("viewer")).thenReturn(Optional.of(viewer));

        assertThatThrownBy(() -> profileComparisonService.compare(viewer, "viewer"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("itself");
    }

    @Test
    void onlyGamesBothPeopleHavePlayedCountAsShared() {
        when(userRepository.findByHandleIgnoreCase("them")).thenReturn(Optional.of(them));
        when(followService.canView(viewer, them, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L))
            .thenReturn(List.of(playthrough(viewer, shared, 7_200L, true)));
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L))
            .thenReturn(List.of(
                playthrough(them, shared, 36_000L, false),
                playthrough(them, onlyTheirs, 5_000L, false)));
        lenient().when(userGameRepository.findGamesByUser(any())).thenReturn(List.of());

        ProfileComparisonDto comparison = profileComparisonService.compare(viewer, "them");

        assertThat(comparison.getSharedGameCount()).isEqualTo(1);
        assertThat(comparison.getSharedGames()).hasSize(1);

        ProfileComparisonDto.SharedGameDto game = comparison.getSharedGames().get(0);
        assertThat(game.getGameId()).isEqualTo(10L);
        assertThat(game.getYourSeconds()).isEqualTo(7_200L);
        assertThat(game.getTheirSeconds()).isEqualTo(36_000L);
        assertThat(game.isYouFinished()).isTrue();
        assertThat(game.isTheyFinished()).isFalse();
    }

    @Test
    void sharedGamesLeadWithTheOnesBothActuallyPlayed() {
        Game barelyTouched = Game.builder().id(12L).name("Barely Touched").build();

        when(userRepository.findByHandleIgnoreCase("them")).thenReturn(Optional.of(them));
        when(followService.canView(viewer, them, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L))
            .thenReturn(List.of(
                playthrough(viewer, barelyTouched, 600L, false),
                playthrough(viewer, shared, 7_200L, false)));
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L))
            .thenReturn(List.of(
                playthrough(them, barelyTouched, 600L, false),
                playthrough(them, shared, 36_000L, false)));
        lenient().when(userGameRepository.findGamesByUser(any())).thenReturn(List.of());

        ProfileComparisonDto comparison = profileComparisonService.compare(viewer, "them");

        assertThat(comparison.getSharedGames()).extracting(ProfileComparisonDto.SharedGameDto::getGameId)
            .containsExactly(10L, 12L);
    }
}
