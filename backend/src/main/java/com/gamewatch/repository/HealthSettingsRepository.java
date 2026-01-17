package com.gamewatch.repository;

import com.gamewatch.entity.HealthSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthSettingsRepository extends JpaRepository<HealthSettings, Long> {
    Optional<HealthSettings> findByUserId(Long userId);
}
