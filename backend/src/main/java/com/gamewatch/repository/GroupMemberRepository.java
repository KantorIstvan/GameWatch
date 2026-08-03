package com.gamewatch.repository;

import com.gamewatch.entity.Group;
import com.gamewatch.entity.GroupMember;
import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    Optional<GroupMember> findByGroupAndUser(Group group, User user);
    boolean existsByGroupAndUser(Group group, User user);
    List<GroupMember> findByGroupId(Long groupId);

    @Query("SELECT m.group FROM GroupMember m WHERE m.user.id = :userId ORDER BY m.joinedAt DESC")
    List<Group> findGroupsForUser(@Param("userId") Long userId);
}
