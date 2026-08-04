package com.gamewatch.repository;

import com.gamewatch.entity.ReviewReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface ReviewReplyRepository extends JpaRepository<ReviewReply, Long> {

    /**
     * Every reply under a page of reviews, in one query.
     *
     * A review list is read far more often than it is written to, so the replies are loaded
     * for the whole page at once rather than per review - otherwise a page of twenty reviews
     * costs twenty extra round trips to show a handful of replies.
     */
    @Query("SELECT r FROM ReviewReply r "
        + "JOIN FETCH r.user "
        + "WHERE r.review.id IN :reviewIds "
        + "ORDER BY r.createdAt ASC")
    List<ReviewReply> findForReviews(@Param("reviewIds") Collection<Long> reviewIds);

    /** Backs the per-author rate limit, for the same reason reviews have one. */
    @Query("SELECT COUNT(r) FROM ReviewReply r WHERE r.user.id = :userId AND r.createdAt >= :since")
    long countWrittenSince(@Param("userId") Long userId, @Param("since") Instant since);
}
