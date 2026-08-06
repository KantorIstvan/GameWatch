import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
 * Below this, the whole list is already on screen and a filter field costs more room than
 * the scrolling it saves.
 */
const SEARCH_FROM_SIZE = 8

/**
 * Kept as whole keys rather than built from `relation`, so grepping for a string in the
 * translation file finds the place that uses it.
 */
const SEARCH_KEYS = {
  followers: {
    placeholder: 'profile.followSearch.followersPlaceholder',
    label: 'profile.followSearch.followersLabel',
  },
  following: {
    placeholder: 'profile.followSearch.followingPlaceholder',
    label: 'profile.followSearch.followingLabel',
  },
} as const

/**
 * Lowercased and stripped of accents, so "istvan" finds "István".
 *
 * Someone searching a follow list is recalling a name, not transcribing it, and making
 * them reproduce the diacritics turns a shortcut back into scrolling.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
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
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)
    // A query typed against one list means nothing against the other, and leaving it in
    // place would open the next tab already filtered by something the field no longer
    // explains. The tabs unmount their content today, so this only matters if that ever
    // changes - which is exactly when a stale filter would be hardest to explain.
    setQuery('')
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

  // Filtered here rather than by the API because the endpoint hands back the entire
  // accepted-follow list in one response - there is no paging to fall out of step with, so
  // a round trip per keystroke would buy latency and nothing else.
  const trimmedQuery = query.trim()
  const matches = useMemo(() => {
    // Keyed off the position in the unfiltered list, so the fallback identity for someone
    // who has never claimed a handle does not get handed to a different person as the
    // filter narrows.
    const rows = people.map((person, index) => ({
      person,
      key: person.handle ?? `unclaimed-${index}`,
    }))
    // A handle is worn as "@name" everywhere else in the app, so typing the @ should not
    // be what makes the search fail.
    const needle = fold(trimmedQuery.replace(/^@+/, ''))
    if (needle.length === 0) return rows
    return rows.filter(
      ({ person }) =>
        fold(person.displayName ?? '').includes(needle) ||
        fold(person.handle ?? '').includes(needle)
    )
  }, [people, trimmedQuery])

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

  const searchable = people.length >= SEARCH_FROM_SIZE

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Escape clears rather than blurs, matching what the field looks like it
              // does: there is no visible clear button to reach for instead.
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query.length > 0) {
                  e.preventDefault()
                  setQuery('')
                }
              }}
              placeholder={t(SEARCH_KEYS[relation].placeholder)}
              aria-label={t(SEARCH_KEYS[relation].label)}
              className="h-12 pl-9"
            />
          </div>
          {/* Announced rather than only shown, so filtering a list you cannot see still
              says how much of it is left. Kept mounted and empty until there is something
              to report - a live region inserted at the same moment its text arrives is
              unreliably announced, and reserving the line also stops the list below from
              jumping on the first keystroke. */}
          <p aria-live="polite" className="min-h-4 text-caption text-text-secondary">
            {trimmedQuery.length > 0
              ? t('profile.followSearch.matches', { count: matches.length })
              : null}
          </p>
        </div>
      )}

      {matches.length === 0 ? (
        // Deliberately not the "no followers yet" copy: this list has people in it, they
        // just do not answer to what was typed, and telling someone their followers are
        // gone because they mistyped a name is a different and worse message.
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Search className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">
            {t('profile.followSearch.noMatches', { query: trimmedQuery })}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map(({ person, key }) => (
            <ProfileListRow key={key} person={person} onFollowChange={handleFollowChange} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default FollowListPanel
