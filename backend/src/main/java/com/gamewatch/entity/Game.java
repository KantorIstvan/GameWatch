package com.gamewatch.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "games")
@Cacheable
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "banner_image_url", length = 500)
    private String bannerImageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "external_id")
    private Integer externalId;
    
    @Column(name = "release_date")
    private String releaseDate;
    
    @Column(name = "rating")
    private Double rating;

    @Column(name = "ratings_count")
    private Integer ratingsCount;

    @Column(name = "genres", length = 500)
    private String genres;

    @Column(name = "platforms", length = 500)
    private String platforms;

    @Column(name = "developers", length = 500)
    private String developers;

    @Column(name = "publishers", length = 500)
    private String publishers;

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "slug")
    private String slug;

    @Column(name = "website", length = 500)
    private String website;

    /** Average time to beat, in seconds, from IGDB's Game Time to Beat data. */
    @Column(name = "average_completion_seconds")
    private Integer averageCompletionSeconds;

    @Column(name = "esrb_rating", length = 50)
    private String esrbRating;
    
    @Column(name = "alternative_names", columnDefinition = "TEXT")
    private String alternativeNames;

    @Column(name = "dominant_color_1", length = 7)
    private String dominantColor1;
    
    @Column(name = "dominant_color_2", length = 7)
    private String dominantColor2;

    /**
     * Cached aggregates of game_ratings. Recomputed from the rating rows on every write -
     * they are a cache, never the source, so they are rebuilt rather than adjusted.
     */
    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "rating_sum", nullable = false)
    @Builder.Default
    private Long ratingSum = 0L;

    /** Shrunk score this game is ranked by. Null until anyone rates it. */
    @Column(name = "bayesian_score")
    private Double bayesianScore;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
