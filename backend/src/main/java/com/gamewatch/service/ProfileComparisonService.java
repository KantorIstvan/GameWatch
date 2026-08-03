package com.gamewatch.service;

import com.gamewatch.dto.ProfileComparisonDto;
import com.gamewatch.entity.Game;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileComparisonService {

    private static final int MAX_SHARED_GAMES = 20;

    private final UserRepository userRepository;
    private final PlaythroughRepository playthroughRepository;
    private final UserGameRepository userGameRepository;
    private final FollowService followService;

    /**
     * The viewer's library against someone else's, and the games they both own.
     *
     * Gated on exactly the visibility a profile is, and reported as absent when it is not
     * permitted - so this adds no reachable data, it only rearranges what a profile already
     * shows into a form that can be read against your own.
     */
    @Transactional(readOnly = true)
    public ProfileComparisonDto compare(User viewer, String handle) {
        User them = userRepository.findByHandleIgnoreCase(handle)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        if (them.getId().equals(viewer.getId())) {
            throw new IllegalArgumentException("You cannot compare a profile with itself");
        }
        if (!followService.canView(viewer, them, them.getLibraryVisibility())) {
            throw new IllegalArgumentException("Profile not found");
        }

        List<Playthrough> yours = playthroughRepository.findByUserIdOrderByCreatedAtDesc(viewer.getId());
        List<Playthrough> theirs = playthroughRepository.findByUserIdOrderByCreatedAtDesc(them.getId());

        Map<Long, Long> yourPlaytime = playtimeByGame(yours);
        Map<Long, Long> theirPlaytime = playtimeByGame(theirs);
        Set<Long> yourFinished = finishedGameIds(yours);
        Set<Long> theirFinished = finishedGameIds(theirs);

        Map<Long, Game> gamesById = theirs.stream()
            .collect(Collectors.toMap(p -> p.getGame().getId(), Playthrough::getGame, (a, b) -> a));
        yours.forEach(p -> gamesById.putIfAbsent(p.getGame().getId(), p.getGame()));

        List<Long> sharedIds = yourPlaytime.keySet().stream()
            .filter(theirPlaytime::containsKey)
            .collect(Collectors.toList());

        List<ProfileComparisonDto.SharedGameDto> shared = sharedIds.stream()
            .map(gameId -> {
                Game game = gamesById.get(gameId);
                return ProfileComparisonDto.SharedGameDto.builder()
                    .gameId(gameId)
                    .gameName(game.getName())
                    .bannerImageUrl(game.getBannerImageUrl())
                    .yourSeconds(yourPlaytime.getOrDefault(gameId, 0L))
                    .theirSeconds(theirPlaytime.getOrDefault(gameId, 0L))
                    .youFinished(yourFinished.contains(gameId))
                    .theyFinished(theirFinished.contains(gameId))
                    .build();
            })
            // Ordered by how much time the two of them have put in between them, so the
            // games they actually have in common lead rather than the ones both barely
            // touched.
            .sorted(Comparator.comparingLong(
                (ProfileComparisonDto.SharedGameDto g) -> g.getYourSeconds() + g.getTheirSeconds())
                .reversed())
            .limit(MAX_SHARED_GAMES)
            .collect(Collectors.toList());

        return ProfileComparisonDto.builder()
            .you(side(viewer, yours))
            .them(side(them, theirs))
            .sharedGames(shared)
            .sharedGameCount(sharedIds.size())
            .build();
    }

    private Map<Long, Long> playtimeByGame(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .collect(Collectors.groupingBy(
                p -> p.getGame().getId(),
                Collectors.summingLong(Playthrough::effectivePlaytimeSeconds)));
    }

    private Set<Long> finishedGameIds(List<Playthrough> playthroughs) {
        return playthroughs.stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .map(p -> p.getGame().getId())
            .collect(Collectors.toSet());
    }

    private ProfileComparisonDto.SideDto side(User user, List<Playthrough> playthroughs) {
        return ProfileComparisonDto.SideDto.builder()
            .handle(user.getHandle())
            .displayName(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
            .profilePictureUrl(user.getProfilePictureUrl())
            .totalPlaytimeSeconds(playthroughs.stream()
                .mapToLong(Playthrough::effectivePlaytimeSeconds).sum())
            .gamesInLibrary(userGameRepository.findGamesByUser(user).size())
            .gamesCompleted(finishedGameIds(playthroughs).size())
            .totalSessions(playthroughs.stream()
                .mapToInt(p -> p.getSessionCount() != null ? p.getSessionCount() : 0).sum())
            .build();
    }
}
