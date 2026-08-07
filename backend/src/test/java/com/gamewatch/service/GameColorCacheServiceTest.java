package com.gamewatch.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameColorCacheServiceTest {

    @Mock
    private ColorExtractionService colorExtractionService;

    private GameColorCacheService gameColorCacheService;

    @BeforeEach
    void setUp() {
        gameColorCacheService = new GameColorCacheService(colorExtractionService);
    }

    @Test
    void getColors_SecondCallForSameExternalId_ReusesCachedResultInsteadOfReExtracting() {
        when(colorExtractionService.extractDominantColors("https://example.com/banner.jpg"))
            .thenReturn(new String[]{"#111111", "#222222"});

        String[] first = gameColorCacheService.getColors(12345, "https://example.com/banner.jpg");
        String[] second = gameColorCacheService.getColors(12345, "https://example.com/banner.jpg");

        assertThat(first).containsExactly("#111111", "#222222");
        assertThat(second).containsExactly("#111111", "#222222");
        // The whole point of the cache: the expensive download-plus-k-means call happens once,
        // no matter how many times the same game's page is viewed.
        verify(colorExtractionService, times(1)).extractDominantColors("https://example.com/banner.jpg");
    }

    @Test
    void getColors_DifferentExternalIds_ExtractIndependently() {
        when(colorExtractionService.extractDominantColors("https://example.com/a.jpg"))
            .thenReturn(new String[]{"#111111", "#222222"});
        when(colorExtractionService.extractDominantColors("https://example.com/b.jpg"))
            .thenReturn(new String[]{"#333333", "#444444"});

        String[] a = gameColorCacheService.getColors(1, "https://example.com/a.jpg");
        String[] b = gameColorCacheService.getColors(2, "https://example.com/b.jpg");

        assertThat(a).containsExactly("#111111", "#222222");
        assertThat(b).containsExactly("#333333", "#444444");
        verify(colorExtractionService).extractDominantColors("https://example.com/a.jpg");
        verify(colorExtractionService).extractDominantColors("https://example.com/b.jpg");
    }

    @Test
    void getColors_FailedExtraction_CachesTheMissSoItIsNotRetriedOnEveryView() {
        when(colorExtractionService.extractDominantColors("https://example.com/broken.jpg"))
            .thenReturn(null);

        String[] first = gameColorCacheService.getColors(12345, "https://example.com/broken.jpg");
        String[] second = gameColorCacheService.getColors(12345, "https://example.com/broken.jpg");

        assertThat(first).isNull();
        assertThat(second).isNull();
        verify(colorExtractionService, times(1)).extractDominantColors(eq("https://example.com/broken.jpg"));
    }

    @Test
    void getColors_NoBannerUrl_ReturnsNullWithoutCallingExtraction() {
        assertThat(gameColorCacheService.getColors(12345, null)).isNull();
        assertThat(gameColorCacheService.getColors(12345, "")).isNull();

        verify(colorExtractionService, times(0)).extractDominantColors(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void getColors_ConcurrentRequestsForSameExternalId_ExtractOnlyOnce() throws InterruptedException {
        // Multiple people opening the same never-before-seen game's page at once shouldn't
        // trigger the extraction multiple times in an uncontrolled way.
        AtomicInteger extractionCount = new AtomicInteger(0);
        when(colorExtractionService.extractDominantColors("https://example.com/banner.jpg"))
            .thenAnswer(invocation -> {
                extractionCount.incrementAndGet();
                Thread.sleep(20);
                return new String[]{"#111111", "#222222"};
            });

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    gameColorCacheService.getColors(12345, "https://example.com/banner.jpg");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        start.countDown();
        boolean finished = done.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        assertThat(extractionCount.get()).isEqualTo(1);
    }
}
