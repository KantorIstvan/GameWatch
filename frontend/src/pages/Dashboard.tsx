import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  MenuItem,
  TextField,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { PlaylistAdd } from '@mui/icons-material'
import { playthroughsApi, gamesApi } from '../services/api'
import StopwatchCard from '../components/StopwatchCard'
import Loading from '../components/Loading'
import StyledDialog from '../components/StyledDialog'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Playthrough, Game } from '../types'

function Dashboard() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const [playthroughs, setPlaythroughs] = useState<Playthrough[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [playthroughType, setPlaythroughType] = useState('story')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

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
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlaythrough = useCallback(async () => {
    try {
      const response = await playthroughsApi.create({
        gameId: selectedGameId,
        playthroughType,
        startDate,
      })
      setPlaythroughs([response.data, ...playthroughs])
      setDialogOpen(false)
      setSelectedGameId('')
      setPlaythroughType('story')
      setStartDate(new Date().toISOString().split('T')[0])
    } catch (err: any) {
      console.error('Failed to create playthrough:', err)
      setError('Failed to create playthrough. Please try again.')
    }
  }, [selectedGameId, playthroughType, startDate, playthroughs])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
  }, [])

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
        onClick={handleCreatePlaythrough} 
        variant="contained" 
        color="primary"
        size="large"
        fullWidth
        disabled={!selectedGameId}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {t('playthrough.create')}
      </Button>
    </>
  ), [handleCloseDialog, handleCreatePlaythrough, selectedGameId, t])

  if (loading) {
    return <Loading />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {t('dashboard.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
          disabled={games.length === 0}
        >
          {t('dashboard.newPlaythrough')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {games.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No games found. Please add games first in the Games page.
        </Alert>
      )}

      {playthroughs.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t('dashboard.noPlaythroughsMessage')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {playthroughs.map((playthrough) => (
            <Grid item xs={12} sm={6} md={4} key={playthrough.id}>
              <StopwatchCard
                playthrough={playthrough}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={t('playthrough.create')}
        icon={<PlaylistAdd sx={{ fontSize: 48 }} />}
        actions={dialogActions}
      >
        <TextField
          select
          fullWidth
          label={t('playthrough.selectGame')}
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          margin="normal"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        >
          {games.map((game) => (
            <MenuItem key={game.id} value={game.id}>
              {game.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label={t('playthrough.type')}
          value={playthroughType}
          onChange={(e) => setPlaythroughType(e.target.value)}
          margin="normal"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        >
          <MenuItem value="story">Story</MenuItem>
          <MenuItem value="100%">100%</MenuItem>
          <MenuItem value="speedrun">Speedrun</MenuItem>
          <MenuItem value="casual">Casual</MenuItem>
        </TextField>
        <TextField
          fullWidth
          label={t('playthrough.startDate')}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          margin="normal"
          InputLabelProps={{
            shrink: true,
          }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Prevent future dates
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </StyledDialog>
    </Box>
  )
}

export default Dashboard
