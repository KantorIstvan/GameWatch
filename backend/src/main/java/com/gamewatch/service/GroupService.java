package com.gamewatch.service;

import com.gamewatch.dto.GroupDto;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import com.gamewatch.util.TimezoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupChallengeRepository groupChallengeRepository;
    private final PlaythroughRepository playthroughRepository;
    private final SessionHistoryRepository sessionHistoryRepository;
    private final UserGameRepository userGameRepository;

    @Transactional
    public GroupDto createGroup(User owner, String name, String description) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.length() < 3 || trimmed.length() > 60) {
            throw new IllegalArgumentException("Group name must be between 3 and 60 characters");
        }

        String slug = toSlug(trimmed);
        if (slug.isEmpty()) {
            throw new IllegalArgumentException("Group name must contain letters or numbers");
        }
        if (groupRepository.existsBySlugIgnoreCase(slug)) {
            throw new IllegalArgumentException("A group with a similar name already exists");
        }

        Group group = groupRepository.save(Group.builder()
            .name(trimmed)
            .slug(slug)
            .description(description == null || description.isBlank() ? null : description.trim())
            .owner(owner)
            .build());

        // The creator is a member, not merely an administrator of one. A group whose owner
        // does not appear in its own standings reads as broken.
        groupMemberRepository.save(GroupMember.builder().group(group).user(owner).build());

        log.info("User {} created group {}", owner.getId(), group.getId());
        return toDto(group, owner);
    }

    @Transactional
    public GroupDto join(User user, String slug) {
        Group group = requireGroup(slug);
        if (!groupMemberRepository.existsByGroupAndUser(group, user)) {
            groupMemberRepository.save(GroupMember.builder().group(group).user(user).build());
        }
        return toDto(group, user);
    }

    @Transactional
    public void leave(User user, String slug) {
        Group group = requireGroup(slug);

        // The owner leaving would strand the group with nobody able to add challenges.
        if (group.getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException(
                "The owner cannot leave their own group. Delete it instead.");
        }
        groupMemberRepository.findByGroupAndUser(group, user).ifPresent(groupMemberRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getMyGroups(User user) {
        return groupMemberRepository.findGroupsForUser(user.getId()).stream()
            .map(group -> toDto(group, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GroupDto getGroup(User viewer, String slug) {
        return toDto(requireGroup(slug), viewer);
    }

    @Transactional
    public GroupDto addChallenge(User owner, String slug, String name,
                                 GroupChallenge.ChallengeMetric metric, Integer target,
                                 LocalDate startsOn, LocalDate endsOn) {
        Group group = requireGroup(slug);

        if (!group.getOwner().getId().equals(owner.getId())) {
            throw new IllegalArgumentException("Only the group owner can add challenges");
        }
        if (startsOn == null || endsOn == null || endsOn.isBefore(startsOn)) {
            throw new IllegalArgumentException("A challenge must end on or after it starts");
        }

        groupChallengeRepository.save(GroupChallenge.builder()
            .group(group)
            .name(name == null ? "" : name.trim())
            .metric(metric)
            .target(target)
            .startsOn(startsOn)
            .endsOn(endsOn)
            .build());

        return toDto(group, owner);
    }

    private Group requireGroup(String slug) {
        return groupRepository.findBySlugIgnoreCase(slug)
            .orElseThrow(() -> new IllegalArgumentException("Group not found"));
    }

    private GroupDto toDto(Group group, User viewer) {
        List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());

        List<GroupDto.ChallengeDto> challenges = groupChallengeRepository
            .findByGroupIdOrderByEndsOnDesc(group.getId()).stream()
            .map(challenge -> toChallengeDto(challenge, members, viewer))
            .collect(Collectors.toList());

        return GroupDto.builder()
            .id(group.getId())
            .name(group.getName())
            .slug(group.getSlug())
            .description(group.getDescription())
            .ownerHandle(group.getOwner().getHandle())
            .memberCount(members.size())
            .viewerIsMember(members.stream()
                .anyMatch(member -> member.getUser().getId().equals(viewer.getId())))
            .viewerIsOwner(group.getOwner().getId().equals(viewer.getId()))
            .challenges(challenges)
            .build();
    }

    private GroupDto.ChallengeDto toChallengeDto(GroupChallenge challenge,
                                                 List<GroupMember> members, User viewer) {
        LocalDate today = LocalDate.now(TimezoneUtils.resolveZone(viewer));

        List<GroupDto.StandingDto> standings = members.stream()
            .map(member -> {
                int score = scoreFor(member.getUser(), challenge);
                return GroupDto.StandingDto.builder()
                    .handle(member.getUser().getHandle())
                    .displayName(member.getUser().getDisplayName() != null
                        ? member.getUser().getDisplayName() : member.getUser().getUsername())
                    .profilePictureUrl(member.getUser().getProfilePictureUrl())
                    .score(score)
                    .reachedTarget(challenge.getTarget() != null && score >= challenge.getTarget())
                    .build();
            })
            .sorted(Comparator.comparingInt(GroupDto.StandingDto::getScore).reversed())
            .collect(Collectors.toList());

        return GroupDto.ChallengeDto.builder()
            .id(challenge.getId())
            .name(challenge.getName())
            .metric(challenge.getMetric().name())
            .target(challenge.getTarget())
            .startsOn(challenge.getStartsOn().toString())
            .endsOn(challenge.getEndsOn().toString())
            .active(!today.isBefore(challenge.getStartsOn()) && !today.isAfter(challenge.getEndsOn()))
            .standings(standings)
            .build();
    }

    /**
     * A member's score for a challenge.
     *
     * Every branch counts finishing, breadth or regularity. None of them counts hours, and
     * none of them can be improved by playing longer in one sitting - which is the whole
     * reason the metric enum has the shape it does.
     */
    private int scoreFor(User member, GroupChallenge challenge) {
        ZoneId zone = TimezoneUtils.resolveZone(member);
        LocalDate from = challenge.getStartsOn();
        LocalDate to = challenge.getEndsOn();

        List<Playthrough> playthroughs = playthroughRepository
            .findByUserIdOrderByCreatedAtDesc(member.getId());

        return switch (challenge.getMetric()) {
            case GAMES_FINISHED -> (int) playthroughs.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
                .filter(p -> withinWindow(p.getEndDate(), from, to))
                .map(p -> p.getGame().getId())
                .distinct()
                .count();

            case BACKLOG_CLEARED -> (int) playthroughs.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
                .filter(p -> withinWindow(p.getEndDate(), from, to))
                // Only counts if the game was already owned when the window opened, so a
                // challenge about the backlog cannot be won by buying and finishing
                // something new.
                .filter(p -> ownedBefore(member, p.getGame(), from, zone))
                .map(p -> p.getGame().getId())
                .distinct()
                .count();

            case DISTINCT_GAMES_PLAYED -> (int) sessionsInWindow(member, from, to, zone).stream()
                .map(session -> session.getPlaythrough().getGame().getId())
                .distinct()
                .count();

            case DAYS_PLAYED -> (int) sessionsInWindow(member, from, to, zone).stream()
                .map(session -> session.getStartedAt().atZone(zone).toLocalDate())
                .distinct()
                .count();
        };
    }

    private List<SessionHistory> sessionsInWindow(User member, LocalDate from, LocalDate to, ZoneId zone) {
        return sessionHistoryRepository.findSessionsStartedByUserBetween(
            member.getId(),
            from.atStartOfDay(zone).toInstant(),
            to.plusDays(1).atStartOfDay(zone).toInstant());
    }

    private boolean withinWindow(LocalDate date, LocalDate from, LocalDate to) {
        return date != null && !date.isBefore(from) && !date.isAfter(to);
    }

    private boolean ownedBefore(User member, Game game, LocalDate cutoff, ZoneId zone) {
        return userGameRepository.findByUserAndGame(member, game)
            .map(entry -> entry.getCreatedAt().atZone(zone).toLocalDate().isBefore(cutoff))
            .orElse(false);
    }

    private String toSlug(String name) {
        return name.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    }
}
