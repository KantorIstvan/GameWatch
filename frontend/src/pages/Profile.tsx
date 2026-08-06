import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GitCompare, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import ProfileView from '../components/profile/ProfileView'
import FollowButton from '../components/social/FollowButton'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { PublicProfile, FollowState } from '../types'

/**
 * Someone else's profile.
 *
 * A profile the viewer may not see comes back from the API as "not found", and this page
 * renders that as not found too - distinguishing the two here would give away exactly what
 * the backend is careful not to say.
 */
function Profile() {
  const { handle } = useParams<{ handle: string }>()
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isAuthReady || !handle) return

    setLoading(true)
    setNotFound(false)
    profilesApi
      .getProfile(handle)
      .then((response) => setProfile(response.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [handle, isAuthReady])

  const handleFollowChange = useCallback((next: FollowState) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            viewerIsFollowing: next.following,
            viewerRequestPending: next.requestPending,
            followerCount: next.followerCount,
          }
        : current
    )
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-30 w-full bg-border" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 bg-border" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <Alert variant="info">
        <AlertDescription>{t('profile.notFound')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ProfileView
      profile={profile}
      actions={
        profile.ownProfile ? (
          // Reachable by searching yourself up or following a link back to your own handle.
          // Sending it to the real profile page is better than offering nothing at all.
          <Button asChild variant="outline">
            <Link to="/profile">
              <SquarePen className="size-4" />
              {t('profile.editProfile')}
            </Link>
          </Button>
        ) : (
          <>
            {/* Only offered when the library is actually visible - the comparison is gated
                on the same thing, so linking to it otherwise would dead-end. */}
            {profile.library && (
              <Button asChild variant="outline">
                <Link to={`/u/${profile.handle}/compare`}>
                  <GitCompare className="size-4" />
                  {t('compare.compareWith')}
                </Link>
              </Button>
            )}
            <FollowButton
              state={{
                handle: profile.handle,
                following: profile.viewerIsFollowing,
                requestPending: profile.viewerRequestPending,
                followerCount: profile.followerCount,
                followingCount: profile.followingCount,
              }}
              onChange={handleFollowChange}
            />
          </>
        )
      }
    />
  )
}

export default Profile
