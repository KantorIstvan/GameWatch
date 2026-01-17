package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import com.gamewatch.entity.User;
import com.gamewatch.entity.UserGame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserGameRepository extends JpaRepository<UserGame, Long> {
    
    Optional<UserGame> findByUserAndGame(User user, Game game);
    
    @Query("SELECT ug.game FROM UserGame ug WHERE ug.user = :user")
    List<Game> findGamesByUser(@Param("user") User user);
    
    boolean existsByUserAndGame(User user, Game game);
    
    @Query("SELECT COUNT(ug) > 0 FROM UserGame ug WHERE ug.user = :user AND ug.game.externalId = :externalId")
    boolean existsByUserAndGameExternalId(@Param("user") User user, @Param("externalId") Integer externalId);
}
