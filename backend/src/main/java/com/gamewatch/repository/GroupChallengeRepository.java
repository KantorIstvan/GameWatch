package com.gamewatch.repository;

import com.gamewatch.entity.GroupChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupChallengeRepository extends JpaRepository<GroupChallenge, Long> {
    List<GroupChallenge> findByGroupIdOrderByEndsOnDesc(Long groupId);
}
