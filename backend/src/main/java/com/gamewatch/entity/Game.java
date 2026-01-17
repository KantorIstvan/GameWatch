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
    
    @Column(name = "rating_top")
    private Integer ratingTop;
    
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
    
    @Column(name = "name_original", length = 500)
    private String nameOriginal;
    
    @Column(name = "slug")
    private String slug;
    
    @Column(name = "tba")
    private Boolean tba;
    
    @Column(name = "updated_at_rawg", length = 100)
    private String updatedAtRawg;
    
    @Column(name = "website", length = 500)
    private String website;
    
    @Column(name = "metacritic")
    private Integer metacritic;
    
    @Column(name = "metacritic_url", length = 500)
    private String metacriticUrl;
    
    @Column(name = "background_image_additional", length = 500)
    private String backgroundImageAdditional;
    
    @Column(name = "playtime")
    private Integer playtime;
    
    @Column(name = "screenshots_count")
    private Integer screenshotsCount;
    
    @Column(name = "movies_count")
    private Integer moviesCount;
    
    @Column(name = "creators_count")
    private Integer creatorsCount;
    
    @Column(name = "achievements_count")
    private Integer achievementsCount;
    
    @Column(name = "parent_achievements_count", length = 50)
    private String parentAchievementsCount;
    
    @Column(name = "reddit_url", length = 500)
    private String redditUrl;
    
    @Column(name = "reddit_name")
    private String redditName;
    
    @Column(name = "reddit_description", columnDefinition = "TEXT")
    private String redditDescription;
    
    @Column(name = "reddit_logo", length = 500)
    private String redditLogo;
    
    @Column(name = "reddit_count")
    private Integer redditCount;
    
    @Column(name = "twitch_count", length = 50)
    private String twitchCount;
    
    @Column(name = "youtube_count", length = 50)
    private String youtubeCount;
    
    @Column(name = "added")
    private Integer added;
    
    @Column(name = "reviews_text_count", length = 50)
    private String reviewsTextCount;
    
    @Column(name = "suggestions_count")
    private Integer suggestionsCount;
    
    @Column(name = "parents_count")
    private Integer parentsCount;
    
    @Column(name = "additions_count")
    private Integer additionsCount;
    
    @Column(name = "game_series_count")
    private Integer gameSeriesCount;
    
    @Column(name = "esrb_rating", length = 50)
    private String esrbRating;
    
    @Column(name = "alternative_names", columnDefinition = "TEXT")
    private String alternativeNames;

    @Column(name = "dominant_color_1", length = 7)
    private String dominantColor1;
    
    @Column(name = "dominant_color_2", length = 7)
    private String dominantColor2;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
