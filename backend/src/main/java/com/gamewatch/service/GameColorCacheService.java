package com.gamewatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory, process-lifetime cache of a game's dominant colors, keyed by IGDB external id.
 *
 * {@link ColorExtractionService#extractDominantColors} downloads the game's banner and runs
 * k-means clustering on it - a real network + CPU cost. The catalog's backdrop gradient now has
 * to render on every page view of every catalog game, including the majority that have never
 * been rated, reviewed or wishlisted and so have no catalog row to persist a computed color on
 * (see {@code GameService#mapExternalToCatalogDto}). Without this cache, every visitor's first
 * page load of a popular-but-never-catalogued game would pay the full extraction cost again.
 *
 * A plain {@link ConcurrentHashMap} is enough here: this is a decorative background effect, not
 * data that needs to survive a restart or be shared across instances, so losing the cache on
 * redeploy is an acceptable tradeoff against a new database table and migration just to persist
 * per-external-id colors independently of the catalog row. {@link Map#computeIfAbsent} gives
 * single-flight de-duplication per key under concurrent requests without any extra locking - the
 * rare race where two threads both start extracting the same never-before-seen game at once is
 * cheap enough not to be worth guarding against further.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GameColorCacheService {

    // computeIfAbsent can't store a null value, so a failed/unavailable extraction is cached as
    // this empty-array sentinel instead - otherwise a game whose banner can't be read would
    // re-attempt the download on every single view.
    private static final String[] NO_COLORS = new String[0];

    private final ColorExtractionService colorExtractionService;

    private final Map<Integer, String[]> cache = new ConcurrentHashMap<>();

    /**
     * The two dominant colors for the game with this external id, extracting and caching them
     * on the first call and reusing the cached result - no re-download, no re-clustering - on
     * every call after, for as long as this process is up.
     *
     * @return a two-element {@code [hex, hex]} array, or {@code null} if there is no banner to
     * extract from or extraction failed.
     */
    public String[] getColors(Integer externalId, String bannerImageUrl) {
        if (externalId == null || bannerImageUrl == null || bannerImageUrl.isEmpty()) {
            return null;
        }

        String[] cached = cache.computeIfAbsent(externalId, id -> {
            String[] extracted = colorExtractionService.extractDominantColors(bannerImageUrl);
            return extracted != null ? extracted : NO_COLORS;
        });

        return cached.length > 0 ? cached : null;
    }
}
