package com.gamewatch.service;

import com.gamewatch.entity.Follow;
import com.gamewatch.entity.User;
import com.gamewatch.entity.Visibility;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowRepository followRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FollowService followService;

    private User viewer;
    private User owner;

    @BeforeEach
    void setUp() {
        viewer = User.builder().id(1L).auth0UserId("auth0|viewer").handle("viewer")
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        owner = User.builder().id(2L).auth0UserId("auth0|owner").handle("owner")
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
    }

    @Test
    void followingAPublicProfileIsAcceptedImmediately() {
        owner.setProfileVisibility(Visibility.PUBLIC);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followRepository.findByFollowerAndFollowee(viewer, owner)).thenReturn(Optional.empty());
        when(followRepository.save(any(Follow.class))).thenAnswer(i -> i.getArgument(0));

        followService.follow(viewer, "owner");

        ArgumentCaptor<Follow> captor = ArgumentCaptor.forClass(Follow.class);
        verify(followRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(Follow.FollowStatus.ACCEPTED);
    }

    @Test
    void followingAFollowersOnlyProfileWaitsForTheOwner() {
        // This consent step is the only thing separating FOLLOWERS from PUBLIC. Without
        // it, anyone could admit themselves to a followers-only library by clicking follow.
        owner.setProfileVisibility(Visibility.FOLLOWERS);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followRepository.findByFollowerAndFollowee(viewer, owner)).thenReturn(Optional.empty());
        when(followRepository.save(any(Follow.class))).thenAnswer(i -> i.getArgument(0));

        followService.follow(viewer, "owner");

        ArgumentCaptor<Follow> captor = ArgumentCaptor.forClass(Follow.class);
        verify(followRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(Follow.FollowStatus.PENDING);
        assertThat(captor.getValue().getRespondedAt()).isNull();
    }

    @Test
    void aPrivateProfileCannotBeFollowedAndDoesNotAdmitItExists() {
        // Saying "this profile is private" would confirm the handle belongs to someone, to
        // a person who was not meant to find them. It answers exactly as if absent.
        owner.setProfileVisibility(Visibility.PRIVATE);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));

        assertThatThrownBy(() -> followService.follow(viewer, "owner"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Profile not found");

        verify(followRepository, never()).save(any());
    }

    @Test
    void followingYourselfIsRejected() {
        when(userRepository.findByHandleIgnoreCase("viewer")).thenReturn(Optional.of(viewer));

        assertThatThrownBy(() -> followService.follow(viewer, "viewer"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cannot follow yourself");
    }

    @Test
    void aPendingRequestDoesNotGrantFollowersAccess() {
        // canView must ask for accepted follows only - a pending request is someone
        // asking to be let in, not someone who has been.
        owner.setProfileVisibility(Visibility.FOLLOWERS);
        when(followRepository.isAcceptedFollower(1L, 2L)).thenReturn(false);

        assertThat(followService.canView(viewer, owner, Visibility.FOLLOWERS)).isFalse();
    }

    @Test
    void anAcceptedFollowerSeesFollowersOnlyData() {
        when(followRepository.isAcceptedFollower(1L, 2L)).thenReturn(true);

        assertThat(followService.canView(viewer, owner, Visibility.FOLLOWERS)).isTrue();
    }

    @Test
    void ownersAlwaysSeeTheirOwnDataWhateverTheSetting() {
        assertThat(followService.canView(owner, owner, Visibility.PRIVATE)).isTrue();
        verify(followRepository, never()).isAcceptedFollower(anyLong(), anyLong());
    }

    @Test
    void signedOutVisitorsSeeOnlyPublicData() {
        assertThat(followService.canView(null, owner, Visibility.PUBLIC)).isTrue();
        assertThat(followService.canView(null, owner, Visibility.FOLLOWERS)).isFalse();
        assertThat(followService.canView(null, owner, Visibility.PRIVATE)).isFalse();
    }

    @Test
    void onlyTheOwnerCanAnswerAFollowRequest() {
        // Otherwise anyone could accept a request addressed to a third party and let
        // themselves into that person's followers-only data.
        User stranger = User.builder().id(99L).auth0UserId("auth0|stranger").build();
        Follow request = Follow.builder().id(7L).follower(viewer).followee(owner)
            .status(Follow.FollowStatus.PENDING).build();

        when(followRepository.findById(7L)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> followService.respondToRequest(stranger, 7L, true))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Follow request not found");

        verify(followRepository, never()).save(any());
        verify(followRepository, never()).delete(any());
    }

    @Test
    void rejectingARequestRemovesItRatherThanLeavingItPending() {
        Follow request = Follow.builder().id(7L).follower(viewer).followee(owner)
            .status(Follow.FollowStatus.PENDING).build();
        when(followRepository.findById(7L)).thenReturn(Optional.of(request));

        followService.respondToRequest(owner, 7L, false);

        verify(followRepository).delete(request);
    }
}
