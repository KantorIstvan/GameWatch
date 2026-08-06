import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Gamepad2, Search, SearchX } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import RecentCatalogGames from '../components/catalog/RecentCatalogGames'
import { gamesApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { GameSearchResult } from '../types'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300
const RESULT_LIMIT = 30

/**
 * Look up any game that exists, the way IMDb or Letterboxd let you look up any film -
 * whether or not anyone here has ever played it.
 *
 * This is a search engine over IGDB, not a browsable view of this app's own rows, which is
 * what separates it from Games.tsx (the caller's library). Results stay text-forward rather
 * than becoming a grid of covers: this page answers "which game do you mean", and a name
 * with its year and developer answers that faster than artwork does. Each row does carry a
 * small, fixed-size cover thumbnail next to the title - just enough to recognise a game by
 * sight, not a big enough cover to turn the list into a browsable gallery.
 */
function Catalog() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameSearchResult[]>([])
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
      gamesApi
        .search(trimmed, RESULT_LIMIT)
        .then((response) => setResults(response.data ?? []))
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

  const trimmedQuery = query.trim()

  return (
    <div>
      <h1 className="mb-2 text-h2 font-bold">{t('catalog.title')}</h1>
      <p className="mb-6 text-body-sm text-text-secondary">{t('catalog.subtitle')}</p>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          aria-label={t('catalog.searchPlaceholder')}
          className="h-12 pl-9"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-18 bg-border" />
          ))}
        </div>
      )}

      {/* Only with an empty box: once someone is searching, the results are the answer and
          what they looked at yesterday is in the way of it. */}
      {!loading && trimmedQuery.length === 0 && <RecentCatalogGames />}

      {!loading && trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH && (
        <p className="text-body-sm text-text-secondary">{t('catalog.typeMore')}</p>
      )}

      {!loading && searched && trimmedQuery.length >= MIN_QUERY_LENGTH && results.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <SearchX className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <p className="text-body-sm text-text-secondary">
            {t('catalog.noResults', { query: trimmedQuery })}
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((result) => (
            <li key={result.id}>
              <Link
                to={`/catalog/${result.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-4 outline-none backdrop-blur-xl transition-colors duration-150 ease-standard hover:border-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Avatar className="size-12 shrink-0 rounded-sm">
                  <AvatarImage
                    src={result.bannerImageUrl}
                    alt=""
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-sm bg-surface-raised text-text-tertiary">
                    <Gamepad2 className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-body font-medium text-text-primary">
                    {result.name}
                    {result.releaseDate && (
                      <span className="text-body-sm font-normal text-text-secondary">
                        {result.releaseDate.split('-')[0]}
                      </span>
                    )}
                  </p>
                  {/* One line of the things that tell two similarly named games apart. */}
                  {(result.developers || result.genres || result.platforms) && (
                    <p className="mt-1 truncate text-caption text-text-secondary">
                      {[result.developers, result.genres, result.platforms]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Catalog
