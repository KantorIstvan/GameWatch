package com.gamewatch.repository;

import com.gamewatch.entity.GameReview;
import com.gamewatch.entity.ReviewVote;
import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ReviewVoteRepository extends JpaRepository<ReviewVote, Long> {

    Optional<ReviewVote> findByReviewAndUser(GameReview review, User user);

    long countByReview(GameReview review);

    /** Which of these reviews the viewer has already marked helpful. */
    @Query("SELECT v.review.id FROM ReviewVote v WHERE v.user.id = :userId AND v.review.id IN :reviewIds")
    Set<Long> findVotedReviewIds(@Param("userId") Long userId, @Param("reviewIds") List<Long> reviewIds);
}
