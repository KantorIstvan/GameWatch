package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "session_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playthrough_id", nullable = false)
    private Playthrough playthrough;

    @Column(name = "session_number", nullable = false)
    private Integer sessionNumber;

    @Column(name = "duration_seconds", nullable = false)
    private Long durationSeconds;

    @Column(name = "pause_count", nullable = false)
    private Integer pauseCount;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
