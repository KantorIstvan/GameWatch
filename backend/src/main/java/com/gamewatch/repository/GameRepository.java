package com.gamewatch.repository;

import com.gamewatch.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByName(String name);
    Optional<Game> findByExternalId(Integer externalId);
    
    @Query("SELECT g FROM Game g WHERE g.externalId = :externalId ORDER BY g.id LIMIT 1")
    Optional<Game> findFirstByExternalId(Integer externalId);
    
    @Query("SELECT g FROM Game g WHERE g.name = :name ORDER BY g.id LIMIT 1")
    Optional<Game> findFirstByName(String name);
}
