import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SquarePen } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProfileView from '../components/profile/ProfileView'
import EditProfileSheet from '../components/profile/EditProfileSheet'
import FollowRequestsSection from '../components/social/FollowRequestsSection'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { PublicProfile } from '../types'

/**
 * Your own profile, rendered by the same component that renders everyone else's.
 *
 * That is the point of the page: the way to decide what strangers see of you is to look at
 * what strangers see of you. A separate "preview" that only approximates the real thing
 * would drift from it within a release or two.
 */
function MyProfile() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    profilesApi
      .getMyProfile()
      .then((response) => setProfile(response.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAuthReady) return
    load()
  }, [isAuthReady, load])

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

  if (!profile) {
    return (
      <Alert variant="info">
        <AlertDescription>{t('profile.ownUnavailable')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      {/* Until a handle is claimed there is no address to share, so nobody can reach this
          profile however visible it is set to be. Worth saying plainly rather than leaving
          someone to wonder why their public profile has no visitors. */}
      {!profile.handle && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>
            <span className="flex flex-wrap items-center gap-3">
              {t('profile.claimHandlePrompt')}
              <Button size="sm" onClick={() => setEditing(true)}>
                {t('profile.claimHandleAction')}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <ProfileView
        profile={profile}
        actions={
          <Button variant="outline" onClick={() => setEditing(true)}>
            <SquarePen className="size-4" />
            {t('profile.editProfile')}
          </Button>
        }
        followersExtra={<FollowRequestsSection onAccepted={load} />}
      />

      <EditProfileSheet open={editing} onOpenChange={setEditing} onSaved={load} />
    </div>
  )
}

export default MyProfile
