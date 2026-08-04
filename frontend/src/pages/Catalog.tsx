import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Library, SearchX, X } from 'lucide-react'
import { gamesApi } from '../services/api'
import Loading from '../components/Loading'
import GameCard from '../components/GameCard'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import type { Game } from '../types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const ALL = '__all__'

/**
 * The community-wide catalog: every game anyone has ever added, browsable by anyone
 * signed in - unlike Games.tsx, which only ever shows the caller's own library. This is
 * where community data (ratings, reviews, aggregate completion stats) lives; clicking a
 * tile opens CatalogGameDetail, not the personal session/timer history GameStatistics
 * shows for a library entry.
 */
function Catalog() {
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('rating-high')
  const [filterGenre, setFilterGenre] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  useEffect(() => {
    if (isAuthReady) {
      fetchCatalog()
    }
  }, [isAuthReady])

  const fetchCatalog = async () => {
    try {
      setLoading(true)
      const response = await gamesApi.getCatalog()
      setGames(response.data)
      setError(null)
    } catch (err: any) {
      setError(t('catalog.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>()
    games.forEach((game) => {
      if (game.genres) {
        game.genres.split(',').forEach((genre) => genresSet.add(genre.trim()))
      }
    })
    return Array.from(genresSet).sort()
  }, [games])

  const availablePlatforms = useMemo(() => {
    const platformsSet = new Set<string>()
    games.forEach((game) => {
      if (game.platforms) {
        game.platforms.split(',').forEach((platform) => platformsSet.add(platform.trim()))
      }
    })
    return Array.from(platformsSet).sort()
  }, [games])

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>()
    games.forEach((game) => {
      if (game.releaseDate) {
        yearsSet.add(game.releaseDate.split('-')[0])
      }
    })
    return Array.from(yearsSet).sort().reverse()
  }, [games])

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games]

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((game) => {
        if (game.name.toLowerCase().includes(query)) return true
        if (game.genres && game.genres.toLowerCase().split(',').some((g) => g.trim().includes(query))) return true
        if (game.developers && game.developers.toLowerCase().split(',').some((d) => d.trim().includes(query))) return true
        return false
      })
    }

    if (filterGenre) {
      result = result.filter((game) => game.genres?.includes(filterGenre))
    }

    if (filterPlatform) {
      result = result.filter((game) => game.platforms?.includes(filterPlatform))
    }

    if (filterYear) {
      result = result.filter((game) => game.releaseDate?.startsWith(filterYear))
    }

    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'date-newest':
        result.sort((a, b) => {
          if (!a.releaseDate) return 1
          if (!b.releaseDate) return -1
          return b.releaseDate.localeCompare(a.releaseDate)
        })
        break
      case 'date-oldest':
        result.sort((a, b) => {
          if (!a.releaseDate) return 1
          if (!b.releaseDate) return -1
          return a.releaseDate.localeCompare(b.releaseDate)
        })
        break
      case 'rating-high':
        result.sort((a, b) => (b.communityRatingScore ?? -1) - (a.communityRatingScore ?? -1))
        break
      case 'rating-count':
        result.sort((a, b) => (b.communityRatingCount ?? 0) - (a.communityRatingCount ?? 0))
        break
      default:
        break
    }

    return result
  }, [games, searchQuery, sortBy, filterGenre, filterPlatform, filterYear])

  const hasActiveFilters = Boolean(
    searchQuery || filterGenre || filterPlatform || filterYear || sortBy !== 'rating-high'
  )

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSortBy('rating-high')
    setFilterGenre('')
    setFilterPlatform('')
    setFilterYear('')
  }, [])

  if (loading) {
    return <Loading />
  }

  const filterFields = (
    <>
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="h-12 w-full sm:h-9 sm:w-45">
          <SelectValue placeholder={t('catalog.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rating-high">{t('catalog.sortRatingHigh')}</SelectItem>
          <SelectItem value="rating-count">{t('catalog.sortRatingCount')}</SelectItem>
          <SelectItem value="name-asc">{t('games.sortNameAsc')}</SelectItem>
          <SelectItem value="name-desc">{t('games.sortNameDesc')}</SelectItem>
          <SelectItem value="date-newest">{t('games.sortNewest')}</SelectItem>
          <SelectItem value="date-oldest">{t('games.sortOldest')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filterGenre || ALL} onValueChange={(v) => setFilterGenre(v === ALL ? '' : v)}>
        <SelectTrigger className="h-12 w-full sm:h-9 sm:w-37.5">
          <SelectValue placeholder={t('games.genre')} />
        </SelectTrigger>
        <SelectContent className="max-h-75">
          <SelectItem value={ALL}>{t('games.allGenres')}</SelectItem>
          {availableGenres.map((genre) => (
            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterPlatform || ALL} onValueChange={(v) => setFilterPlatform(v === ALL ? '' : v)}>
        <SelectTrigger className="h-12 w-full sm:h-9 sm:w-37.5">
          <SelectValue placeholder={t('games.platform')} />
        </SelectTrigger>
        <SelectContent className="max-h-75">
          <SelectItem value={ALL}>{t('games.allPlatforms')}</SelectItem>
          {availablePlatforms.map((platform) => (
            <SelectItem key={platform} value={platform}>{platform}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterYear || ALL} onValueChange={(v) => setFilterYear(v === ALL ? '' : v)}>
        <SelectTrigger className="h-12 w-full sm:h-9 sm:w-30">
          <SelectValue placeholder={t('games.year')} />
        </SelectTrigger>
        <SelectContent className="max-h-75">
          <SelectItem value={ALL}>{t('games.allYears')}</SelectItem>
          {availableYears.map((year) => (
            <SelectItem key={year} value={year}>{year}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="w-full max-w-full">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-h2">{t('catalog.title')}</h1>
          <p className="mt-1 text-body-sm text-text-secondary">
            {filteredAndSortedGames.length} {filteredAndSortedGames.length === 1 ? t('games.game') : t('games.games')}
            {games.length !== filteredAndSortedGames.length && ` (${games.length} ${t('games.total')})`}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('catalog.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 bg-surface pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative h-12 w-12 shrink-0 sm:hidden"
          onClick={() => setFilterSheetOpen(true)}
          aria-label={t('games.filters')}
        >
          <SlidersHorizontal className="size-4.5" />
          {hasActiveFilters && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="mb-6 hidden flex-wrap items-center gap-4 sm:flex">
        {filterFields}
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} className="sm:ml-auto">
            {t('games.clearFilters')}
          </Button>
        )}
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="sm:hidden">
          <SheetHeader>
            <SheetTitle>{t('games.filters')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-2">{filterFields}</div>
          <SheetFooter className="flex-row gap-3">
            <Button variant="outline" className="h-12 flex-1" onClick={clearFilters} disabled={!hasActiveFilters}>
              {t('games.clearFilters')}
            </Button>
            <Button className="h-12 flex-1" onClick={() => setFilterSheetOpen(false)}>
              {t('games.showResults')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <div className="flex w-full items-center justify-between gap-2">
              <span>{error}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setError(null)}>
                <X className="size-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {filteredAndSortedGames.length === 0 ? (
        games.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-16 text-center sm:mt-12">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-accent-subtle text-accent">
              <Library className="size-8" />
            </div>
            <p className="text-h4 font-semibold text-text-primary">{t('catalog.noGames')}</p>
            <p className="mt-1 max-w-sm text-body-sm text-text-secondary">{t('catalog.noGamesDescription')}</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-16 text-center sm:mt-12">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface text-text-secondary">
              <SearchX className="size-8" />
            </div>
            <p className="text-h4 font-semibold text-text-primary">{t('games.noMatchingGames')}</p>
            <p className="mt-1 max-w-sm text-body-sm text-text-secondary">{t('games.noMatchingGamesDescription')}</p>
            <Button variant="outline" onClick={clearFilters} className="mt-6">
              {t('games.clearFilters')}
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredAndSortedGames.map((game) => (
            <GameCard key={game.id} game={game} onClick={(id) => navigate(`/catalog/${id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Catalog
