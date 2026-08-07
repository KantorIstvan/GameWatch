package com.gamewatch.service;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameRating;
import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.entity.WishlistEntry;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.GameRatingRepository;
import com.gamewatch.repository.GameReviewRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.WishlistEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityFeedService {

    private static final int DEFAULT_LIMIT = 50;

    private final FollowRepository followRepository;
    private final PlaythroughRepository playthroughRepository;
    private final GameReviewRepository gameReviewRepository;
    private final GameRatingRepository gameRatingRepository;
    private final WishlistEntryRepository wishlistEntryRepository;
    private final FollowService followService;

    /**
     * Who the feed should cover: everyone the viewer follows, or just the viewer.
     */
    public enum FeedScope {
        FOLLOWING,
        SELF
    }

    /**
     * What the people this viewer follows have been doing - or, in {@link FeedScope#SELF}
     * mode, what the viewer themself has been doing.
     *
     * Events are derived from playthrough, review, rating and wishlist state rather than
     * written to a feed table. A stored feed would need updating on every timer action and
     * then reconciling with edits, deletions and visibility changes; deriving means a
     * playthrough that is deleted, a review that is retracted, or a library that is made
     * private simply stops appearing, with nothing to clean up.
     *
     * {@code before}, when given, only returns events strictly older than that instant - the
     * cursor a caller pages with, using the {@code occurredAt} of the oldest event it already
     * has. An offset would not do here: events are merged from several sources and re-sorted
     * on every call rather than read off one indexed table, so an offset could double up or
     * skip rows the moment two sources interleave differently between two requests.
     *
     * {@code actorHandles}, when given, narrows a {@link FeedScope#FOLLOWING} feed to just
     * those followed people. Applied here rather than by the caller after the fact, because
     * the caller also paginates - filtering a page that was already cut down to {@code limit}
     * would silently drop events instead of narrowing the whole feed.
     */
    @Transactional(readOnly = true)
    public List<ActivityEventDto> getFeed(User viewer, Integer limit, FeedScope scope,
                                          Instant before, List<String> actorHandles) {
        List<User> actors = resolveActors(viewer, scope != null ? scope : FeedScope.FOLLOWING, actorHandles);

        if (actors.isEmpty()) {
            return List.of();
        }

        List<ActivityEventDto> events = new ArrayList<>();
        for (User actor : actors) {
            // Your own activity is always yours to see, whatever your own visibility
            // settings say - those settings exist to gate what other people see, not to
            // hide your own history from yourself. Checked explicitly rather than leaned on
            // via FollowService.canView's own "viewer is the owner" rule, so this holds
            // regardless of scope and does not depend on canView being called at all.
            boolean isViewer = viewer != null && viewer.getId().equals(actor.getId());

            // Someone can restrict their library or wishlist after you started following
            // them, so both checks happen on read rather than being trusted from the follow.
            // The two are independent settings (library vs. wishlist visibility), so an actor
            // can contribute one kind of event without the other.
            if (isViewer || followService.canView(viewer, actor, actor.getLibraryVisibility())) {
                for (Playthrough playthrough : playthroughRepository
                        .findByUserIdOrderByCreatedAtDesc(actor.getId())) {
                    events.addAll(eventsFor(actor, playthrough));
                }
                for (GameReview review : gameReviewRepository
                        .findByUserIdWithGameOrderByCreatedAtDesc(actor.getId())) {
                    events.add(reviewEvent(actor, review));
                }
                for (GameRating rating : gameRatingRepository
                        .findByUserIdWithGameOrderByCreatedAtDesc(actor.getId())) {
                    events.add(ratingEvent(actor, rating));
                }
            }

            if (isViewer || followService.canView(viewer, actor, actor.getWishlistVisibility())) {
                for (WishlistEntry entry : wishlistEntryRepository
                        .findByUserWithGameOrderByAddedAtDesc(actor)) {
                    events.add(wishlistEvent(actor, entry));
                }
            }
        }

        return events.stream()
            .filter(event -> before == null || event.getOccurredAt().isBefore(before))
            .sorted(Comparator.comparing(ActivityEventDto::getOccurredAt).reversed())
            .limit(limit != null && limit > 0 ? limit : DEFAULT_LIMIT)
            .collect(Collectors.toList());
    }

    /**
     * Everyone this scope's events might come from - not yet filtered by what any of them
     * shares. Visibility is checked per event type in {@link #getFeed}, since library and
     * wishlist visibility are independent settings and an actor can be visible for one and
     * not the other.
     */
    private List<User> resolveActors(User viewer, FeedScope scope, List<String> actorHandles) {
        if (scope == FeedScope.SELF) {
            return List.of(viewer);
        }

        List<User> following = followRepository.findAcceptedFollowing(viewer.getId()).stream()
            .map(Follow::getFollowee)
            .collect(Collectors.toList());

        if (actorHandles == null || actorHandles.isEmpty()) {
            return following;
        }

        Set<String> requestedHandles = actorHandles.stream()
            .filter(Objects::nonNull)
            .map(handle -> handle.trim().toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());

        return following.stream()
            .filter(followee -> followee.getHandle() != null
                && requestedHandles.contains(followee.getHandle().toLowerCase(Locale.ROOT)))
            .collect(Collectors.toList());
    }

    /**
     * The milestones a single playthrough contributes.
     *
     * A playthrough can produce more than one - picked up in March and finished in May is
     * two things that happened, and collapsing them to the latest would lose the middle of
     * the story.
     */
    private List<ActivityEventDto> eventsFor(User actor, Playthrough playthrough) {
        List<ActivityEventDto> events = new ArrayList<>();

        if (Boolean.TRUE.equals(playthrough.getIsCompleted()) && playthrough.getStoppedAt() != null) {
            events.add(playthroughEvent(actor, playthrough, "FINISHED", playthrough.getStoppedAt()));
        }
        if (Boolean.TRUE.equals(playthrough.getIsDropped()) && playthrough.getDroppedAt() != null) {
            events.add(playthroughEvent(actor, playthrough, "DROPPED", playthrough.getDroppedAt()));
        }
        if (playthrough.getPickedUpAt() != null) {
            events.add(playthroughEvent(actor, playthrough, "PICKED_UP", playthrough.getPickedUpAt()));
        }
        // Starting is only interesting while it is still the latest thing to have happened;
        // otherwise every finished game would also announce that it once began.
        if (events.isEmpty() && playthrough.effectivePlaytimeSeconds() > 0
            && playthrough.getCreatedAt() != null) {
            events.add(playthroughEvent(actor, playthrough, "STARTED", playthrough.getCreatedAt()));
        }

        return events;
    }

    private ActivityEventDto.ActivityEventDtoBuilder baseEvent(User actor, String type, Instant when) {
        return ActivityEventDto.builder()
            .actorHandle(actor.getHandle())
            .actorDisplayName(actor.getDisplayName() != null
                ? actor.getDisplayName() : actor.getUsername())
            .actorPictureUrl(actor.getProfilePictureUrl())
            .type(type)
            .occurredAt(when);
    }

    private ActivityEventDto playthroughEvent(User actor, Playthrough playthrough, String type, Instant when) {
        Game game = playthrough.getGame();
        return baseEvent(actor, type, when)
            .id(type + "-" + playthrough.getId())
            .gameId(game.getId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .playtimeSeconds(playthrough.effectivePlaytimeSeconds())
            .build();
    }

    private ActivityEventDto reviewEvent(User actor, GameReview review) {
        Game game = review.getGame();
        return baseEvent(actor, "REVIEWED", review.getCreatedAt())
            .id("REVIEWED-" + review.getId())
            .gameId(game.getId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .build();
    }

    private ActivityEventDto ratingEvent(User actor, GameRating rating) {
        Game game = rating.getGame();
        return baseEvent(actor, "RATED", rating.getCreatedAt())
            .id("RATED-" + rating.getId())
            .gameId(game.getId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .score(rating.getScore())
            .build();
    }

    private ActivityEventDto wishlistEvent(User actor, WishlistEntry entry) {
        Game game = entry.getGame();
        return baseEvent(actor, "WISHLISTED", entry.getAddedAt())
            .id("WISHLISTED-" + entry.getId())
            .gameId(game.getId())
            .gameName(game.getName())
            .bannerImageUrl(game.getBannerImageUrl())
            .build();
    }
}
