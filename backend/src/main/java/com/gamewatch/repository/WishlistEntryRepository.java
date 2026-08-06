package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.User;
import com.gamewatch.entity.WishlistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistEntryRepository extends JpaRepository<WishlistEntry, Long> {

    Optional<WishlistEntry> findByUserAndGame(User user, Game game);

    boolean existsByUserAndGame(User user, Game game);

    List<WishlistEntry> findByUserOrderByAddedAtDesc(User user);
}
