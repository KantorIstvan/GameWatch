package com.gamewatch.service;

import com.gamewatch.dto.GameReviewDto;
import com.gamewatch.dto.SubmitReviewRequest;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameReviewServiceTest {

    @Mock private GameReviewRepository gameReviewRepository;
    @Mock private ReviewVoteRepository reviewVoteRepository;
    @Mock private GameRatingRepository gameRatingRepository;
    @Mock private GameRepository gameRepository;
    @Mock private UserGameRepository userGameRepository;
    @Mock private PlaythroughRepository playthroughRepository;

    @InjectMocks private GameReviewService gameReviewService;

    private User author;
    private Game game;

    @BeforeEach
    void setUp() {
        author = User.builder().id(1L).auth0UserId("auth0|1").handle("author").build();
        game = Game.builder().id(1L).name("Test Game").build();
    }

    private SubmitReviewRequest request(String body) {
        return SubmitReviewRequest.builder().body(body).containsSpoilers(false).language("en").build();
    }

    private void stubWritableGame() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(userGameRepository.existsByUserAndGame(author, game)).thenReturn(true);
    }

    @Test
    void aReviewTooShortToSayAnythingIsRejected() {
        stubWritableGame();

        assertThatThrownBy(() -> gameReviewService.submitReview(author, 1L, request("Good game")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("at least");

        verify(gameReviewRepository, never()).save(any());
    }

    @Test
    void reviewingIsLimitedToGamesInYourLibrary() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(game));
        when(userGameRepository.existsByUserAndGame(author, game)).thenReturn(false);

        assertThatThrownBy(() -> gameReviewService.submitReview(author, 1L,
                request("A perfectly reasonable review of some length.")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("library");
    }

    @Test
    void aBurstOfNewReviewsFromOneAccountIsStopped() {
        // Ten a day is generous for someone writing about games they played, and low
        // enough that brigading a score with fresh text costs real effort.
        stubWritableGame();
        when(gameReviewRepository.findByUserAndGame(author, game)).thenReturn(Optional.empty());
        when(gameReviewRepository.countWrittenSince(anyLong(), any())).thenReturn(10L);

        assertThatThrownBy(() -> gameReviewService.submitReview(author, 1L,
                request("Another review, written suspiciously soon after the last ten.")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("tomorrow");

        verify(gameReviewRepository, never()).save(any());
    }

    @Test
    void editingYourOwnReviewDoesNotCountAgainstTheDailyLimit() {
        // The limit exists to stop brigading, not to stop someone rewording themselves.
        GameReview existing = GameReview.builder().id(5L).user(author).game(game)
            .body("An older version of this review, long enough to pass.").helpfulCount(0).build();

        stubWritableGame();
        when(gameReviewRepository.findByUserAndGame(author, game)).thenReturn(Optional.of(existing));
        when(gameReviewRepository.save(any(GameReview.class))).thenAnswer(i -> i.getArgument(0));
        when(gameRatingRepository.findByUserAndGame(any(), any())).thenReturn(Optional.empty());
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(1L, 1L))
            .thenReturn(List.of());

        gameReviewService.submitReview(author, 1L, request("A revised review, also long enough."));

        verify(gameReviewRepository, never()).countWrittenSince(anyLong(), any());
        assertThat(existing.getBody()).isEqualTo("A revised review, also long enough.");
    }

    @Test
    void youCannotMarkYourOwnReviewHelpful() {
        GameReview own = GameReview.builder().id(5L).user(author).game(game)
            .body("Mine").helpfulCount(0).build();
        when(gameReviewRepository.findById(5L)).thenReturn(Optional.of(own));

        assertThatThrownBy(() -> gameReviewService.toggleHelpful(author, 5L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("your own review");

        verify(reviewVoteRepository, never()).save(any());
    }

    @Test
    void votingAgainWithdrawsTheVoteRatherThanStackingIt() {
        User voter = User.builder().id(2L).auth0UserId("auth0|2").handle("voter").build();
        GameReview review = GameReview.builder().id(5L).user(author).game(game)
            .body("Theirs").helpfulCount(1).build();
        ReviewVote existingVote = ReviewVote.builder().id(9L).review(review).user(voter).build();

        when(gameReviewRepository.findById(5L)).thenReturn(Optional.of(review));
        when(reviewVoteRepository.findByReviewAndUser(review, voter))
            .thenReturn(Optional.of(existingVote));
        when(reviewVoteRepository.countByReview(review)).thenReturn(0L);
        when(gameReviewRepository.save(any(GameReview.class))).thenAnswer(i -> i.getArgument(0));
        when(reviewVoteRepository.findVotedReviewIds(2L, List.of(5L))).thenReturn(Set.of());
        when(gameRatingRepository.findByUserAndGame(any(), any())).thenReturn(Optional.empty());
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(1L, 1L))
            .thenReturn(List.of());

        GameReviewDto result = gameReviewService.toggleHelpful(voter, 5L);

        verify(reviewVoteRepository).delete(existingVote);
        verify(reviewVoteRepository, never()).save(any());
        // Recomputed from the vote rows, not decremented, so it cannot drift.
        assertThat(result.getHelpfulCount()).isZero();
    }

    @Test
    void aReviewCarriesTheEvidenceBehindItsOpinion() {
        // Playtime and completion are what this app can show that a review site cannot.
        Playthrough finished = Playthrough.builder()
            .id(1L).user(author).game(game).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .build();
        GameReview review = GameReview.builder().id(5L).user(author).game(game)
            .body("Long enough to be a real review of this game.").helpfulCount(3).build();

        when(gameReviewRepository.findMostHelpful(1L)).thenReturn(List.of(review));
        when(reviewVoteRepository.findVotedReviewIds(1L, List.of(5L))).thenReturn(Set.of());
        when(gameRatingRepository.findByUserAndGame(author, game))
            .thenReturn(Optional.of(GameRating.builder().score(9).build()));
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(1L, 1L))
            .thenReturn(List.of(finished));

        List<GameReviewDto> reviews = gameReviewService.getReviews(author, 1L, "helpful", null);

        assertThat(reviews).hasSize(1);
        assertThat(reviews.get(0).getAuthorScore()).isEqualTo(9);
        assertThat(reviews.get(0).getAuthorPlaytimeSeconds()).isEqualTo(36_000L);
        assertThat(reviews.get(0).isAuthorFinished()).isTrue();
        assertThat(reviews.get(0).isOwnReview()).isTrue();
    }

    @Test
    void theLanguageFilterNarrowsToWhatTheReaderCanRead() {
        // The app ships in 40 languages; without this a reader gets a list they mostly
        // cannot read and no way to narrow it.
        GameReview english = GameReview.builder().id(1L).user(author).game(game)
            .body("An English review of sufficient length.").language("en").helpfulCount(0).build();
        GameReview hungarian = GameReview.builder().id(2L).user(author).game(game)
            .body("Egy magyar nyelvu ertekeles megfelelo hosszusaggal.").language("hu")
            .helpfulCount(0).build();

        when(gameReviewRepository.findMostHelpful(1L)).thenReturn(List.of(english, hungarian));
        when(reviewVoteRepository.findVotedReviewIds(anyLong(), any())).thenReturn(Set.of());
        when(gameRatingRepository.findByUserAndGame(any(), any())).thenReturn(Optional.empty());
        when(playthroughRepository.findByUserIdAndGameIdOrderByCreatedAtDesc(anyLong(), anyLong()))
            .thenReturn(List.of());

        List<GameReviewDto> reviews = gameReviewService.getReviews(author, 1L, "helpful", "hu");

        assertThat(reviews).hasSize(1);
        assertThat(reviews.get(0).getLanguage()).isEqualTo("hu");
    }
}
