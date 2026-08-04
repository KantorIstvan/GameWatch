package com.gamewatch.service;

import com.gamewatch.dto.NotificationFeedDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.Notification;
import com.gamewatch.entity.Notification.NotificationType;
import com.gamewatch.entity.User;
import com.gamewatch.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;

    @InjectMocks private NotificationService notificationService;

    private User actor;
    private User recipient;
    private Game game;

    @BeforeEach
    void setUp() {
        actor = User.builder().id(1L).auth0UserId("auth0|1").handle("actor")
            .displayName("The Actor").build();
        recipient = User.builder().id(2L).auth0UserId("auth0|2").handle("recipient").build();
        game = Game.builder().id(3L).name("Test Game").externalId(4242).build();
    }

    private GameReview reviewBy(User author) {
        return GameReview.builder().id(5L).user(author).game(game)
            .body("Long enough to be a real review.").helpfulCount(0).build();
    }

    @Test
    void nobodyIsNotifiedAboutTheirOwnAction() {
        // You were there when it happened. A bell that reports your own clicks back to you is
        // a bell people stop opening.
        notificationService.notifyReviewReply(actor, reviewBy(actor));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void aFollowRequestReachesTheOwner() {
        Follow follow = Follow.builder().id(9L).follower(actor).followee(recipient).build();

        notificationService.notifyFollowRequest(actor, recipient, follow);

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(saved.capture());
        assertThat(saved.getValue().getType()).isEqualTo(NotificationType.FOLLOW_REQUEST);
        assertThat(saved.getValue().getRecipient()).isEqualTo(recipient);
        assertThat(saved.getValue().getActor()).isEqualTo(actor);
        assertThat(saved.getValue().getFollow()).isEqualTo(follow);
    }

    @Test
    void aFollowEventIsNotStackedWhileAnIdenticalOneIsStillUnread() {
        // Unfollowing and following again is one thing worth reporting, not two.
        Follow follow = Follow.builder().id(9L).follower(actor).followee(recipient).build();
        when(notificationRepository.hasUnreadFrom(2L, 1L, NotificationType.NEW_FOLLOWER))
            .thenReturn(true);

        notificationService.notifyNewFollower(actor, recipient, follow);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void togglingHelpfulTwiceDoesNotAnnounceItTwice() {
        GameReview review = reviewBy(recipient);
        when(notificationRepository.hasUnreadAboutReview(
            2L, 1L, NotificationType.REVIEW_HELPFUL, 5L)).thenReturn(true);

        notificationService.notifyReviewHelpful(actor, review);

        verify(notificationRepository, never()).save(any());
    }

    @Test
    void aSecondReplyIsAlwaysReported() {
        // Unlike the collapsible kinds: two replies are two things said, and hiding the second
        // would mean a conversation the review's author never learns is happening.
        GameReview review = reviewBy(recipient);

        notificationService.notifyReviewReply(actor, review);
        notificationService.notifyReviewReply(actor, review);

        verify(notificationRepository, times(2)).save(any());
        verify(notificationRepository, never()).hasUnreadFrom(anyLong(), anyLong(), any());
    }

    @Test
    void theFeedCarriesTheActorTheGameAndTheUnreadCount() {
        Notification notification = Notification.builder()
            .id(11L)
            .recipient(recipient)
            .actor(actor)
            .type(NotificationType.REVIEW_REPLY)
            .game(game)
            .review(reviewBy(recipient))
            .createdAt(Instant.now())
            .build();

        when(notificationRepository.findForRecipient(eq(2L), any()))
            .thenReturn(List.of(notification));
        // Counted rather than derived from the capped list, which is why it can exceed it.
        when(notificationRepository.countUnread(2L)).thenReturn(37L);

        NotificationFeedDto feed = notificationService.getFeed(recipient, null);

        assertThat(feed.getUnreadCount()).isEqualTo(37L);
        assertThat(feed.getNotifications()).hasSize(1);
        assertThat(feed.getNotifications().get(0).getActorDisplayName()).isEqualTo("The Actor");
        assertThat(feed.getNotifications().get(0).getGameName()).isEqualTo("Test Game");
        // The catalog is addressed by IGDB id, so a link needs the external one.
        assertThat(feed.getNotifications().get(0).getGameExternalId()).isEqualTo(4242);
        assertThat(feed.getNotifications().get(0).isRead()).isFalse();
    }

    @Test
    void markingOneReadIsScopedToTheOwnerInTheStatement() {
        // Not loaded and then checked: an id belonging to someone else has to update nothing
        // and give away nothing about whether it exists.
        notificationService.markRead(recipient, 11L);

        verify(notificationRepository).markRead(eq(11L), eq(2L), any(Instant.class));
    }
}
