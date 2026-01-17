package com.gamewatch.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.net.URL;
import java.util.*;

@Service
@Slf4j
public class ColorExtractionService {

    public String[] extractDominantColors(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return null;
        }

        try {
            BufferedImage image = ImageIO.read(new URL(imageUrl));
            if (image == null) {
                log.warn("Could not read image from URL: {}", imageUrl);
                return null;
            }

            BufferedImage resizedImage = resizeImage(image, 150);

            List<ColorInfo> dominantColors = extractColors(resizedImage, 6);

            if (dominantColors.size() >= 2) {
                ColorPair bestPair = findMostDistinctColorPair(dominantColors);
                
                String color1 = rgbToHex(bestPair.color1.r, bestPair.color1.g, bestPair.color1.b);
                String color2 = rgbToHex(bestPair.color2.r, bestPair.color2.g, bestPair.color2.b);
                log.info("Extracted colors from {}: {} and {} (color distance: {})", 
                         imageUrl, color1, color2, String.format("%.2f", bestPair.distance));
                return new String[]{color1, color2};
            }

            return null;
        } catch (IOException e) {
            log.error("Failed to extract colors from image: {}", imageUrl, e);
            return null;
        } catch (Exception e) {
            log.error("Unexpected error extracting colors from image: {}", imageUrl, e);
            return null;
        }
    }


    private ColorPair findMostDistinctColorPair(List<ColorInfo> colors) {
        ColorPair bestPair = null;
        double maxDistance = 0;

        for (int i = 0; i < colors.size(); i++) {
            for (int j = i + 1; j < colors.size(); j++) {
                ColorInfo c1 = colors.get(i);
                ColorInfo c2 = colors.get(j);
                
                double rDiff = c1.r - c2.r;
                double gDiff = c1.g - c2.g;
                double bDiff = c1.b - c2.b;
                
                double distance = Math.sqrt(2 * rDiff * rDiff + 4 * gDiff * gDiff + 3 * bDiff * bDiff);
                
                double hueDiff = Math.abs(getHue(c1) - getHue(c2));
                if (hueDiff > 180) {
                    hueDiff = 360 - hueDiff;
                }
                double hueBonus = hueDiff / 180.0 * 100;
                
                double totalScore = distance + hueBonus;
                
                if (totalScore > maxDistance) {
                    maxDistance = totalScore;
                    bestPair = new ColorPair(c1, c2, totalScore);
                }
            }
        }

        if (bestPair == null && colors.size() >= 2) {
            bestPair = new ColorPair(colors.get(0), colors.get(1), 0);
        }

        return bestPair;
    }

    private double getHue(ColorInfo color) {
        double r = color.r / 255.0;
        double g = color.g / 255.0;
        double b = color.b / 255.0;
        
        double max = Math.max(r, Math.max(g, b));
        double min = Math.min(r, Math.min(g, b));
        double delta = max - min;
        
        if (delta == 0) {
            return 0;
        }
        
        double hue;
        if (max == r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max == g) {
            hue = 60 * (((b - r) / delta) + 2);
        } else {
            hue = 60 * (((r - g) / delta) + 4);
        }
        
        if (hue < 0) {
            hue += 360;
        }
        
        return hue;
    }


    private BufferedImage resizeImage(BufferedImage original, int maxSize) {
        int width = original.getWidth();
        int height = original.getHeight();

        if (width <= maxSize && height <= maxSize) {
            return original;
        }

        double scale = Math.min((double) maxSize / width, (double) maxSize / height);
        int newWidth = (int) (width * scale);
        int newHeight = (int) (height * scale);

        BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        resized.createGraphics().drawImage(original, 0, 0, newWidth, newHeight, null);
        return resized;
    }


    private List<ColorInfo> extractColors(BufferedImage image, int numColors) {
        List<int[]> pixels = samplePixels(image, 1000);

        List<ColorInfo> clusters = kMeansClustering(pixels, numColors, 10);

        clusters.sort((a, b) -> Integer.compare(b.count, a.count));

        return clusters;
    }

    private List<int[]> samplePixels(BufferedImage image, int maxSamples) {
        List<int[]> pixels = new ArrayList<>();
        int width = image.getWidth();
        int height = image.getHeight();
        int totalPixels = width * height;

        int step = Math.max(1, (int) Math.sqrt(totalPixels / maxSamples));

        for (int y = 0; y < height; y += step) {
            for (int x = 0; x < width; x += step) {
                int rgb = image.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;

                if ((r + g + b) / 3 > 20 && (r + g + b) / 3 < 235) {
                    pixels.add(new int[]{r, g, b});
                }
            }
        }

        return pixels;
    }

    private List<ColorInfo> kMeansClustering(List<int[]> pixels, int k, int maxIterations) {
        if (pixels.isEmpty()) {
            return new ArrayList<>();
        }

        Random random = new Random();
        List<ColorInfo> centroids = new ArrayList<>();
        for (int i = 0; i < k; i++) {
            int[] pixel = pixels.get(random.nextInt(pixels.size()));
            centroids.add(new ColorInfo(pixel[0], pixel[1], pixel[2], 0));
        }

        for (int iter = 0; iter < maxIterations; iter++) {
            int[] assignments = new int[pixels.size()];
            int[][] sums = new int[k][3];
            int[] counts = new int[k];

            for (int i = 0; i < pixels.size(); i++) {
                int[] pixel = pixels.get(i);
                int nearest = findNearestCentroid(pixel, centroids);
                assignments[i] = nearest;
                sums[nearest][0] += pixel[0];
                sums[nearest][1] += pixel[1];
                sums[nearest][2] += pixel[2];
                counts[nearest]++;
            }

            boolean changed = false;
            for (int i = 0; i < k; i++) {
                if (counts[i] > 0) {
                    int newR = sums[i][0] / counts[i];
                    int newG = sums[i][1] / counts[i];
                    int newB = sums[i][2] / counts[i];

                    if (centroids.get(i).r != newR || centroids.get(i).g != newG || centroids.get(i).b != newB) {
                        centroids.set(i, new ColorInfo(newR, newG, newB, counts[i]));
                        changed = true;
                    }
                }
            }

            if (!changed) {
                break;
            }
        }

        return centroids;
    }

    /**
     * Find nearest centroid for a pixel
     */
    private int findNearestCentroid(int[] pixel, List<ColorInfo> centroids) {
        int nearest = 0;
        double minDistance = Double.MAX_VALUE;

        for (int i = 0; i < centroids.size(); i++) {
            ColorInfo centroid = centroids.get(i);
            double distance = Math.sqrt(
                    Math.pow(pixel[0] - centroid.r, 2) +
                    Math.pow(pixel[1] - centroid.g, 2) +
                    Math.pow(pixel[2] - centroid.b, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = i;
            }
        }

        return nearest;
    }

    /**
     * Convert RGB values to hex color string
     */
    private String rgbToHex(int r, int g, int b) {
        return String.format("#%02X%02X%02X", r, g, b);
    }

    /**
     * Helper class to store color information
     */
    private static class ColorInfo {
        int r, g, b, count;

        ColorInfo(int r, int g, int b, int count) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.count = count;
        }
    }

    /**
     * Helper class to store a pair of colors with their distance
     */
    private static class ColorPair {
        ColorInfo color1;
        ColorInfo color2;
        double distance;

        ColorPair(ColorInfo color1, ColorInfo color2, double distance) {
            this.color1 = color1;
            this.color2 = color2;
            this.distance = distance;
        }
    }
}
