package com.gamewatch.repository;

import com.gamewatch.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    Optional<Group> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
}
