package com.gamewatch.service;

import com.gamewatch.dto.GameReviewDto;
import com.gamewatch.dto.ReviewReplyDto;
import com.gamewatch.dto.SubmitReplyRequest;
import com.gamewatch.dto.SubmitReviewRequest;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Map;
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

    private static final int MIN_REPLY_LENGTH = 1;
    private static final int MAX_REPLY_LENGTH = 1000;

    /**
     * Replies one account may write in a day.
     *
     * Higher than the review limit because replying is the cheap, conversational half of
     * this - someone answering questions under their own review should never hit it - and
     * still low enough that an account cannot paper a game's review section overnight.
     */
    private static final int MAX_REPLIES_PER_DAY = 100;

    private final GameReviewRepository gameReviewRepository;
    private final ReviewVoteRepository reviewVoteRepository;
    private final ReviewReplyRepository reviewReplyRepository;
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
        return toDto(review, user, Set.of(), repliesFor(review.getId()));
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

        List<Long> reviewIds = reviews.stream().map(GameReview::getId).collect(Collectors.toList());
        Set<Long> votedIds = reviewVoteRepository.findVotedReviewIds(viewer.getId(), reviewIds);
        Map<Long, List<ReviewReply>> replies = repliesFor(reviewIds);

        return reviews.stream()
            .map(review -> toDto(review, viewer, votedIds, replies))
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
        return toDto(review, user, voted, repliesFor(reviewId));
    }

    /**
     * Answers a review.
     *
     * Open to anyone who can see the review rather than restricted to people who own the
     * game: the value of a reply is usually a question about an opinion, and the people with
     * questions are the ones who have not bought it yet.
     */
    @Transactional
    public GameReviewDto addReply(User user, Long reviewId, SubmitReplyRequest request) {
        GameReview review = gameReviewRepository.findById(reviewId)
            .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        String body = request.getBody() == null ? "" : request.getBody().trim();
        if (body.length() < MIN_REPLY_LENGTH) {
            throw new IllegalArgumentException("A reply cannot be empty");
        }
        if (body.length() > MAX_REPLY_LENGTH) {
            throw new IllegalArgumentException(
                "A reply can be at most " + MAX_REPLY_LENGTH + " characters");
        }

        long recent = reviewReplyRepository.countWrittenSince(
            user.getId(), Instant.now().minus(1, ChronoUnit.DAYS));
        if (recent >= MAX_REPLIES_PER_DAY) {
            throw new IllegalArgumentException(
                "You have written a lot of replies today. Try again tomorrow.");
        }

        reviewReplyRepository.save(ReviewReply.builder()
            .review(review)
            .user(user)
            .body(body)
            .build());

        log.info("User {} replied to review {}", user.getId(), reviewId);
        return reloadReview(review, user);
    }

    /**
     * Removes a reply, on behalf of whoever wrote it.
     *
     * The author and nobody else - not even the author of the review it sits under. Words
     * belong to the person who wrote them, and letting a review author quietly delete
     * disagreement from under their own review would turn every thread into whatever the
     * reviewer is willing to leave standing.
     */
    @Transactional
    public GameReviewDto deleteReply(User user, Long replyId) {
        ReviewReply reply = reviewReplyRepository.findById(replyId)
            .orElseThrow(() -> new IllegalArgumentException("Reply not found"));

        GameReview review = reply.getReview();
        if (!canDeleteReply(reply, user)) {
            // Says the same thing it would say for a reply that does not exist, so this is
            // not a way to confirm which replies are out there.
            throw new IllegalArgumentException("Reply not found");
        }

        reviewReplyRepository.delete(reply);
        log.info("User {} deleted reply {}", user.getId(), replyId);
        return reloadReview(review, user);
    }

    private boolean canDeleteReply(ReviewReply reply, User viewer) {
        return reply.getUser().getId().equals(viewer.getId());
    }

    /** The parent review as the caller should now see it, so a reply edit needs no refetch. */
    private GameReviewDto reloadReview(GameReview review, User viewer) {
        reviewReplyRepository.flush();
        Set<Long> voted = reviewVoteRepository.findVotedReviewIds(
            viewer.getId(), List.of(review.getId()));
        return toDto(review, viewer, voted, repliesFor(review.getId()));
    }

    private Map<Long, List<ReviewReply>> repliesFor(Long reviewId) {
        return repliesFor(List.of(reviewId));
    }

    private Map<Long, List<ReviewReply>> repliesFor(Collection<Long> reviewIds) {
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        return reviewReplyRepository.findForReviews(reviewIds).stream()
            .collect(Collectors.groupingBy(reply -> reply.getReview().getId()));
    }

    private GameReviewDto toDto(GameReview review, User viewer, Set<Long> votedReviewIds,
                                Map<Long, List<ReviewReply>> repliesByReview) {
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
            .ownReview(author.getId().equals(viewer.getId()))
            .createdAt(review.getCreatedAt())
            .replies(repliesByReview.getOrDefault(review.getId(), List.of()).stream()
                .map(reply -> toReplyDto(reply, viewer))
                .collect(Collectors.toList()))
            .build();
    }

    private ReviewReplyDto toReplyDto(ReviewReply reply, User viewer) {
        User author = reply.getUser();
        return ReviewReplyDto.builder()
            .id(reply.getId())
            .authorHandle(author.getHandle())
            .authorDisplayName(author.getDisplayName() != null
                ? author.getDisplayName() : author.getUsername())
            .authorPictureUrl(author.getProfilePictureUrl())
            .body(reply.getBody())
            .viewerCanDelete(canDeleteReply(reply, viewer))
            .createdAt(reply.getCreatedAt())
            .build();
    }
}
