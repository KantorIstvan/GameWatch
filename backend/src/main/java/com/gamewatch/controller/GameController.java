package com.gamewatch.controller;

import com.gamewatch.dto.CreateGameRequest;
import com.gamewatch.dto.GameDto;
import com.gamewatch.dto.GameSearchResultDto;
import com.gamewatch.dto.GameStatisticsDto;
import com.gamewatch.entity.User;
import com.gamewatch.service.GameService;
import com.gamewatch.service.RawgApiService;
import com.gamewatch.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final UserService userService;
    private final RawgApiService rawgApiService;

    @GetMapping("/search")
    public ResponseEntity<List<GameSearchResultDto>> searchGames(
            @RequestParam String query) {
        List<GameSearchResultDto> results = rawgApiService.searchGames(query);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/details/{externalId}")
    public ResponseEntity<GameSearchResultDto> getGameDetails(
            @PathVariable Integer externalId) {
        GameSearchResultDto details = rawgApiService.getGameDetails(externalId);
        return ResponseEntity.ok(details);
    }

    @PostMapping
    public ResponseEntity<GameDto> createGame(
            @Valid @RequestBody CreateGameRequest request,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        GameDto game = gameService.createGame(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(game);
    }

    @GetMapping
    public ResponseEntity<List<GameDto>> getAllGames(Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        List<GameDto> games = gameService.getAllGames(user);
        return ResponseEntity.ok(games);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameDto> getGameById(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        GameDto game = gameService.getGameById(id, user);
        return ResponseEntity.ok(game);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGame(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        gameService.deleteGame(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/statistics")
    public ResponseEntity<GameStatisticsDto> getGameStatistics(
            @PathVariable Long id,
            Authentication authentication) {
        User user = userService.getOrCreateUser(authentication);
        GameStatisticsDto statistics = gameService.getGameStatistics(id, user);
        return ResponseEntity.ok(statistics);
    }
}
