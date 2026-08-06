package com.gamewatch.repository;

import com.gamewatch.entity.User;
import com.gamewatch.entity.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {

    Optional<UserAvatar> findByUser(User user);

    Optional<UserAvatar> findByAvatarKey(String avatarKey);
}
