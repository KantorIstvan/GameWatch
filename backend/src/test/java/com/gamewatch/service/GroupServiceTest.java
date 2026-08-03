package com.gamewatch.service;

import com.gamewatch.dto.GroupDto;
import com.gamewatch.entity.*;
import com.gamewatch.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock private GroupRepository groupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private GroupChallengeRepository groupChallengeRepository;
    @Mock private PlaythroughRepository playthroughRepository;
    @Mock private SessionHistoryRepository sessionHistoryRepository;
    @Mock private UserGameRepository userGameRepository;

    @InjectMocks private GroupService groupService;

    private User owner;
    private Group group;
    private Game game;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).auth0UserId("auth0|1").handle("owner").timezone("UTC").build();
        group = Group.builder().id(1L).name("Backlog Club").slug("backlog-club").owner(owner).build();
        game = Game.builder().id(10L).name("Test Game").build();
    }

    @Test
    void noChallengeMetricCanBeWonByPlayingLonger() {
        // The point of the whole enum. The health feature discourages long unbroken
        // sessions and late-night play; a leaderboard ranked on hours would pay people to
        // do exactly what the rest of the app asks them not to.
        assertThat(GroupChallenge.ChallengeMetric.values())
            .extracting(Enum::name)
            .containsExactlyInAnyOrder(
                "GAMES_FINISHED", "DISTINCT_GAMES_PLAYED", "DAYS_PLAYED", "BACKLOG_CLEARED")
            .noneMatch(name -> name.contains("HOUR") || name.contains("TIME") || name.contains("PLAYTIME"));
    }

    @Test
    void theCreatorIsAMemberOfTheirOwnGroup() {
        // A group whose owner does not appear in its own standings reads as broken.
        when(groupRepository.existsBySlugIgnoreCase("backlog-club")).thenReturn(false);
        when(groupRepository.save(any(Group.class))).thenReturn(group);
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(List.of(
            GroupMember.builder().id(1L).group(group).user(owner).build()));
        when(groupChallengeRepository.findByGroupIdOrderByEndsOnDesc(1L)).thenReturn(List.of());

        GroupDto result = groupService.createGroup(owner, "Backlog Club", null);

        verify(groupMemberRepository).save(any(GroupMember.class));
        assertThat(result.isViewerIsMember()).isTrue();
        assertThat(result.isViewerIsOwner()).isTrue();
    }

    @Test
    void aDuplicateGroupNameIsRefused() {
        when(groupRepository.existsBySlugIgnoreCase("backlog-club")).thenReturn(true);

        assertThatThrownBy(() -> groupService.createGroup(owner, "Backlog Club", null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already exists");

        verify(groupRepository, never()).save(any());
    }

    @Test
    void theOwnerCannotLeaveAndStrandTheGroup() {
        // Nobody else can add challenges, so the group would be frozen.
        when(groupRepository.findBySlugIgnoreCase("backlog-club")).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.leave(owner, "backlog-club"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cannot leave");
    }

    @Test
    void onlyTheOwnerCanAddAChallenge() {
        User stranger = User.builder().id(99L).auth0UserId("auth0|99").handle("stranger").build();
        when(groupRepository.findBySlugIgnoreCase("backlog-club")).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.addChallenge(stranger, "backlog-club", "November",
                GroupChallenge.ChallengeMetric.GAMES_FINISHED, 3,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Only the group owner");

        verify(groupChallengeRepository, never()).save(any());
    }

    @Test
    void backlogClearedIgnoresGamesBoughtDuringTheChallenge() {
        // Otherwise a challenge about clearing the backlog could be won by buying
        // something new and finishing it, which is the opposite of the intent.
        GroupChallenge challenge = GroupChallenge.builder()
            .id(1L).group(group).name("November").metric(GroupChallenge.ChallengeMetric.BACKLOG_CLEARED)
            .target(2).startsOn(LocalDate.of(2026, 11, 1)).endsOn(LocalDate.of(2026, 11, 30))
            .build();

        Playthrough finishedOldGame = Playthrough.builder()
            .id(1L).user(owner).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .endDate(LocalDate.of(2026, 11, 10)).build();

        when(groupRepository.findBySlugIgnoreCase("backlog-club")).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(List.of(
            GroupMember.builder().id(1L).group(group).user(owner).build()));
        when(groupChallengeRepository.findByGroupIdOrderByEndsOnDesc(1L)).thenReturn(List.of(challenge));
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L))
            .thenReturn(List.of(finishedOldGame));
        // Added during the window, so it was never part of the backlog.
        when(userGameRepository.findByUserAndGame(owner, game)).thenReturn(Optional.of(
            UserGame.builder().id(1L).user(owner).game(game)
                .createdAt(Instant.parse("2026-11-05T00:00:00Z")).build()));

        GroupDto result = groupService.getGroup(owner, "backlog-club");

        assertThat(result.getChallenges().get(0).getStandings().get(0).getScore()).isZero();
    }

    @Test
    void backlogClearedCountsGamesAlreadyOwnedWhenTheWindowOpened() {
        GroupChallenge challenge = GroupChallenge.builder()
            .id(1L).group(group).name("November").metric(GroupChallenge.ChallengeMetric.BACKLOG_CLEARED)
            .target(1).startsOn(LocalDate.of(2026, 11, 1)).endsOn(LocalDate.of(2026, 11, 30))
            .build();

        Playthrough finished = Playthrough.builder()
            .id(1L).user(owner).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(true).isDropped(false).isActive(false).isPaused(false)
            .endDate(LocalDate.of(2026, 11, 10)).build();

        when(groupRepository.findBySlugIgnoreCase("backlog-club")).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(List.of(
            GroupMember.builder().id(1L).group(group).user(owner).build()));
        when(groupChallengeRepository.findByGroupIdOrderByEndsOnDesc(1L)).thenReturn(List.of(challenge));
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(finished));
        when(userGameRepository.findByUserAndGame(owner, game)).thenReturn(Optional.of(
            UserGame.builder().id(1L).user(owner).game(game)
                .createdAt(Instant.parse("2026-06-01T00:00:00Z")).build()));

        GroupDto result = groupService.getGroup(owner, "backlog-club");

        GroupDto.StandingDto standing = result.getChallenges().get(0).getStandings().get(0);
        assertThat(standing.getScore()).isEqualTo(1);
        assertThat(standing.isReachedTarget()).isTrue();
    }

    @Test
    void daysPlayedCountsDistinctDaysNotSessions() {
        // Three sessions in one evening is one day. Rewards showing up, not marathons.
        GroupChallenge challenge = GroupChallenge.builder()
            .id(1L).group(group).name("Regularity").metric(GroupChallenge.ChallengeMetric.DAYS_PLAYED)
            .target(2).startsOn(LocalDate.of(2026, 11, 1)).endsOn(LocalDate.of(2026, 11, 30))
            .build();

        Playthrough playthrough = Playthrough.builder()
            .id(1L).user(owner).game(game).playthroughType("story")
            .durationSeconds(3600L).importedDurationSeconds(0L)
            .isCompleted(false).isDropped(false).isActive(false).isPaused(false).build();

        when(groupRepository.findBySlugIgnoreCase("backlog-club")).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(List.of(
            GroupMember.builder().id(1L).group(group).user(owner).build()));
        when(groupChallengeRepository.findByGroupIdOrderByEndsOnDesc(1L)).thenReturn(List.of(challenge));
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(playthrough));
        when(sessionHistoryRepository.findSessionsStartedByUserBetween(anyLong(), any(), any()))
            .thenReturn(List.of(
                session(playthrough, 1, Instant.parse("2026-11-05T18:00:00Z")),
                session(playthrough, 2, Instant.parse("2026-11-05T20:00:00Z")),
                session(playthrough, 3, Instant.parse("2026-11-05T22:00:00Z"))));

        GroupDto result = groupService.getGroup(owner, "backlog-club");

        assertThat(result.getChallenges().get(0).getStandings().get(0).getScore()).isEqualTo(1);
    }

    private SessionHistory session(Playthrough playthrough, int number, Instant startedAt) {
        return SessionHistory.builder()
            .id((long) number).playthrough(playthrough).sessionNumber(number)
            .durationSeconds(3600L).pauseCount(0)
            .startedAt(startedAt).endedAt(startedAt.plusSeconds(3600))
            .build();
    }
}
