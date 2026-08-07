package com.gamewatch.service;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.*;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.GameRatingRepository;
import com.gamewatch.repository.GameReviewRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.WishlistEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityFeedServiceTest {

    @Mock private FollowRepository followRepository;
    @Mock private PlaythroughRepository playthroughRepository;
    @Mock private GameReviewRepository gameReviewRepository;
    @Mock private GameRatingRepository gameRatingRepository;
    @Mock private WishlistEntryRepository wishlistEntryRepository;
    @Mock private FollowService followService;

    @InjectMocks private ActivityFeedService activityFeedService;

    private User viewer;
    private User actor;
    private Game game;

    @BeforeEach
    void setUp() {
        viewer = User.builder().id(1L).auth0UserId("auth0|1").handle("viewer")
            .libraryVisibility(Visibility.PUBLIC).profileVisibility(Visibility.PUBLIC).build();
        actor = User.builder().id(2L).auth0UserId("auth0|2").handle("actor").displayName("Actor")
            .libraryVisibility(Visibility.PUBLIC).profileVisibility(Visibility.PUBLIC).build();
        game = Game.builder().id(1L).name("Test Game").build();
    }

    private Follow following(User followee) {
        return Follow.builder().id(1L).follower(viewer).followee(followee)
            .status(Follow.FollowStatus.ACCEPTED).build();
    }

    @Test
    void anEmptyFollowingListProducesNoFeedAndNoQueries() {
        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of());

        assertThat(activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null)).isEmpty();
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
    }

    @Test
    void aLibraryHiddenAfterYouFollowedStopsAppearing() {
        // Visibility is checked when the feed is read, not trusted from the follow, so
        // restricting a library takes effect immediately rather than for new followers only.
        // Wishlist visibility defaults to PRIVATE too, so this same stub covers both checks.
        actor.setLibraryVisibility(Visibility.PRIVATE);
        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PRIVATE)).thenReturn(false);

        assertThat(activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null)).isEmpty();
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
        verify(wishlistEntryRepository, never()).findByUserWithGameOrderByAddedAtDesc(any());
    }

    @Test
    void aPlaythroughPickedUpAndThenFinishedReportsBothMilestones() {
        // Collapsing to the latest state would lose the middle of the story.
        Playthrough playthrough = Playthrough.builder()
            .id(10L).user(actor).game(game).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .pickedUpAt(Instant.parse("2026-03-01T00:00:00Z"))
            .stoppedAt(Instant.parse("2026-05-01T00:00:00Z"))
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(playthrough));

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null);

        assertThat(feed).extracting(ActivityEventDto::getType)
            .containsExactly("FINISHED", "PICKED_UP");
        // Newest first.
        assertThat(feed.get(0).getOccurredAt()).isAfter(feed.get(1).getOccurredAt());
    }

    @Test
    void aFinishedGameDoesNotAlsoAnnounceThatItOnceBegan() {
        Playthrough finished = Playthrough.builder()
            .id(10L).user(actor).game(game).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .stoppedAt(Instant.parse("2026-05-01T00:00:00Z"))
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(finished));

        assertThat(activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null))
            .extracting(ActivityEventDto::getType)
            .containsExactly("FINISHED");
    }

    @Test
    void selfScopeReturnsTheViewersOwnActivityWithoutConsultingFollows() {
        Playthrough playthrough = Playthrough.builder()
            .id(12L).user(viewer).game(game).playthroughType("story")
            .durationSeconds(36_000L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .stoppedAt(Instant.parse("2026-05-01T00:00:00Z"))
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.SELF, null, null);

        assertThat(feed).extracting(ActivityEventDto::getType).containsExactly("FINISHED");
        verify(followRepository, never()).findAcceptedFollowing(any());
    }

    @Test
    void anUntouchedPlaythroughIsNotAnEvent() {
        // Creating a playthrough and never starting it is not news.
        Playthrough untouched = Playthrough.builder()
            .id(11L).user(actor).game(game).playthroughType("story")
            .durationSeconds(0L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false)
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(untouched));

        assertThat(activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null)).isEmpty();
    }

    @Test
    void reviewsRatingsAndWishlistEntriesAppearAlongsidePlaythroughMilestones() {
        actor.setWishlistVisibility(Visibility.PUBLIC);
        GameReview review = GameReview.builder()
            .id(20L).user(actor).game(game)
            .createdAt(Instant.parse("2026-02-01T00:00:00Z")).build();
        GameRating rating = GameRating.builder()
            .id(21L).user(actor).game(game).score(8)
            .createdAt(Instant.parse("2026-02-05T00:00:00Z")).build();
        WishlistEntry wishlisted = WishlistEntry.builder()
            .id(22L).user(actor).game(game)
            .addedAt(Instant.parse("2026-02-10T00:00:00Z")).build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
        when(gameReviewRepository.findByUserIdWithGameOrderByCreatedAtDesc(2L)).thenReturn(List.of(review));
        when(gameRatingRepository.findByUserIdWithGameOrderByCreatedAtDesc(2L)).thenReturn(List.of(rating));
        when(wishlistEntryRepository.findByUserWithGameOrderByAddedAtDesc(actor)).thenReturn(List.of(wishlisted));

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null);

        // Newest first: wishlisted (02-10), then rated (02-05), then reviewed (02-01).
        assertThat(feed).extracting(ActivityEventDto::getType)
            .containsExactly("WISHLISTED", "RATED", "REVIEWED");
        assertThat(feed.get(1).getScore()).isEqualTo(8);
    }

    @Test
    void wishlistVisibilityIsGatedSeparatelyFromLibraryVisibility() {
        // Library shared, wishlist kept private - a WISHLISTED event must not ride along on
        // the library check, and the wishlist should not even be queried.
        actor.setWishlistVisibility(Visibility.PRIVATE);

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(followService.canView(viewer, actor, Visibility.PRIVATE)).thenReturn(false);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null);

        assertThat(feed).isEmpty();
        verify(wishlistEntryRepository, never()).findByUserWithGameOrderByAddedAtDesc(any());
    }

    @Test
    void aPrivateLibraryDoesNotHideASeparatelySharedWishlist() {
        // The opposite direction: library kept private, wishlist shared - the WISHLISTED
        // event still has to come through, and the library-gated sources should not be
        // queried at all for this actor.
        actor.setLibraryVisibility(Visibility.PRIVATE);
        actor.setWishlistVisibility(Visibility.PUBLIC);
        WishlistEntry wishlisted = WishlistEntry.builder()
            .id(23L).user(actor).game(game)
            .addedAt(Instant.parse("2026-02-10T00:00:00Z")).build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PRIVATE)).thenReturn(false);
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(wishlistEntryRepository.findByUserWithGameOrderByAddedAtDesc(actor)).thenReturn(List.of(wishlisted));

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, null);

        assertThat(feed).extracting(ActivityEventDto::getType).containsExactly("WISHLISTED");
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
        verify(gameReviewRepository, never()).findByUserIdWithGameOrderByCreatedAtDesc(any());
        verify(gameRatingRepository, never()).findByUserIdWithGameOrderByCreatedAtDesc(any());
    }

    @Test
    void selfScopeShowsWishlistEntriesRegardlessOfTheViewersOwnVisibilitySettings() {
        // My Activity has to show everything the viewer did, not just what their own
        // visibility settings would let someone else see.
        viewer.setLibraryVisibility(Visibility.PRIVATE);
        viewer.setWishlistVisibility(Visibility.PRIVATE);
        WishlistEntry wishlisted = WishlistEntry.builder()
            .id(24L).user(viewer).game(game)
            .addedAt(Instant.parse("2026-02-10T00:00:00Z")).build();

        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(gameReviewRepository.findByUserIdWithGameOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(gameRatingRepository.findByUserIdWithGameOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(wishlistEntryRepository.findByUserWithGameOrderByAddedAtDesc(viewer)).thenReturn(List.of(wishlisted));

        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.SELF, null, null);

        assertThat(feed).extracting(ActivityEventDto::getType).containsExactly("WISHLISTED");
        // Own data never has to be checked against FollowService at all.
        verifyNoInteractions(followService);
    }

    @Test
    void beforeCursorReturnsOnlyStrictlyOlderEvents() {
        Playthrough older = Playthrough.builder()
            .id(30L).user(actor).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .stoppedAt(Instant.parse("2026-01-01T00:00:00Z"))
            .createdAt(Instant.parse("2025-12-01T00:00:00Z"))
            .build();
        Playthrough newer = Playthrough.builder()
            .id(31L).user(actor).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .stoppedAt(Instant.parse("2026-03-01T00:00:00Z"))
            .createdAt(Instant.parse("2026-02-01T00:00:00Z"))
            .build();

        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(older, newer));

        // Paging with the newer event's own occurredAt as the cursor - it should not be
        // included in the next page, only what is strictly before it.
        List<ActivityEventDto> nextPage = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING,
            Instant.parse("2026-03-01T00:00:00Z"), null);

        assertThat(nextPage).extracting(ActivityEventDto::getId).containsExactly("FINISHED-30");
    }

    @Test
    void actorHandlesNarrowsTheFollowingFeedToTheGivenPeople() {
        User otherActor = User.builder().id(3L).auth0UserId("auth0|3").handle("other")
            .libraryVisibility(Visibility.PUBLIC).profileVisibility(Visibility.PUBLIC).build();
        Playthrough playthrough = Playthrough.builder()
            .id(40L).user(otherActor).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .stoppedAt(Instant.parse("2026-01-01T00:00:00Z"))
            .createdAt(Instant.parse("2025-12-01T00:00:00Z"))
            .build();

        when(followRepository.findAcceptedFollowing(1L))
            .thenReturn(List.of(following(actor), following(otherActor)));
        when(followService.canView(viewer, otherActor, Visibility.PUBLIC)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(3L)).thenReturn(List.of(playthrough));

        // Requested by handle, case-insensitively - "OTHER" matches otherActor's "other" and
        // excludes actor (handle "actor") from the feed entirely, not just from the response.
        List<ActivityEventDto> feed = activityFeedService.getFeed(
            viewer, null, ActivityFeedService.FeedScope.FOLLOWING, null, List.of("OTHER"));

        assertThat(feed).extracting(ActivityEventDto::getId).containsExactly("FINISHED-40");
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(2L);
    }
}
