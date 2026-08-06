import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Lock, SearchX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MultiSelectFilter from '../MultiSelectFilter'
import GameEntryRow from './GameEntryRow'
import { profilesApi } from '../../services/api'
import { splitCommaList } from '../../utils/formatters'
import type { GameRatingEntry } from '../../types'

interface RatingsListPanelProps {
  handle: string
}

type SortKey =
  | 'ratedAt-desc'
  | 'ratedAt-asc'
  | 'score-desc'
  | 'score-asc'
  | 'releaseDate-desc'
  | 'releaseDate-asc'
  | 'title-asc'
  | 'title-desc'

interface FilterState {
  developers: Set<string>
  publishers: Set<string>
  genres: Set<string>
}

const EMPTY_FILTERS: FilterState = { developers: new Set(), publishers: new Set(), genres: new Set() }

/** The date this row actually sorts and displays by - the review's date once one exists. */
function effectiveRatedAt(entry: GameRatingEntry): number {
  const date = entry.reviewBody ? entry.reviewCreatedAt : entry.ratedAt
  return date ? new Date(date).getTime() : 0
}

/**
 * Every game a profile owner has rated, and the score they gave it - plus what they wrote
 * and when, for the games that also got a written review. Filterable by developer,
 * publisher and genre, and sortable by date rated, score, release date or title.
 *
 * Loads on mount rather than with the profile, matching {@link FollowListPanel} - opening a
 * profile should not pay for a list nobody may look at, since the tabs above this are where
 * most visits stop. Gated behind library visibility server-side: a `null` response means the
 * viewer may not see it, not that nothing has been rated, and renders the same "not shared"
 * message the Overview tab shows for the rest of the library.
 *
 * Filtering and sorting both happen client-side: this endpoint returns the whole list in one
 * response (no page/limit parameters), so the full dataset a filter would need is already on
 * the client the moment the list loads - doing it server-side would only add a round trip per
 * change with no correctness benefit. That stops being true the moment this list grows a
 * server-side page size, at which point filtering has to move into the request instead.
 */
function RatingsListPanel({ handle }: RatingsListPanelProps) {
  const { t } = useTranslation()
  const [ratings, setRatings] = useState<GameRatingEntry[] | null>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>('ratedAt-desc')

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)
    setFilters(EMPTY_FILTERS)
    setSort('ratedAt-desc')
    profilesApi
      .getRatings(handle)
      .then((response) => {
        if (active) setRatings(response.data)
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
  }, [handle])

  const options = useMemo(() => {
    const developers = new Set<string>()
    const publishers = new Set<string>()
    const genres = new Set<string>()
    for (const entry of ratings ?? []) {
      splitCommaList(entry.developers).forEach((name) => developers.add(name))
      splitCommaList(entry.publishers).forEach((name) => publishers.add(name))
      splitCommaList(entry.genres).forEach((name) => genres.add(name))
    }
    const sortAlpha = (values: Set<string>) => Array.from(values).sort((a, b) => a.localeCompare(b))
    return {
      developers: sortAlpha(developers),
      publishers: sortAlpha(publishers),
      genres: sortAlpha(genres),
    }
  }, [ratings])

  const hasActiveFilters =
    filters.developers.size > 0 || filters.publishers.size > 0 || filters.genres.size > 0

  const visible = useMemo(() => {
    if (!ratings) return []

    const filtered = ratings.filter((entry) => {
      if (filters.developers.size > 0) {
        const names = splitCommaList(entry.developers)
        if (!names.some((name) => filters.developers.has(name))) return false
      }
      if (filters.publishers.size > 0) {
        const names = splitCommaList(entry.publishers)
        if (!names.some((name) => filters.publishers.has(name))) return false
      }
      if (filters.genres.size > 0) {
        const names = splitCommaList(entry.genres)
        if (!names.some((name) => filters.genres.has(name))) return false
      }
      return true
    })

    const [field, direction] = sort.split('-') as [string, 'asc' | 'desc']
    const dir = direction === 'asc' ? 1 : -1

    return [...filtered].sort((a, b) => {
      switch (field) {
        case 'score':
          return (a.score - b.score) * dir
        case 'releaseDate':
          return (
            (new Date(a.releaseDate ?? 0).getTime() - new Date(b.releaseDate ?? 0).getTime()) * dir
          )
        case 'title':
          return a.gameName.localeCompare(b.gameName) * dir
        case 'ratedAt':
        default:
          return (effectiveRatedAt(a) - effectiveRatedAt(b)) * dir
      }
    })
  }, [ratings, filters, sort])

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const addDeveloperFilter = (name: string) =>
    setFilters((current) => ({ ...current, developers: new Set(current.developers).add(name) }))
  const addPublisherFilter = (name: string) =>
    setFilters((current) => ({ ...current, publishers: new Set(current.publishers).add(name) }))

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-18 bg-border" />
        ))}
      </div>
    )
  }

  if (failed) {
    return <p className="text-body-sm text-text-secondary">{t('profile.listUnavailable')}</p>
  }

  if (ratings === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <Lock className="size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{t('profile.libraryHidden')}</p>
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
        <Star className="mt-0.5 size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{t('profile.noRatings')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MultiSelectFilter
          label={t('profile.filters.developer')}
          options={options.developers}
          selected={filters.developers}
          onChange={(next) => setFilters((current) => ({ ...current, developers: next }))}
          searchPlaceholder={t('profile.filters.searchDevelopers')}
          emptyMessage={t('profile.filters.noMatches')}
        />
        <MultiSelectFilter
          label={t('profile.filters.publisher')}
          options={options.publishers}
          selected={filters.publishers}
          onChange={(next) => setFilters((current) => ({ ...current, publishers: next }))}
          searchPlaceholder={t('profile.filters.searchPublishers')}
          emptyMessage={t('profile.filters.noMatches')}
        />
        <MultiSelectFilter
          label={t('profile.filters.genre')}
          options={options.genres}
          selected={filters.genres}
          onChange={(next) => setFilters((current) => ({ ...current, genres: next }))}
          searchPlaceholder={t('profile.filters.searchGenres')}
          emptyMessage={t('profile.filters.noMatches')}
        />

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="h-9 w-auto min-w-40" aria-label={t('profile.filters.sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ratedAt-desc">{t('profile.filters.sortRatedDesc')}</SelectItem>
            <SelectItem value="ratedAt-asc">{t('profile.filters.sortRatedAsc')}</SelectItem>
            <SelectItem value="score-desc">{t('profile.filters.sortScoreDesc')}</SelectItem>
            <SelectItem value="score-asc">{t('profile.filters.sortScoreAsc')}</SelectItem>
            <SelectItem value="releaseDate-desc">{t('profile.filters.sortReleaseDesc')}</SelectItem>
            <SelectItem value="releaseDate-asc">{t('profile.filters.sortReleaseAsc')}</SelectItem>
            <SelectItem value="title-asc">{t('profile.filters.sortTitleAsc')}</SelectItem>
            <SelectItem value="title-desc">{t('profile.filters.sortTitleDesc')}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} className="text-text-secondary">
            {t('profile.filters.clearAll')}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <SearchX className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-body-sm text-text-secondary">{t('profile.filters.noResults')}</p>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t('profile.filters.clearAll')}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((entry, index) => (
            <GameEntryRow
              key={entry.gameId}
              index={index + 1}
              entry={entry}
              onDeveloperSelect={addDeveloperFilter}
              onPublisherSelect={addPublisherFilter}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default RatingsListPanel
