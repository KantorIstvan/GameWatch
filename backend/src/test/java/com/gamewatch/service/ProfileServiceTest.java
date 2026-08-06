package com.gamewatch.service;

import com.gamewatch.dto.PublicProfileDto;
import com.gamewatch.dto.WishlistEntryDto;
import com.gamewatch.entity.Follow;
import com.gamewatch.entity.User;
import com.gamewatch.entity.Visibility;
import com.gamewatch.repository.FollowRepository;
import com.gamewatch.repository.PlaythroughRepository;
import com.gamewatch.repository.UserGameRepository;
import com.gamewatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlaythroughRepository playthroughRepository;

    @Mock
    private UserGameRepository userGameRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private FollowService followService;

    @Mock
    private WishlistService wishlistService;

    @InjectMocks
    private ProfileService profileService;

    private User viewer;
    private User owner;

    @BeforeEach
    void setUp() {
        viewer = User.builder().id(1L).auth0UserId("auth0|viewer").handle("viewer")
            .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        owner = User.builder().id(2L).auth0UserId("auth0|owner").handle("owner")
            .displayName("The Owner").timezone("UTC")
            .createdAt(Instant.parse("2026-02-01T00:00:00Z"))
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        // Both default to PRIVATE (see User.wishlistVisibility) and most tests here are not
        // about the wishlist at all, so it is stubbed once, leniently, rather than in every
        // test that happens to reach getProfile/getOwnProfile.
        lenient().when(wishlistService.getWishlist(any())).thenReturn(List.of());
    }

    @Test
    void aProfileTheViewerMayNotSeeIsReportedAsAbsentRatherThanForbidden() {
        // "You are not allowed to see this" confirms the handle belongs to someone, which
        // is exactly what a private profile is trying not to do.
        owner.setProfileVisibility(Visibility.PRIVATE);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PRIVATE)).thenReturn(false);

        assertThatThrownBy(() -> profileService.getProfile(viewer, "owner"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Profile not found");
    }

    @Test
    void anUnknownHandleFailsIdenticallyToAHiddenOne() {
        when(userRepository.findByHandleIgnoreCase("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> profileService.getProfile(viewer, "nobody"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Profile not found");
    }

    @Test
    void aVisibleProfileWithAHiddenLibraryOmitsTheLibraryEntirely() {
        // Null rather than zeros: an empty block is indistinguishable from a genuinely
        // empty library, which misleads the viewer and hints a hidden one exists.
        owner.setLibraryVisibility(Visibility.FOLLOWERS);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PUBLIC)).thenReturn(true);
        when(followService.canView(viewer, owner, Visibility.FOLLOWERS)).thenReturn(false);
        lenient().when(followRepository.findByFollowerAndFollowee(any(), any())).thenReturn(Optional.empty());

        PublicProfileDto profile = profileService.getProfile(viewer, "owner");

        assertThat(profile.getHandle()).isEqualTo("owner");
        assertThat(profile.getLibrary()).isNull();
    }

    @Test
    void aVisibleProfileWithAHiddenWishlistOmitsItEntirely() {
        // Same reasoning as the library: null rather than an empty list, so "not shared"
        // stays distinguishable from "shared, but empty".
        owner.setWishlistVisibility(Visibility.FOLLOWERS);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PUBLIC)).thenReturn(true);
        when(followService.canView(viewer, owner, Visibility.FOLLOWERS)).thenReturn(false);
        lenient().when(followRepository.findByFollowerAndFollowee(any(), any())).thenReturn(Optional.empty());

        PublicProfileDto profile = profileService.getProfile(viewer, "owner");

        assertThat(profile.getWishlist()).isNull();
    }

    @Test
    void aVisibleWishlistIsPopulatedFromWishlistService() {
        owner.setWishlistVisibility(Visibility.PUBLIC);
        WishlistEntryDto entry = WishlistEntryDto.builder().gameId(9L).gameName("Wanted Game").build();
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PUBLIC)).thenReturn(true);
        when(wishlistService.getWishlist(owner)).thenReturn(List.of(entry));
        lenient().when(followRepository.findByFollowerAndFollowee(any(), any())).thenReturn(Optional.empty());

        PublicProfileDto profile = profileService.getProfile(viewer, "owner");

        assertThat(profile.getWishlist()).containsExactly(entry);
    }

    @Test
    void ownersSeeTheirOwnProfileWhateverTheVisibility() {
        owner.setProfileVisibility(Visibility.PRIVATE);
        owner.setLibraryVisibility(Visibility.PRIVATE);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(owner, owner, Visibility.PRIVATE)).thenReturn(true);
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
        when(userGameRepository.findGamesByUser(owner)).thenReturn(List.of());

        PublicProfileDto profile = profileService.getProfile(owner, "owner");

        assertThat(profile.isOwnProfile()).isTrue();
        assertThat(profile.getLibrary()).isNotNull();
    }

    @Test
    void searchNeverReturnsProfilesTheViewerCouldNotOpen() {
        // Otherwise search becomes a way to enumerate accounts that have deliberately
        // hidden themselves.
        User hidden = User.builder().id(3L).auth0UserId("auth0|hidden").handle("hidden")
            .profileVisibility(Visibility.PRIVATE).libraryVisibility(Visibility.PRIVATE).build();
        User followersOnly = User.builder().id(4L).auth0UserId("auth0|fo").handle("followersonly")
            .profileVisibility(Visibility.FOLLOWERS).libraryVisibility(Visibility.FOLLOWERS).build();

        when(userRepository.searchByHandleOrDisplayName("own"))
            .thenReturn(List.of(owner, hidden, followersOnly));
        when(followService.canView(viewer, owner, Visibility.PUBLIC)).thenReturn(true);
        when(followService.canView(viewer, followersOnly, Visibility.FOLLOWERS)).thenReturn(false);

        List<PublicProfileDto> results = profileService.search(viewer, " OWN ");

        assertThat(results).extracting(PublicProfileDto::getHandle).containsExactly("owner");
    }

    @Test
    void searchIgnoresQueriesTooShortToBeMeaningful() {
        assertThat(profileService.search(viewer, "a")).isEmpty();
        assertThat(profileService.search(viewer, " ")).isEmpty();
        assertThat(profileService.search(viewer, null)).isEmpty();
    }

    @Test
    void aFollowerListIsAsHiddenAsTheProfileItBelongsTo() {
        // A private account's follower list is the list of people it has let in. Handing
        // that to anyone who knows the handle gives away exactly what it is set to hide.
        owner.setProfileVisibility(Visibility.PRIVATE);
        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PRIVATE)).thenReturn(false);

        assertThatThrownBy(() -> profileService.getFollowers(viewer, "owner"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Profile not found");
    }

    @Test
    void aFollowerRowCarriesTheViewersOwnRelationshipToThatPerson() {
        // Otherwise every follow button in the list starts on "Follow", including for the
        // people the viewer already follows.
        User follower = User.builder().id(5L).auth0UserId("auth0|f").handle("afollower")
            .profileVisibility(Visibility.PUBLIC).libraryVisibility(Visibility.PUBLIC).build();
        Follow edge = Follow.builder().id(9L).follower(follower).followee(owner)
            .status(Follow.FollowStatus.ACCEPTED).build();

        when(userRepository.findByHandleIgnoreCase("owner")).thenReturn(Optional.of(owner));
        when(followService.canView(viewer, owner, Visibility.PUBLIC)).thenReturn(true);
        when(followRepository.findAcceptedFollowers(2L)).thenReturn(List.of(edge));
        when(followRepository.isAcceptedFollower(1L, 5L)).thenReturn(true);

        List<PublicProfileDto> followers = profileService.getFollowers(viewer, "owner");

        assertThat(followers).extracting(PublicProfileDto::getHandle).containsExactly("afollower");
        assertThat(followers.get(0).isViewerIsFollowing()).isTrue();
    }

    @Test
    void yourOwnProfileLoadsWithoutAHandleToLookYourselfUpBy() {
        // The own-profile page is where an unclaimed handle gets claimed, so it has to
        // render before there is one.
        viewer.setHandle(null);
        viewer.setTimezone("UTC");
        when(playthroughRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(userGameRepository.findGamesByUser(viewer)).thenReturn(List.of());

        PublicProfileDto profile = profileService.getOwnProfile(viewer);

        assertThat(profile.getHandle()).isNull();
        assertThat(profile.isOwnProfile()).isTrue();
        assertThat(profile.getLibrary()).isNotNull();
    }
}
