import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  alpha,
  useTheme,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Add, Search } from '@mui/icons-material'
import { playthroughsApi, gamesApi } from '../services/api'
import StopwatchCard from '../components/StopwatchCard'
import CreatePlaythroughDialog from '../components/CreatePlaythroughDialog'
import Loading from '../components/Loading'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Playthrough, Game } from '../types'

function Timers() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const theme = useTheme()
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [playthroughType, setPlaythroughType] = useState('story')
  const [playthroughTitle, setPlaythroughTitle] = useState('')
  const [platform, setPlatform] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [sortBy, setSortBy] = useState('date-desc')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterGame, setFilterGame] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isAuthReady) {
      fetchData()
    }
  }, [isAuthReady])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [playthroughsRes, gamesRes] = await Promise.all([
        playthroughsApi.getAll(),
        gamesApi.getAll(),
      ])
      setPlaythroughs(playthroughsRes.data)
      setGames(gamesRes.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch data:', err)
      setError(t('errors.failedLoadData'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlaythrough = async () => {
    if (!selectedGame || !playthroughType || !platform || !startDate) return
    
    try {
      const response = await playthroughsApi.create({
        gameId: selectedGame.id.toString(),
        playthroughType,
        startDate,
        platform,
        title: playthroughTitle || undefined,
      })
      setPlaythroughs([response.data, ...playthroughs])
      handleCloseDialog()
    } catch (err: any) {
      console.error('Failed to create playthrough:', err)
      setError(t('errors.failedCreatePlaythrough'))
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedGame(null)
    setPlaythroughType('story')
    setPlaythroughTitle('')
    setPlatform('')
    setStartDate(new Date().toISOString().split('T')[0])
  }

  const filteredAndSortedPlaythroughs = useMemo(() => {
    let filtered = [...playthroughs]
    
    if (filterStatus) {
      filtered = filtered.filter(p => {
        if (filterStatus === 'active') return p.isActive
        if (filterStatus === 'paused') return p.isPaused
        if (filterStatus === 'completed') return p.isCompleted
        return true
      })
    }
    
    if (filterType) {
      filtered = filtered.filter(p => p.playthroughType === filterType)
    }
    
    if (filterGame) {
      filtered = filtered.filter(p => p.gameId.toString() === filterGame)
    }
    
    if (filterPlatform) {
      filtered = filtered.filter(p => p.platform === filterPlatform)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => {
        const game = games.find(g => g.id === p.gameId)
        const gameName = game?.name.toLowerCase() || ''
        const playthroughTitle = (p.title || '').toLowerCase()
        return gameName.includes(query) || playthroughTitle.includes(query)
      })
    }
    
    filtered.sort((a, b) => {
      const gameA = games.find(g => g.id === a.gameId)
      const gameB = games.find(g => g.id === b.gameId)
      
      switch (sortBy) {
        case 'name-asc':
          return (gameA?.name || '').localeCompare(gameB?.name || '')
        case 'name-desc':
          return (gameB?.name || '').localeCompare(gameA?.name || '')
        case 'time-desc':
          return (b.durationSeconds || 0) - (a.durationSeconds || 0)
        case 'time-asc':
          return (a.durationSeconds || 0) - (b.durationSeconds || 0)
        case 'date-desc':
          return new Date(b.startDate || '').getTime() - new Date(a.startDate || '').getTime()
        case 'date-asc':
          return new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime()
        case 'sessions-desc':
          return (b.sessionCount || 0) - (a.sessionCount || 0)
        case 'sessions-asc':
          return (a.sessionCount || 0) - (b.sessionCount || 0)
        default:
          return 0
      }
    })
    
    return filtered
  }, [playthroughs, games, sortBy, filterStatus, filterType, filterGame, filterPlatform, searchQuery])

  if (loading) {
    return <Loading />
  }

  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: { xs: 3, sm: 4 },
          pb: { xs: 2, sm: 3 },
          borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            {t('timers.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {playthroughs.length} {playthroughs.length === 1 ? t('labels.timer') : t('labels.timers')} {t('labels.active')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
          disabled={games.length === 0}
          size="large"
          fullWidth={false}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: { xs: 2.5, sm: 3 },
            py: 1.5,
            minHeight: 48,
            width: { xs: '100%', sm: 'auto' },
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {t('timers.newPlaythrough')}
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%',
            }
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {games.length === 0 && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
          }}
        >
          {t('errors.noGamesFound')}
        </Alert>
      )}

      {/* Search and Filters */}
      {playthroughs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder={t('timers.searchTimers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ 
              mb: 2,
              '& .MuiInputBase-root': {
                minHeight: 48,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
          }}>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <InputLabel>{t('timers.sortBy')}</InputLabel>
              <Select
                value={sortBy}
                label={t('timers.sortBy')}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: 48,
                  },
                }}
              >
                <MenuItem value="name-asc">{t('timers.sortNameAsc')}</MenuItem>
                <MenuItem value="name-desc">{t('timers.sortNameDesc')}</MenuItem>
                <MenuItem value="time-desc">{t('timers.sortTimeDesc')}</MenuItem>
                <MenuItem value="time-asc">{t('timers.sortTimeAsc')}</MenuItem>
                <MenuItem value="date-desc">{t('timers.sortDateDesc')}</MenuItem>
                <MenuItem value="date-asc">{t('timers.sortDateAsc')}</MenuItem>
                <MenuItem value="sessions-desc">{t('timers.sortSessionsDesc')}</MenuItem>
                <MenuItem value="sessions-asc">{t('timers.sortSessionsAsc')}</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>{t('timers.filterByStatus')}</InputLabel>
              <Select
                value={filterStatus}
                label={t('timers.filterByStatus')}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">{t('timers.statusAll')}</MenuItem>
                <MenuItem value="active">{t('timers.statusActive')}</MenuItem>
                <MenuItem value="paused">{t('timers.statusPaused')}</MenuItem>
                <MenuItem value="completed">{t('timers.statusCompleted')}</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>{t('timers.filterByType')}</InputLabel>
              <Select
                value={filterType}
                label={t('timers.filterByType')}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">{t('timers.typeAll')}</MenuItem>
                <MenuItem value="story">{t('timers.typeStory')}</MenuItem>
                <MenuItem value="speedrun">{t('timers.typeSpeedrun')}</MenuItem>
                <MenuItem value="casual">{t('timers.typeCasual')}</MenuItem>
                <MenuItem value="100_percent">{t('timers.type100')}</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <InputLabel>{t('timers.filterByGame')}</InputLabel>
              <Select
                value={filterGame}
                label={t('timers.filterByGame')}
                onChange={(e) => setFilterGame(e.target.value)}
              >
                <MenuItem value="">{t('timers.gameAll')}</MenuItem>
                {games
                  .filter(game => playthroughs.some(p => p.gameId === game.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((game) => (
                    <MenuItem key={game.id} value={game.id.toString()}>
                      {game.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>{t('timers.filterByPlatform')}</InputLabel>
              <Select
                value={filterPlatform}
                label={t('timers.filterByPlatform')}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <MenuItem value="">{t('timers.platformAll')}</MenuItem>
                {Array.from(new Set(playthroughs.map(p => p.platform).filter(Boolean)))
                  .sort()
                  .map((platform) => (
                    <MenuItem key={platform} value={platform}>
                      {platform}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}

      {filteredAndSortedPlaythroughs.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            mt: { xs: 6, sm: 8 },
            py: { xs: 6, sm: 8 },
            px: { xs: 3, sm: 4 },
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.4)
              : alpha(theme.palette.background.paper, 0.6),
            border: `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
          }}
        >
          <Typography 
            variant="h6" 
            color="text.secondary" 
            gutterBottom
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {t('timers.noPlaythroughsMessage')}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mt: 1, 
              opacity: 0.7,
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
            }}
          >
            {t('labels.clickNewPlaythrough')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {filteredAndSortedPlaythroughs.map((playthrough) => (
            <Grid item xs={12} sm={6} lg={4} key={playthrough.id}>
              <StopwatchCard playthrough={playthrough} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreatePlaythroughDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleCreatePlaythrough}
        games={games}
        selectedGame={selectedGame}
        setSelectedGame={setSelectedGame}
        playthroughType={playthroughType}
        setPlaythroughType={setPlaythroughType}
        playthroughTitle={playthroughTitle}
        platform={platform}
        setPlatform={setPlatform}
        setPlaythroughTitle={setPlaythroughTitle}
        startDate={startDate}
        setStartDate={setStartDate}
      />
    </Box>
  )
}

export default Timers
