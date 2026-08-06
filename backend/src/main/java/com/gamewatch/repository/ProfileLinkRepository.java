package com.gamewatch.repository;

import com.gamewatch.entity.ProfileLink;
import com.gamewatch.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfileLinkRepository extends JpaRepository<ProfileLink, Long> {

    List<ProfileLink> findByUserOrderBySortOrderAsc(User user);

    void deleteByUser(User user);
}
