package com.gamewatch.controller;

import com.gamewatch.dto.GameTimeToBeatDto;
import com.gamewatch.service.GameTimeToBeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * The community's own measured time-to-beat for a game, broken out by playthrough type -
 * the catalog page's replacement for IGDB's single self-reported average.
 */
@RestController
@RequestMapping("/games/{gameId}/time-to-beat")
@RequiredArgsConstructor
public class GameTimeToBeatController {

    private final GameTimeToBeatService gameTimeToBeatService;

    @GetMapping
    public ResponseEntity<GameTimeToBeatDto> getTimeToBeat(@PathVariable Long gameId) {
        return ResponseEntity.ok(gameTimeToBeatService.getTimeToBeat(gameId));
    }
}
