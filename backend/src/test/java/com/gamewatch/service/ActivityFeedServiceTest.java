package com.gamewatch.service;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.*;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.PlaythroughRepository;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityFeedServiceTest {

    @Mock private FollowRepository followRepository;
    @Mock private PlaythroughRepository playthroughRepository;
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

        assertThat(activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.FOLLOWING)).isEmpty();
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
    }

    @Test
    void aLibraryHiddenAfterYouFollowedStopsAppearing() {
        // Visibility is checked when the feed is read, not trusted from the follow, so
        // restricting a library takes effect immediately rather than for new followers only.
        actor.setLibraryVisibility(Visibility.PRIVATE);
        when(followRepository.findAcceptedFollowing(1L)).thenReturn(List.of(following(actor)));
        when(followService.canView(viewer, actor, Visibility.PRIVATE)).thenReturn(false);

        assertThat(activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.FOLLOWING)).isEmpty();
        verify(playthroughRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
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

        List<ActivityEventDto> feed = activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.FOLLOWING);

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

        assertThat(activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.FOLLOWING))
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

        List<ActivityEventDto> feed =
            activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.SELF);

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

        assertThat(activityFeedService.getFeed(viewer, null, ActivityFeedService.FeedScope.FOLLOWING)).isEmpty();
    }
}
