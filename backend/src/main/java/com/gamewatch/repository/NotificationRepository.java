package com.gamewatch.repository;

import com.gamewatch.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * One person's notifications, newest first.
     *
     * The actor and the context rows are fetched with them: every notification renders a
     * name, an avatar and usually a game title, so loading them lazily would turn one query
     * into three per row.
     */
    @Query("SELECT n FROM Notification n "
        + "LEFT JOIN FETCH n.actor "
        + "LEFT JOIN FETCH n.game "
        + "LEFT JOIN FETCH n.review "
        + "LEFT JOIN FETCH n.follow "
        + "WHERE n.recipient.id = :userId "
        + "ORDER BY n.createdAt DESC")
    List<Notification> findForRecipient(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Notification n "
        + "WHERE n.recipient.id = :userId AND n.readAt IS NULL")
    long countUnread(@Param("userId") Long userId);

    /**
     * Marks everything unread as seen, in one statement.
     *
     * Bulk rather than loading and saving each row: "mark all read" on an account that has
     * ignored the bell for a month should not be a hundred updates.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.readAt = :readAt "
        + "WHERE n.recipient.id = :userId AND n.readAt IS NULL")
    int markAllRead(@Param("userId") Long userId, @Param("readAt") Instant readAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.readAt = :readAt "
        + "WHERE n.id = :id AND n.recipient.id = :userId AND n.readAt IS NULL")
    int markRead(@Param("id") Long id, @Param("userId") Long userId,
                 @Param("readAt") Instant readAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Notification n WHERE n.recipient.id = :userId")
    int deleteAllForRecipient(@Param("userId") Long userId);

    /**
     * Whether the same person already has an unread notification of this kind waiting.
     *
     * Used to keep a repeated action from stacking. Someone who unfollows and follows again
     * within the hour is one thing that happened, not two, and a bell that insists otherwise
     * stops being worth opening.
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n "
        + "WHERE n.recipient.id = :recipientId "
        + "AND n.actor.id = :actorId "
        + "AND n.type = :type "
        + "AND n.readAt IS NULL")
    boolean hasUnreadFrom(@Param("recipientId") Long recipientId,
                          @Param("actorId") Long actorId,
                          @Param("type") Notification.NotificationType type);

    /**
     * The same, narrowed to one review.
     *
     * "Helpful" is a toggle, so without this a single person flipping it on and off fills
     * the recipient's bell with notifications about one opinion that has not changed.
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n "
        + "WHERE n.recipient.id = :recipientId "
        + "AND n.actor.id = :actorId "
        + "AND n.type = :type "
        + "AND n.review.id = :reviewId "
        + "AND n.readAt IS NULL")
    boolean hasUnreadAboutReview(@Param("recipientId") Long recipientId,
                                 @Param("actorId") Long actorId,
                                 @Param("type") Notification.NotificationType type,
                                 @Param("reviewId") Long reviewId);
}
