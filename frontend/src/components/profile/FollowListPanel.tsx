import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import ProfileListRow from '../social/ProfileListRow'
import { profilesApi } from '../../services/api'
import type { FollowState, ProfileSummary } from '../../types'

interface FollowListPanelProps {
  handle: string
  relation: 'followers' | 'following'
  /** Copy for a list with nobody in it, which differs between your profile and someone else's. */
  emptyMessage: string
}

/**
 * The people following a profile, or the people it follows.
 *
 * Loads on mount rather than with the profile, so opening a profile does not pay for two
 * lists nobody may look at - the tabs above this are where most visits stop.
 */
function FollowListPanel({ handle, relation, emptyMessage }: FollowListPanelProps) {
  const { t } = useTranslation()
  const [people, setPeople] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)
    const request =
      relation === 'followers'
        ? profilesApi.getFollowers(handle)
        : profilesApi.getFollowing(handle)

    request
      .then((response) => {
        if (active) setPeople(response.data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [handle, relation])

  // Following someone from inside a list changes only that row - the list itself is whose
  // followers these are, which does not move because the viewer followed one of them.
  const handleFollowChange = useCallback((changed: string, next: FollowState) => {
    setPeople((current) =>
      current.map((person) =>
        person.handle === changed
          ? {
              ...person,
              viewerIsFollowing: next.following,
              viewerRequestPending: next.requestPending,
              followerCount: next.followerCount,
            }
          : person
      )
    )
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-18 rounded-xl bg-border" />
        ))}
      </div>
    )
  }

  if (failed) {
    return <p className="text-body-sm text-text-secondary">{t('profile.listUnavailable')}</p>
  }

  if (people.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
        <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {/* Falls back to the position for someone who has never claimed a handle: the list is
          static once loaded, so an index is a stable identity here. */}
      {people.map((person, index) => (
        <ProfileListRow
          key={person.handle ?? `unclaimed-${index}`}
          person={person}
          onFollowChange={handleFollowChange}
        />
      ))}
    </ul>
  )
}

export default FollowListPanel
