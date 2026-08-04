import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Gamepad2, SearchX, X } from 'lucide-react'
import { gamesApi } from '../services/api'
import Loading from '../components/Loading'
import { useAuthContext } from '../contexts/AuthContext'
import GameSearchAutocomplete from '../components/GameSearchAutocomplete'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import DeleteGameWarning from '../components/DeleteGameWarning'
import GameCard from '../components/GameCard'
import SearchFilterBar from '../components/SearchFilterBar'
import StyledDialog from '../components/StyledDialog'
import { useTranslation } from 'react-i18next'
import type { Game } from '../types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Column counts, not a scale factor: the cards are portrait cover tiles that simply
// fill their cell, so the size control changes how many fit per row and nothing else.
const gridClassBySize: Record<number, string> = {
  1: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8',
  2: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  3: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
}

function Games() {
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null)
  const [cardSize, setCardSize] = useState(() => {
    const saved = localStorage.getItem('gameCardSize')
    return saved ? parseInt(saved, 10) : 2
  })
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('gamesSearchQuery') || '')
  const [sortBy, setSortBy] = useState(() => {
    // The rating sorts are gone along with the fetched score they ordered by, so a
    // persisted 'rating-high'/'rating-low' would leave the Select showing no selection.
    const saved = localStorage.getItem('gamesSortBy')
    return saved && !saved.startsWith('rating-') ? saved : 'name-asc'
  })
  const [filterGenre, setFilterGenre] = useState(() => localStorage.getItem('gamesFilterGenre') || '')
  const [filterPlatform, setFilterPlatform] = useState(() => localStorage.getItem('gamesFilterPlatform') || '')
  const [filterYear, setFilterYear] = useState(() => localStorage.getItem('gamesFilterYear') || '')

  useEffect(() => {
    if (isAuthReady) {
      fetchGames()
    }
  }, [isAuthReady])

  useEffect(() => {
    localStorage.setItem('gameCardSize', cardSize.toString())
  }, [cardSize])

  useEffect(() => {
    localStorage.setItem('gamesSearchQuery', searchQuery)
    localStorage.setItem('gamesSortBy', sortBy)
    localStorage.setItem('gamesFilterGenre', filterGenre)
    localStorage.setItem('gamesFilterPlatform', filterPlatform)
    localStorage.setItem('gamesFilterYear', filterYear)
  }, [searchQuery, sortBy, filterGenre, filterPlatform, filterYear])

  const fetchGames = async () => {
    try {
      setLoading(true)
      const response = await gamesApi.getAll()
      setGames(response.data)
      setError(null)
    } catch (err: any) {
      setError(t('games.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = useCallback(async () => {
    try {
      const gameData = selectedGame
      const response = await gamesApi.create(gameData)
      setGames(prevGames => [...prevGames, response.data])
      setDialogOpen(false)
      setSelectedGame(null)
      setError(null)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data || t('games.failedToCreate')
      setError(errorMessage)
    }
  }, [selectedGame, t])

  const handleGameSelect = useCallback((game: any) => {
    const isDuplicate = games.some((g: Game) => g.externalId === game.id)
    if (isDuplicate) {
      setError(t('games.duplicateGame'))
      return
    }

    setSelectedGame({
      name: game.name,
      bannerImageUrl: game.bannerImageUrl,
      description: game.description,
      externalId: game.id,
      releaseDate: game.releaseDate,
      rating: game.rating,
      ratingsCount: game.ratingsCount,
      genres: game.genres,
      platforms: game.platforms,
      developers: game.developers,
      publishers: game.publishers,
      tags: game.tags,
      slug: game.slug,
      website: game.website,
      averageCompletionSeconds: game.averageCompletionSeconds,
      esrbRating: game.esrbRating,
      alternativeNames: game.alternativeNames,
      dominantColor1: game.dominantColor1,
      dominantColor2: game.dominantColor2,
    })
  }, [games, t])

  const handleDeleteGame = useCallback((game: Game) => {
    setGameToDelete(game)
    setDeleteModalOpen(true)
  }, [])

  const handleConfirmDeleteGame = useCallback(async () => {
    if (!gameToDelete) return

    setDeleteModalOpen(false)
    try {
      await gamesApi.delete(gameToDelete.id)
      setGames(prevGames => prevGames.filter((g: Game) => g.id !== gameToDelete.id))
      setGameToDelete(null)
    } catch (err: any) {
      setError(t('games.failedToDelete'))
      setGameToDelete(null)
    }
  }, [gameToDelete, t])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSortBy('name-asc')
    setFilterGenre('')
    setFilterPlatform('')
    setFilterYear('')
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
    setSelectedGame(null)
  }, [])

  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalOpen(false)
    setGameToDelete(null)
  }, [])

  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>()
    games.forEach((game: Game) => {
      if (game.genres) {
        game.genres.split(',').forEach((genre: string) => genresSet.add(genre.trim()))
      }
    })
    return Array.from(genresSet).sort()
  }, [games])

  const availablePlatforms = useMemo(() => {
    const platformsSet = new Set<string>()
    games.forEach((game: Game) => {
      if (game.platforms) {
        game.platforms.split(',').forEach((platform: string) => platformsSet.add(platform.trim()))
      }
    })
    return Array.from(platformsSet).sort()
  }, [games])

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>()
    games.forEach((game: Game) => {
      if (game.releaseDate) {
        const year = game.releaseDate.split('-')[0]
        yearsSet.add(year)
      }
    })
    return Array.from(yearsSet).sort().reverse()
  }, [games])

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games]

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((game: Game) => {
        if (game.name.toLowerCase().includes(query)) return true
        if (game.genres) {
          const genres = game.genres.toLowerCase().split(',').map((g: string) => g.trim())
          if (genres.some((genre: string) => genre.includes(query))) return true
        }
        if (game.developers) {
          const developers = game.developers.toLowerCase().split(',').map((d: string) => d.trim())
          if (developers.some((dev: string) => dev.includes(query))) return true
        }
        return false
      })
    }

    if (filterGenre) {
      result = result.filter((game: Game) => game.genres && game.genres.includes(filterGenre))
    }

    if (filterPlatform) {
      result = result.filter((game: Game) => game.platforms && game.platforms.includes(filterPlatform))
    }

    if (filterYear) {
      result = result.filter((game: Game) => game.releaseDate && game.releaseDate.startsWith(filterYear))
    }

    switch (sortBy) {
      case 'name-asc':
        result.sort((a: Game, b: Game) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        result.sort((a: Game, b: Game) => b.name.localeCompare(a.name))
        break
      case 'date-newest':
        result.sort((a: Game, b: Game) => {
          if (!a.releaseDate) return 1
          if (!b.releaseDate) return -1
          return b.releaseDate.localeCompare(a.releaseDate)
        })
        break
      case 'date-oldest':
        result.sort((a: Game, b: Game) => {
          if (!a.releaseDate) return 1
          if (!b.releaseDate) return -1
          return a.releaseDate.localeCompare(b.releaseDate)
        })
        break
      case 'sessions-high':
        result.sort((a: Game, b: Game) => (b.sessionCount || 0) - (a.sessionCount || 0))
        break
      case 'sessions-low':
        result.sort((a: Game, b: Game) => (a.sessionCount || 0) - (b.sessionCount || 0))
        break
      case 'playtime-high':
        result.sort((a: Game, b: Game) => (b.totalPlaytimeSeconds || 0) - (a.totalPlaytimeSeconds || 0))
        break
      case 'playtime-low':
        result.sort((a: Game, b: Game) => (a.totalPlaytimeSeconds || 0) - (b.totalPlaytimeSeconds || 0))
        break
      case 'status-active':
        result.sort((a: Game, b: Game) => {
          const order: Record<string, number> = { 'active': 0, 'started': 1, 'completed': 2, 'dropped': 3 }
          return (order[a.status || ''] ?? 4) - (order[b.status || ''] ?? 4)
        })
        break
      case 'status-completed':
        result.sort((a: Game, b: Game) => {
          const order: Record<string, number> = { 'completed': 0, 'active': 1, 'started': 2, 'dropped': 3 }
          return (order[a.status || ''] ?? 4) - (order[b.status || ''] ?? 4)
        })
        break
      default:
        break
    }

    return result
  }, [games, searchQuery, sortBy, filterGenre, filterPlatform, filterYear])

  const hasActiveFilters = useMemo(() =>
    searchQuery || filterGenre || filterPlatform || filterYear || sortBy !== 'name-asc',
    [searchQuery, filterGenre, filterPlatform, filterYear, sortBy]
  )

  const dialogActions = useMemo(() => (
    <>
      <Button onClick={handleCloseDialog} variant="outline" size="lg" className="h-12 w-full">
        {t('common.cancel')}
      </Button>
      <Button
        onClick={handleCreateGame}
        size="lg"
        className="h-12 w-full bg-success text-white hover:bg-success/90"
        disabled={!selectedGame}
      >
        {t('games.addGame')}
      </Button>
    </>
  ), [handleCloseDialog, handleCreateGame, selectedGame, t])

  if (loading) {
    return <Loading />
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-h2">{t('games.title')}</h1>
          <p className="mt-1 text-body-sm text-text-secondary">
            {filteredAndSortedGames.length} {filteredAndSortedGames.length === 1 ? t('games.game') : t('games.games')}
            {games.length !== filteredAndSortedGames.length && ` (${games.length} ${t('games.total')})`}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="h-12 w-full sm:w-auto">
          <Plus className="size-4" />
          {t('games.addGame')}
        </Button>
      </div>

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterGenre={filterGenre}
        onGenreChange={setFilterGenre}
        filterPlatform={filterPlatform}
        onPlatformChange={setFilterPlatform}
        filterYear={filterYear}
        onYearChange={setFilterYear}
        availableGenres={availableGenres}
        availablePlatforms={availablePlatforms}
        availableYears={availableYears}
        hasActiveFilters={Boolean(hasActiveFilters)}
        onClearFilters={clearFilters}
        cardSize={cardSize}
        onCardSizeChange={setCardSize}
      />

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
              <Gamepad2 className="size-8" />
            </div>
            <p className="text-h4 font-semibold text-text-primary">{t('games.noGames')}</p>
            <p className="mt-1 max-w-sm text-body-sm text-text-secondary">{t('games.noGamesDescription')}</p>
            <Button onClick={() => setDialogOpen(true)} size="lg" className="mt-6">
              <Plus className="size-4" />
              {t('games.addGame')}
            </Button>
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
        <div className={`grid gap-3 sm:gap-4 ${gridClassBySize[cardSize]}`}>
          {filteredAndSortedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onDelete={(id) => {
                const gameToDelete = games.find((g: Game) => g.id === id)
                if (gameToDelete) handleDeleteGame(gameToDelete)
              }}
              onClick={(id) => navigate(`/games/${id}/statistics`)}
            />
          ))}
        </div>
      )}

      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={t('games.addGame')}
        icon={<Gamepad2 className="size-12" />}
        iconColor="var(--color-success)"
        actions={dialogActions}
      >
        <div className="mt-1">
          <GameSearchAutocomplete onGameSelect={handleGameSelect} disabled={false} />
          {selectedGame && (
            <div className="mt-4 rounded-md border border-success/20 bg-success/8 p-5">
              <p className="mb-1 text-body-sm text-text-secondary">{t('games.selectedGame')}:</p>
              <p className="mb-1 font-bold">{selectedGame.name}</p>
              {selectedGame.genres && (
                <p className="mb-1 block text-caption text-text-secondary">{selectedGame.genres}</p>
              )}
              {selectedGame.platforms && (
                <p className="block text-caption text-text-secondary">{t('games.platforms')}: {selectedGame.platforms}</p>
              )}
            </div>
          )}
        </div>
      </StyledDialog>

      <TypedConfirmDialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteGame}
        title={t('games.deleteGame')}
        message={<DeleteGameWarning game={gameToDelete} />}
        confirmText={t('games.yesDelete')}
        requiredText={t('common.delete')}
        destructive
      />
    </div>
  )
}

export default Games
