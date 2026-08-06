package com.gamewatch.service;

import com.gamewatch.dto.NotificationDto;
import com.gamewatch.dto.NotificationFeedDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.Notification;
import com.gamewatch.entity.Notification.NotificationType;
import com.gamewatch.entity.User;
import com.gamewatch.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

/**
 * Everything that lands in the bell.
 *
 * One service rather than each feature writing its own rows, so the two rules that make a
 * notification list bearable - never tell someone about their own action, never stack the
 * same unread event twice - are enforced in one place instead of being remembered in five.
 * Callers state what happened; what actually reaches the recipient is decided here.
 *
 * The writes join the caller's transaction rather than opening their own. A notification is
 * a claim that something happened, so it should not survive an action that rolled back, and
 * an action should not be reported as done while the record of it was lost.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    /**
     * How many notifications one read returns.
     *
     * The bell is a list of what happened lately, not an archive. Anyone scrolling past
     * thirty entries is looking for something a notification list is the wrong tool for.
     */
    private static final int DEFAULT_LIMIT = 30;
    private static final int MAX_LIMIT = 100;

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public NotificationFeedDto getFeed(User user, Integer limit) {
        int capped = limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);

        List<NotificationDto> notifications = notificationRepository
            .findForRecipient(user.getId(), PageRequest.of(0, capped)).stream()
            .map(this::toDto)
            .collect(Collectors.toList());

        return NotificationFeedDto.builder()
            .notifications(notifications)
            // Counted rather than taken from the list above, which is capped: an account with
            // forty unread should say forty, not thirty.
            .unreadCount(notificationRepository.countUnread(user.getId()))
            .build();
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllRead(user.getId(), Instant.now());
    }

    /**
     * Marks one notification read.
     *
     * Scoped to the recipient in the statement itself rather than loaded and then checked, so
     * an id belonging to someone else updates nothing and gives away nothing about whether it
     * exists.
     */
    @Transactional
    public void markRead(User user, Long notificationId) {
        notificationRepository.markRead(notificationId, user.getId(), Instant.now());
    }

    @Transactional
    public void clear(User user) {
        notificationRepository.deleteAllForRecipient(user.getId());
    }

    /** Someone asked to follow a followers-only profile and is waiting on an answer. */
    @Transactional
    public void notifyFollowRequest(User actor, User recipient, Follow follow) {
        record(NotificationType.FOLLOW_REQUEST, actor, recipient, b -> b.follow(follow));
    }

    /** A follow request the recipient sent has been accepted. */
    @Transactional
    public void notifyFollowAccepted(User actor, User recipient, Follow follow) {
        record(NotificationType.FOLLOW_ACCEPTED, actor, recipient, b -> b.follow(follow));
    }

    /** Someone followed a public profile, which needed nobody's permission. */
    @Transactional
    public void notifyNewFollower(User actor, User recipient, Follow follow) {
        record(NotificationType.NEW_FOLLOWER, actor, recipient, b -> b.follow(follow));
    }

    /**
     * Someone answered the recipient's review.
     *
     * The one kind that is never collapsed: two replies are two things said, and hiding the
     * second would mean a conversation the review's author never learns is happening.
     */
    @Transactional
    public void notifyReviewReply(User actor, GameReview review) {
        if (isSelf(actor, review.getUser())) {
            return;
        }
        save(NotificationType.REVIEW_REPLY, actor, review.getUser(),
            b -> b.review(review).game(review.getGame()));
    }

    /**
     * Someone marked the recipient's review helpful.
     *
     * Suppressed while an unread one from the same person about the same review is already
     * waiting: "helpful" is a toggle, and flipping it off and on does not make it news again.
     */
    @Transactional
    public void notifyReviewHelpful(User actor, GameReview review) {
        User recipient = review.getUser();
        if (isSelf(actor, recipient)) {
            return;
        }
        if (notificationRepository.hasUnreadAboutReview(
                recipient.getId(), actor.getId(), NotificationType.REVIEW_HELPFUL, review.getId())) {
            return;
        }
        save(NotificationType.REVIEW_HELPFUL, actor, recipient,
            b -> b.review(review).game(review.getGame()));
    }

    /**
     * Records an event, unless it is the recipient's own or already sitting there unread.
     *
     * The collapse is per actor and kind: someone who unfollows and follows again has done
     * one thing worth reporting, and a bell that insists on two stops being worth opening.
     */
    private void record(NotificationType type, User actor, User recipient,
                        UnaryOperator<Notification.NotificationBuilder> context) {
        // Being told about your own action is noise - you were there when it happened.
        if (isSelf(actor, recipient)) {
            return;
        }
        if (notificationRepository.hasUnreadFrom(recipient.getId(), actor.getId(), type)) {
            return;
        }
        save(type, actor, recipient, context);
    }

    private void save(NotificationType type, User actor, User recipient,
                      UnaryOperator<Notification.NotificationBuilder> context) {
        Notification.NotificationBuilder builder = Notification.builder()
            .recipient(recipient)
            .actor(actor)
            .type(type);

        notificationRepository.save(context.apply(builder).build());
        log.debug("Recorded {} for user {}", type, recipient.getId());
    }

    private boolean isSelf(User actor, User recipient) {
        return actor == null || recipient == null || actor.getId().equals(recipient.getId());
    }

    private NotificationDto toDto(Notification notification) {
        User actor = notification.getActor();
        Game game = notification.getGame();

        return NotificationDto.builder()
            .id(notification.getId())
            .type(notification.getType())
            .actorHandle(actor == null ? null : actor.getHandle())
            .actorDisplayName(actor == null ? null
                : actor.getDisplayName() != null ? actor.getDisplayName() : actor.getUsername())
            .actorPictureUrl(actor == null ? null : actor.getProfilePictureUrl())
            .gameId(game == null ? null : game.getId())
            .gameExternalId(game == null ? null : game.getExternalId())
            .gameName(game == null ? null : game.getName())
            .reviewId(notification.getReview() == null ? null : notification.getReview().getId())
            .read(notification.getReadAt() != null)
            .createdAt(notification.getCreatedAt())
            .build();
    }
}
