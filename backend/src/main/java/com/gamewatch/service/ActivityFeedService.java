package com.gamewatch.service;

import com.gamewatch.dto.ActivityEventDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.Playthrough;
import com.gamewatch.entity.User;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.PlaythroughRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityFeedService {

    private static final int DEFAULT_LIMIT = 50;

    private final FollowRepository followRepository;
    private final PlaythroughRepository playthroughRepository;
    private final FollowService followService;

    /**
     * What the people this viewer follows have been doing.
     *
     * Events are derived from playthrough state rather than written to a feed table. A
     * stored feed would need updating on every timer action and then reconciling with
     * edits, deletions and visibility changes; deriving means a playthrough that is deleted
     * or made private simply stops appearing, with nothing to clean up.
     */
    @Transactional(readOnly = true)
    public List<ActivityEventDto> getFeed(User viewer, Integer limit) {
        List<User> followed = followRepository.findAcceptedFollowing(viewer.getId()).stream()
            .map(Follow::getFollowee)
            // Someone can restrict their library after you started following them, so the
            // visibility check happens on read rather than being trusted from the follow.
            .filter(owner -> followService.canView(viewer, owner, owner.getLibraryVisibility()))
            .collect(Collectors.toList());

        if (followed.isEmpty()) {
            return List.of();
        }

        List<ActivityEventDto> events = new ArrayList<>();
        for (User actor : followed) {
            for (Playthrough playthrough : playthroughRepository
                    .findByUserIdOrderByCreatedAtDesc(actor.getId())) {
                events.addAll(eventsFor(actor, playthrough));
            }
        }

        return events.stream()
            .sorted(Comparator.comparing(ActivityEventDto::getOccurredAt).reversed())
            .limit(limit != null && limit > 0 ? limit : DEFAULT_LIMIT)
            .collect(Collectors.toList());
    }

    /**
     * The milestones a single playthrough contributes.
     *
     * A playthrough can produce more than one - picked up in March and finished in May is
     * two things that happened, and collapsing them to the latest would lose the middle of
     * the story.
     */
    private List<ActivityEventDto> eventsFor(User actor, Playthrough playthrough) {
        List<ActivityEventDto> events = new ArrayList<>();

        if (Boolean.TRUE.equals(playthrough.getIsCompleted()) && playthrough.getStoppedAt() != null) {
            events.add(event(actor, playthrough, "FINISHED", playthrough.getStoppedAt()));
        }
        if (Boolean.TRUE.equals(playthrough.getIsDropped()) && playthrough.getDroppedAt() != null) {
            events.add(event(actor, playthrough, "DROPPED", playthrough.getDroppedAt()));
        }
        if (playthrough.getPickedUpAt() != null) {
            events.add(event(actor, playthrough, "PICKED_UP", playthrough.getPickedUpAt()));
        }
        // Starting is only interesting while it is still the latest thing to have happened;
        // otherwise every finished game would also announce that it once began.
        if (events.isEmpty() && playthrough.effectivePlaytimeSeconds() > 0
            && playthrough.getCreatedAt() != null) {
            events.add(event(actor, playthrough, "STARTED", playthrough.getCreatedAt()));
        }

        return events;
    }

    private ActivityEventDto event(User actor, Playthrough playthrough, String type, Instant when) {
        return ActivityEventDto.builder()
            .id(type + "-" + playthrough.getId())
            .actorHandle(actor.getHandle())
            .actorDisplayName(actor.getDisplayName() != null
                ? actor.getDisplayName() : actor.getUsername())
            .actorPictureUrl(actor.getProfilePictureUrl())
            .type(type)
            .gameId(playthrough.getGame().getId())
            .gameName(playthrough.getGame().getName())
            .bannerImageUrl(playthrough.getGame().getBannerImageUrl())
            .playtimeSeconds(playthrough.effectivePlaytimeSeconds())
            .occurredAt(when)
            .build();
    }
}
