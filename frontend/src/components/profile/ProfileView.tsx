import { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileIdentity from './ProfileIdentity'
import ProfileLibrarySummary from './ProfileLibrarySummary'
import ProfileWishlistSummary from './ProfileWishlistSummary'
import FollowListPanel from './FollowListPanel'
import type { PublicProfile } from '../../types'

type ProfileTab = 'overview' | 'wishlist' | 'followers' | 'following'

interface ProfileViewProps {
  profile: PublicProfile
  /** Follow and compare on someone else's profile, edit on your own. */
  actions?: ReactNode
  /** Pending follow requests, which only ever appear on your own profile. */
  followersExtra?: ReactNode
}

/**
 * A profile, whoever is looking at it.
 *
 * One component for both your own profile and everyone else's, so what you see of yourself
 * is literally what other people see - which is the whole point of a page you go to in order
 * to decide what to share. Only the actions in the header differ.
 */
function ProfileView({ profile, actions, followersExtra }: ProfileViewProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ProfileTab>('overview')

  return (
    <div>
      <ProfileIdentity
        profile={profile}
        actions={actions}
        onShowFollowers={() => setTab('followers')}
        onShowFollowing={() => setTab('following')}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="overview" className="min-h-11 px-3 sm:px-4">
            {t('profile.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="min-h-11 px-3 sm:px-4">
            {t('profile.tabs.wishlist')}
          </TabsTrigger>
          <TabsTrigger value="followers" className="min-h-11 px-3 sm:px-4" disabled={!profile.handle}>
            {t('profile.tabs.followers')}
          </TabsTrigger>
          <TabsTrigger value="following" className="min-h-11 px-3 sm:px-4" disabled={!profile.handle}>
            {t('profile.tabs.following')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProfileLibrarySummary
            library={profile.library}
            hiddenMessage={t('profile.libraryHidden')}
          />
        </TabsContent>

        <TabsContent value="wishlist">
          <ProfileWishlistSummary
            wishlist={profile.wishlist}
            hiddenMessage={t('profile.wishlistHidden')}
          />
        </TabsContent>

        {/* Both lists need a handle to fetch by, and an unclaimed profile has none - the
            triggers above are disabled in that case, so neither can be reached. */}
        {profile.handle && (
          <>
            <TabsContent value="followers">
              {followersExtra}
              <FollowListPanel
                handle={profile.handle}
                relation="followers"
                emptyMessage={t('profile.noFollowers')}
              />
            </TabsContent>

            <TabsContent value="following">
              <FollowListPanel
                handle={profile.handle}
                relation="following"
                emptyMessage={t('profile.notFollowingAnyone')}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}

export default ProfileView
