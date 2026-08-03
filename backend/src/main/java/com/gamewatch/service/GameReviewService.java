package com.gamewatch.service;

import com.gamewatch.dto.GameReviewDto;
import com.gamewatch.dto.SubmitReviewRequest;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameReviewService {

    private static final int MIN_BODY_LENGTH = 20;
    private static final int MAX_BODY_LENGTH = 5000;

    /**
     * Reviews one account may write in a day.
     *
     * Generous for anyone actually writing about games they played, and low enough that
     * brigading a game's score with fresh text costs real effort. This is the cheap half of
     * anti-abuse; the expensive half is detecting coordinated bursts across accounts, which
     * needs traffic this app does not have yet.
     */
    private static final int MAX_REVIEWS_PER_DAY = 10;

    private final GameReviewRepository gameReviewRepository;
    private final ReviewVoteRepository reviewVoteRepository;
    private final GameRatingRepository gameRatingRepository;
    private final GameRepository gameRepository;
    private final UserGameRepository userGameRepository;
    private final PlaythroughRepository playthroughRepository;

    @Transactional
    public GameReviewDto submitReview(User user, Long gameId, SubmitReviewRequest request) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));

        if (!userGameRepository.existsByUserAndGame(user, game)) {
            throw new IllegalArgumentException("Add this game to your library before reviewing it");
        }

        String body = request.getBody() == null ? "" : request.getBody().trim();
        if (body.length() < MIN_BODY_LENGTH) {
            throw new IllegalArgumentException(
                "A review needs at least " + MIN_BODY_LENGTH + " characters");
        }
        if (body.length() > MAX_BODY_LENGTH) {
            throw new IllegalArgumentException(
                "A review can be at most " + MAX_BODY_LENGTH + " characters");
        }

        GameReview review = gameReviewRepository.findByUserAndGame(user, game).orElse(null);

        // Only new reviews count against the limit. Editing your own words is not the
        // behaviour this is trying to stop.
        if (review == null) {
            long recent = gameReviewRepository.countWrittenSince(
                user.getId(), Instant.now().minus(1, ChronoUnit.DAYS));
            if (recent >= MAX_REVIEWS_PER_DAY) {
                throw new IllegalArgumentException(
                    "You have written a lot of reviews today. Try again tomorrow.");
            }
            review = GameReview.builder().user(user).game(game).build();
        }

        review.setBody(body);
        review.setContainsSpoilers(Boolean.TRUE.equals(request.getContainsSpoilers()));
        review.setLanguage(request.getLanguage());
        review = gameReviewRepository.save(review);

        log.info("User {} reviewed game {}", user.getId(), gameId);
        return toDto(review, user, Set.of());
    }

    @Transactional
    public void deleteReview(User user, Long gameId) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        gameReviewRepository.findByUserAndGame(user, game).ifPresent(gameReviewRepository::delete);
    }

    /**
     * Reviews for a game.
     *
     * Sorting by helpfulness rather than recency by default: the most recent review is
     * whoever wrote last, which is not the same as the one worth reading first.
     */
    @Transactional(readOnly = true)
    public List<GameReviewDto> getReviews(User viewer, Long gameId, String sort, String language) {
        List<GameReview> reviews = "recent".equalsIgnoreCase(sort)
            ? gameReviewRepository.findMostRecent(gameId)
            : gameReviewRepository.findMostHelpful(gameId);

        if (language != null && !language.isBlank()) {
            reviews = reviews.stream()
                .filter(review -> language.equalsIgnoreCase(review.getLanguage()))
                .collect(Collectors.toList());
        }

        if (reviews.isEmpty()) {
            return List.of();
        }

        Set<Long> votedIds = reviewVoteRepository.findVotedReviewIds(
            viewer.getId(), reviews.stream().map(GameReview::getId).collect(Collectors.toList()));

        return reviews.stream()
            .map(review -> toDto(review, viewer, votedIds))
            .collect(Collectors.toList());
    }

    /**
     * Marks a review helpful, or withdraws that mark.
     *
     * The stored count is recomputed from the vote rows rather than incremented, for the
     * same reason the rating aggregates are: a counter that drifts cannot be repaired
     * without a rebuild.
     */
    @Transactional
    public GameReviewDto toggleHelpful(User user, Long reviewId) {
        GameReview review = gameReviewRepository.findById(reviewId)
            .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        // Voting for your own review is self-promotion, not a signal.
        if (review.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You cannot mark your own review helpful");
        }

        GameReview target = review;
        reviewVoteRepository.findByReviewAndUser(review, user)
            .ifPresentOrElse(
                reviewVoteRepository::delete,
                () -> reviewVoteRepository.save(
                    ReviewVote.builder().review(target).user(user).build()));
        reviewVoteRepository.flush();

        review.setHelpfulCount((int) reviewVoteRepository.countByReview(review));
        review = gameReviewRepository.save(review);

        Set<Long> voted = reviewVoteRepository.findVotedReviewIds(user.getId(), List.of(reviewId));
        return toDto(review, user, voted);
    }

    private GameReviewDto toDto(GameReview review, User viewer, Set<Long> votedReviewIds) {
        User author = review.getUser();

        Integer authorScore = gameRatingRepository.findByUserAndGame(author, review.getGame())
            .map(GameRating::getScore)
            .orElse(null);

        // The hours behind an opinion are the thing this app can show that a review site
        // cannot, so they travel with the review rather than being a separate lookup.
        long authorPlaytimeSeconds = playthroughRepository
            .findByUserIdAndGameIdOrderByCreatedAtDesc(author.getId(), review.getGame().getId())
            .stream()
            .mapToLong(Playthrough::effectivePlaytimeSeconds)
            .sum();

        boolean authorFinished = playthroughRepository
            .findByUserIdAndGameIdOrderByCreatedAtDesc(author.getId(), review.getGame().getId())
            .stream()
            .anyMatch(p -> Boolean.TRUE.equals(p.getIsCompleted()));

        return GameReviewDto.builder()
            .id(review.getId())
            .authorHandle(author.getHandle())
            .authorDisplayName(author.getDisplayName() != null
                ? author.getDisplayName() : author.getUsername())
            .authorPictureUrl(author.getProfilePictureUrl())
            .authorScore(authorScore)
            .authorPlaytimeSeconds(authorPlaytimeSeconds)
            .authorFinished(authorFinished)
            .body(review.getBody())
            .containsSpoilers(Boolean.TRUE.equals(review.getContainsSpoilers()))
            .language(review.getLanguage())
            .helpfulCount(review.getHelpfulCount())
            .viewerFoundHelpful(votedReviewIds.contains(review.getId()))
            .isOwnReview(author.getId().equals(viewer.getId()))
            .createdAt(review.getCreatedAt())
            .build();
    }
}
