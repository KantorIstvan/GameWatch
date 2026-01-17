package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByName(String name);
    Optional<Game> findByExternalId(Integer externalId);
}
