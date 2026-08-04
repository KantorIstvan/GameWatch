import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import FollowButton from '../components/social/FollowButton'
import { profilesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { FollowState, ProfileSearchResult } from '../types'

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
  const [results, setResults] = useState<ProfileSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      {!loading && trimmedQuery.length === 0 && (
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
          {results.map((result) => (
            <li
              key={result.handle}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl sm:p-4"
            >
              <Link to={`/u/${result.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="size-11 shrink-0">
                  <AvatarImage src={result.profilePictureUrl ?? undefined} alt="" />
                  <AvatarFallback>{result.handle.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium text-text-primary">
                    {result.displayName ?? result.handle}
                  </span>
                  <span className="block truncate text-caption text-text-secondary">
                    @{result.handle} · {t('profile.followers', { count: result.followerCount })}
                  </span>
                </span>
              </Link>

              <FollowButton
                state={{
                  handle: result.handle,
                  following: result.viewerIsFollowing,
                  requestPending: result.viewerRequestPending,
                  followerCount: result.followerCount,
                  followingCount: result.followingCount,
                }}
                onChange={(next) => handleFollowChange(result.handle, next)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default People
