import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ProfileListRow from '../components/social/ProfileListRow'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { rememberPersonSearch, useRecentPeopleSearches } from '../hooks/useRecentPeopleSearches'
import type { FollowState, ProfileSummary } from '../types'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

/**
 * Find other users by handle or display name, and follow them from the results.
 *
 * Search is debounced client-side; the backend already refuses anything under two
 * characters, so results before that point would be empty anyway.
 */
function People() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProfileSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { people: recentPeople, forget: forgetRecent, clear: clearRecent } = useRecentPeopleSearches()

  useEffect(() => {
    if (!isAuthReady) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([])
      setLoading(false)
      setSearched(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      profilesApi
        .search(trimmed)
        .then((response) => setResults(response.data))
        .catch(() => setResults([]))
        .finally(() => {
          setLoading(false)
          setSearched(true)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isAuthReady])

  const handleFollowChange = useCallback((handle: string, next: FollowState) => {
    setResults((current) =>
      current.map((result) =>
        result.handle === handle
          ? {
              ...result,
              viewerIsFollowing: next.following,
              viewerRequestPending: next.requestPending,
              followerCount: next.followerCount,
            }
          : result
      )
    )
  }, [])

  // An unclaimed account has no handle and so nowhere to revisit it - it can turn up in
  // results but can't be remembered as a shortcut.
  const handleSelect = useCallback((person: Pick<ProfileSummary, 'handle' | 'displayName' | 'profilePictureUrl'>) => {
    if (!person.handle) return
    rememberPersonSearch({
      handle: person.handle,
      displayName: person.displayName,
      profilePictureUrl: person.profilePictureUrl,
    })
  }, [])

  const trimmedQuery = query.trim()

  return (
    <div>
      <h1 className="mb-2 text-h2 font-bold">{t('people.title')}</h1>
      <p className="mb-6 text-body-sm text-text-secondary">{t('people.subtitle')}</p>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('people.searchPlaceholder')}
          aria-label={t('people.searchPlaceholder')}
          className="pl-9"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 bg-border" />
          ))}
        </div>
      )}

      {/* Only with an empty box: once someone is searching, the results are the answer and
          who they looked up yesterday is in the way of it. Falls back to the static prompt
          until there's any history to show. */}
      {!loading && trimmedQuery.length === 0 && recentPeople.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-body font-semibold text-text-primary">{t('people.recent.title')}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecent}
              className="text-text-secondary hover:text-accent"
            >
              {t('people.recent.clearAll')}
            </Button>
          </div>
          <ul className="flex flex-col gap-3">
            {recentPeople.map((person) => (
              <ProfileListRow
                key={person.handle}
                person={person}
                onSelect={handleSelect}
                onRemove={forgetRecent}
                removeLabel={t('people.recent.remove', { person: person.displayName ?? person.handle })}
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && trimmedQuery.length === 0 && recentPeople.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Search className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">{t('people.prompt')}</p>
        </div>
      )}

      {!loading && trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH && (
        <p className="text-body-sm text-text-secondary">{t('people.typeMore')}</p>
      )}

      {!loading && searched && trimmedQuery.length >= MIN_QUERY_LENGTH && results.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">
            {t('people.noResults', { query: trimmedQuery })}
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((result, index) => (
            <ProfileListRow
              key={result.handle ?? `unclaimed-${index}`}
              person={result}
              onFollowChange={handleFollowChange}
              onSelect={handleSelect}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default People
