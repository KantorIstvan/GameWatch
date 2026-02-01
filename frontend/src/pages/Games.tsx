import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Grid, Alert, alpha } from '@mui/material'
import { Add, VideogameAsset } from '@mui/icons-material'
import { gamesApi } from '../services/api'
import Loading from '../components/Loading'
import { useAuthContext } from '../contexts/AuthContext'
import GameSearchAutocomplete from '../components/GameSearchAutocomplete'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import GameCard from '../components/GameCard'
import SearchFilterBar from '../components/SearchFilterBar'
import StyledDialog from '../components/StyledDialog'
import { useTranslation } from 'react-i18next'
import type { Game } from '../types'

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
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('gamesSortBy') || 'name-asc')
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
      setError('Failed to load games. Please try again.')
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
      const errorMessage = err.response?.data?.message || err.response?.data || 'Failed to create game. Please try again.'
      setError(errorMessage)
    }
  }, [selectedGame])

  const handleGameSelect = useCallback((game: any) => {
    const isDuplicate = games.some((g: Game) => g.externalId === game.id)
    if (isDuplicate) {
      setError('This game is already in your library!')
      return
    }
    
    setSelectedGame({
      name: game.name,
      bannerImageUrl: game.bannerImageUrl,
      description: game.description,
      externalId: game.id,
      releaseDate: game.releaseDate,
      rating: game.rating,
      ratingTop: game.ratingTop,
      ratingsCount: game.ratingsCount,
      genres: game.genres,
      platforms: game.platforms,
      developers: game.developers,
      publishers: game.publishers,
      tags: game.tags,
      nameOriginal: game.nameOriginal,
      slug: game.slug,
      tba: game.tba,
      updated: game.updated,
      website: game.website,
      metacritic: game.metacritic,
      metacriticUrl: game.metacriticUrl,
      backgroundImageAdditional: game.backgroundImageAdditional,
      playtime: game.playtime,
      screenshotsCount: game.screenshotsCount,
      moviesCount: game.moviesCount,
      creatorsCount: game.creatorsCount,
      achievementsCount: game.achievementsCount,
      parentAchievementsCount: game.parentAchievementsCount,
      redditUrl: game.redditUrl,
      redditName: game.redditName,
      redditDescription: game.redditDescription,
      redditLogo: game.redditLogo,
      redditCount: game.redditCount,
      twitchCount: game.twitchCount,
      youtubeCount: game.youtubeCount,
      added: game.added,
      reviewsTextCount: game.reviewsTextCount,
      suggestionsCount: game.suggestionsCount,
      parentsCount: game.parentsCount,
      additionsCount: game.additionsCount,
      gameSeriesCount: game.gameSeriesCount,
      esrbRating: game.esrbRating,
      alternativeNames: game.alternativeNames,
      dominantColor1: game.dominantColor1,
      dominantColor2: game.dominantColor2,
    })
  }, [games])

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
      setError('Failed to delete game. Please try again.')
      setGameToDelete(null)
    }
  }, [gameToDelete])

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
      case 'rating-high':
        result.sort((a: Game, b: Game) => (b.rating || 0) - (a.rating || 0))
        break
      case 'rating-low':
        result.sort((a: Game, b: Game) => (a.rating || 0) - (b.rating || 0))
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

  const getGridBreakpoints = useCallback(() => {
    switch(cardSize) {
      case 1:
        return { xs: 6, sm: 4, md: 3, lg: 2.4, xl: 1.71 }
      case 2:
        return { xs: 6, sm: 4, md: 3, lg: 3, xl: 2.4 }
      case 3:
        return { xs: 12, sm: 6, md: 4, lg: 4, xl: 3 }
      default:
        return { xs: 6, sm: 4, md: 3, lg: 3, xl: 2.4 }
    }
  }, [cardSize])

  const getCardScale = useCallback(() => {
    switch(cardSize) {
      case 1:
        return 0.7
      case 2:
        return 1
      case 3:
        return 1.3
      default:
        return 1
    }
  }, [cardSize])

  const gridBreakpoints = useMemo(() => getGridBreakpoints(), [getGridBreakpoints])
  const cardScale = useMemo(() => getCardScale(), [getCardScale])

  const dialogActions = useMemo(() => (
    <>
      <Button 
        onClick={handleCloseDialog}
        variant="outlined"
        size="large"
        fullWidth
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          }
        }}
      >
        {t('common.cancel')}
      </Button>
      <Button 
        onClick={handleCreateGame} 
        variant="contained" 
        color="success"
        size="large"
        fullWidth
        disabled={!selectedGame}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {t('games.addGame')}
      </Button>
    </>
  ), [handleCloseDialog, handleCreateGame, selectedGame, t])

  if (loading) {
    return <Loading />
  }

  return (
    <Box sx={{ maxWidth: '100%', width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: { xs: 2, sm: 0 },
      }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            {t('games.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {filteredAndSortedGames.length} {filteredAndSortedGames.length === 1 ? t('games.game') : t('games.games')}
            {games.length !== filteredAndSortedGames.length && ` (${games.length} ${t('games.total')})`}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => setDialogOpen(true)}
          fullWidth={false}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {t('games.addGame')}
        </Button>
      </Box>

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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {filteredAndSortedGames.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          mt: { xs: 6, sm: 8 },
          py: { xs: 4, sm: 6 },
          px: { xs: 2, sm: 3 },
        }}>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {games.length === 0 ? t('games.noGames') : t('games.noMatchingGames')}
          </Typography>
          {games.length > 0 && (
            <Button 
              onClick={clearFilters} 
              sx={{ 
                mt: 2,
                minHeight: 44,
              }}
            >
              {t('games.clearFilters')}
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {filteredAndSortedGames.map((game) => (
            <Grid item {...gridBreakpoints} key={game.id}>
              <GameCard 
                game={game} 
                cardScale={cardScale} 
                onDelete={(id) => {
                  const gameToDelete = games.find((g: Game) => g.id === id)
                  if (gameToDelete) handleDeleteGame(gameToDelete)
                }}
                onClick={(id) => navigate(`/games/${id}/statistics`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={t('games.addGame')}
        icon={<VideogameAsset sx={{ fontSize: 48 }} />}
        iconColor="#10b981"
        actions={dialogActions}
      >
        <Box sx={{ mt: 1 }}>
          <GameSearchAutocomplete onGameSelect={handleGameSelect} disabled={false} />
          {selectedGame && (
            <Box sx={{ 
              mt: 2, 
              p: 2.5, 
              bgcolor: alpha('#10b981', 0.08),
              borderRadius: 2,
              border: '1px solid',
              borderColor: alpha('#10b981', 0.2),
            }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">{t('games.selectedGame')}:</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5 }}>{selectedGame.name}</Typography>
              {selectedGame.genres && (
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>{selectedGame.genres}</Typography>
              )}
              {selectedGame.platforms && (
                <Typography variant="caption" display="block" color="text.secondary">{t('games.platforms')}: {selectedGame.platforms}</Typography>
              )}
            </Box>
          )}
        </Box>
      </StyledDialog>

      <TypedConfirmDialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteGame}
        title={t('games.deleteGame')}
        message={t('games.confirmDelete', { gameName: gameToDelete?.name })}
        confirmText={t('games.yesDelete')}
        requiredText="Delete"
        destructive
      />
    </Box>
  )
}

export default Games
