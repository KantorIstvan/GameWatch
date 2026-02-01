import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Stack,
  Typography,
  IconButton,
  alpha,
  useTheme,
  Chip,
  Tooltip,
  Grid,
} from '@mui/material'
import { ArrowBack, Schedule, Close, Edit } from '@mui/icons-material'
import { playthroughsApi } from '../services/api'
import { Playthrough } from '../types'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import TypedConfirmDialog from '../components/TypedConfirmDialog'
import LogManualSessionDialog from '../components/LogManualSessionDialog'
import TimerControls from '../components/TimerControls'
import TimerDisplay from '../components/playthrough/TimerDisplay'
import MoodPromptModal from '../components/MoodPromptModal'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { usePlaythrough } from '../hooks/usePlaythrough'
import { useMoodPrompt } from '../hooks/useHealth'
import { formatTime } from '../utils/formatters'
import { formatPlaythroughType, formatDescription, getPlaythroughTypeColor } from '../utils/playthroughUtils'

function PlaythroughDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const theme = useTheme()
  
  const {
    playthrough,
    game,
    loading,
    error,
    elapsedTime,
    currentSessionTime,
    timerGradient,
    handlers
  } = usePlaythrough(Number(id), isAuthReady)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editHours, setEditHours] = useState<number>(0)
  const [editMinutes, setEditMinutes] = useState<number>(0)
  const [editSeconds, setEditSeconds] = useState<number>(0)
  const [finishModalOpen, setFinishModalOpen] = useState(false)
  const [dropModalOpen, setDropModalOpen] = useState(false)
  const [pickupModalOpen, setPickupModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('error')
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [manualSessionDialogOpen, setManualSessionDialogOpen] = useState(false)
  const [titleDialogOpen, setTitleDialogOpen] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [availablePlaythroughs, setAvailablePlaythroughs] = useState<Playthrough[]>([])
  const [selectedImportPlaythrough, setSelectedImportPlaythrough] = useState<number | ''>('')

  // Mood prompt
  const { showMoodPrompt, lastSessionId, promptForMood, closeMoodPrompt, required } = useMoodPrompt()

  const showSnackbar = useCallback((message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }, [])

  // Wrapper for handleEndSession to trigger mood prompt
  const handleEndSessionWithMood = useCallback(async () => {
    try {
      const sessionHistoryId = await handlers.handleEndSession()
      // Trigger mood prompt after successful session end with the session ID
      promptForMood(sessionHistoryId)
    } catch (error) {
      showSnackbar('Failed to end session', 'error')
    }
  }, [handlers, promptForMood, showSnackbar])

  const handleOpenEditDialog = useCallback(() => {
    const hrs = Math.floor(elapsedTime / 3600)
    const mins = Math.floor((elapsedTime % 3600) / 60)
    const secs = elapsedTime % 60
    setEditHours(hrs)
    setEditMinutes(mins)
    setEditSeconds(secs)
    setEditDialogOpen(true)
  }, [elapsedTime])

  const handleSaveTime = useCallback(async () => {
    const totalSeconds = (Number(editHours) || 0) * 3600 + (Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0)
    
    if (totalSeconds > elapsedTime) {
      showSnackbar(t('playthrough.cannotIncreaseTimeManually'), 'warning')
      return
    }
    
    try {
      await handlers.updateDuration(totalSeconds)
      setEditDialogOpen(false)
      showSnackbar(t('common.success'), 'success')
    } catch (err: any) {
      showSnackbar('Failed to update time.', 'error')
    }
  }, [editHours, editMinutes, editSeconds, elapsedTime, handlers, showSnackbar, t])

  const handleUpdatePlatform = useCallback(async () => {
    if (!selectedPlatform) return
    
    try {
      await handlers.updatePlatform(selectedPlatform)
      setPlatformDialogOpen(false)
      showSnackbar(t('common.success'), 'success')
    } catch (err: any) {
      showSnackbar('Failed to update platform.', 'error')
    }
  }, [selectedPlatform, handlers, showSnackbar, t])

  const handleOpenTitleDialog = useCallback(() => {
    setEditedTitle(playthrough?.title || '')
    setTitleDialogOpen(true)
  }, [playthrough])

  const handleUpdateTitle = useCallback(async () => {
    try {
      await handlers.updateTitle(editedTitle)
      setTitleDialogOpen(false)
      showSnackbar(t('common.success'), 'success')
    } catch (err: any) {
      showSnackbar('Failed to update title.', 'error')
    }
  }, [editedTitle, handlers, showSnackbar, t])

  const handleLogManualSession = useCallback(async (startedAt: string, endedAt: string) => {
    try {
      await handlers.logManualSession(startedAt, endedAt)
      setManualSessionDialogOpen(false)
      showSnackbar('Session logged successfully!', 'success')
    } catch (err: any) {
      showSnackbar(err.response?.data?.message || 'Failed to log manual session.', 'error')
    }
  }, [handlers, showSnackbar])

  const handleOpenImportDialog = useCallback(async () => {
    if (!playthrough || !game) return
    
    try {
      const response = await playthroughsApi.getAll()
      const filteredPlaythroughs = response.data.filter((pt: Playthrough) => 
        pt.gameId === game.id && 
        pt.id !== playthrough.id &&
        pt.playthroughType !== '100%' &&
        pt.sessionCount > 0
      )
      setAvailablePlaythroughs(filteredPlaythroughs)
      setImportDialogOpen(true)
    } catch (err: any) {
      showSnackbar('Failed to load available playthroughs.', 'error')
    }
  }, [playthrough, game, showSnackbar])

  const handleImportSessions = useCallback(async () => {
    if (!selectedImportPlaythrough) {
      showSnackbar('Please select a playthrough to import from.', 'warning')
      return
    }

    try {
      await handlers.importSessions(Number(selectedImportPlaythrough))
      setImportDialogOpen(false)
      setSelectedImportPlaythrough('')
      showSnackbar('Sessions imported successfully!', 'success')
    } catch (err: any) {
      showSnackbar(err.response?.data?.message || 'Failed to import sessions.', 'error')
    }
  }, [selectedImportPlaythrough, handlers, showSnackbar])

  if (loading) {
    return <Loading />
  }

  if (error || !playthrough || !game) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>
          {t('common.backToTimers')}
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error || t('playthrough.notFound')}
        </Typography>
      </Box>
    )
  }

  const statusText = `${t('playthrough.status')}: ${
    playthrough.isDropped ? t('playthrough.statusDropped') :
    playthrough.isCompleted ? t('playthrough.statusCompleted') :
    playthrough.isActive ? t('playthrough.statusInProgress') :
    t('playthrough.statusPaused')
  }`

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Banner Background */}
      {game.bannerImageUrl && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '100vh',
            backgroundImage: `url(${game.bannerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.6,
            zIndex: -1,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.9) 100%)',
            },
          }}
        />
      )}

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
        >
          {t('common.backToTimers')}
        </Button>

        {/* Timer Section */}
        <TimerDisplay
          playthrough={playthrough}
          elapsedTime={elapsedTime}
          currentSessionTime={currentSessionTime}
          timerGradient={timerGradient}
          onEdit={handleOpenEditDialog}
          onDelete={() => setDeleteModalOpen(true)}
          statusText={statusText}
        >
          <TimerControls
            playthrough={playthrough}
            onStart={handlers.handleStart}
            onPause={handlers.handlePause}
            onContinue={handlers.handleStart}
            onEndSession={handleEndSessionWithMood}
            onFinish={() => setFinishModalOpen(true)}
            onDrop={() => setDropModalOpen(true)}
            onPickup={() => setPickupModalOpen(true)}
            onOpenManualSession={() => setManualSessionDialogOpen(true)}
            t={t}
          />
        </TimerDisplay>

        {/* Game Details Section */}
        <Card 
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* 1. TITLE - Highest Priority */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Typography 
                  variant="h3" 
                  component="h1"
                  sx={{ 
                    fontWeight: 700,
                    fontSize: { xs: '2rem', md: '2.75rem' },
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    flex: 1,
                  }}
                >
                  {game.name}
                </Typography>
              </Box>
              
              {/* Playthrough Type Chip */}
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={formatPlaythroughType(playthrough.playthroughType)} 
                  size="medium"
                  sx={{
                    backgroundColor: getPlaythroughTypeColor(playthrough.playthroughType),
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    px: 1,
                  }}
                />
              </Box>

              {/* Custom Title */}
              {playthrough.title && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary"
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '1.125rem',
                    }}
                  >
                    {playthrough.title}
                  </Typography>
                  <Tooltip title={t('playthrough.editTitle')} arrow>
                    <IconButton
                      size="small"
                      onClick={handleOpenTitleDialog}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <Edit sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              {!playthrough.title && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {t('playthrough.noTitle')}
                  </Typography>
                  <Tooltip title={t('playthrough.editTitle')} arrow>
                    <IconButton
                      size="small"
                      onClick={handleOpenTitleDialog}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <Edit sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {/* Import Button */}
              {playthrough.playthroughType === '100%' && (
                <Box sx={{ mt: 2 }}>
                  <Tooltip 
                    title={playthrough.importedFromPlaythroughId 
                      ? "Already imported from another playthrough (one-time only)" 
                      : "Import playtime from another playthrough"
                    } 
                    arrow
                  >
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenImportDialog}
                        disabled={playthrough.importedFromPlaythroughId !== null && playthrough.importedFromPlaythroughId !== undefined}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.5,
                          px: 1.5,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          borderWidth: 1.5,
                          '&:hover': {
                            borderWidth: 1.5,
                          },
                          '&:disabled': {
                            borderColor: 'success.main',
                            color: 'success.main',
                            opacity: 0.7,
                          }
                        }}
                      >
                        {playthrough.importedFromPlaythroughId ? 'Imported ✓' : 'Import Time'}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* 2. RATINGS - Secondary Priority */}
            {(game.rating || game.metacritic) && (
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={3} flexWrap="wrap" sx={{ gap: 2 }}>
                  {game.rating && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography 
                          variant="h5" 
                          component="span"
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '1.5rem',
                          }}
                        >
                          {game.rating}/5
                        </Typography>
                        <Typography variant="h5" component="span">⭐</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {(game.ratingsCount ?? 0) > 0 && `${game.ratingsCount?.toLocaleString()} ${t('game.ratings')}`}
                        {(game.ratingTop ?? 0) > 0 && ` • ${t('game.top')}: ${game.ratingTop}`}
                      </Typography>
                    </Box>
                  )}
                  {(game.metacritic ?? 0) > 0 && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        {/* Metacritic Score Badge */}
                        <Box
                          component={game.metacriticUrl ? 'a' : 'div'}
                          href={game.metacriticUrl || undefined}
                          target={game.metacriticUrl ? '_blank' : undefined}
                          rel={game.metacriticUrl ? 'noopener noreferrer' : undefined}
                          sx={{
                            width: 48,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 0.5,
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            backgroundColor: (game.metacritic ?? 0) >= 75 ? '#66cc33' : (game.metacritic ?? 0) >= 50 ? '#ffcc33' : '#ff6666',
                            color: '#fff',
                            textDecoration: 'none',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: '2px solid',
                            borderColor: (game.metacritic ?? 0) >= 75 ? '#66cc33' : (game.metacritic ?? 0) >= 50 ? '#ffcc33' : '#ff6666',
                            '&:hover': game.metacriticUrl ? {
                              transform: 'scale(1.05)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            } : {},
                          }}
                        >
                          {game.metacritic}
                        </Box>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '1.125rem',
                              lineHeight: 1.2,
                            }}
                          >
                            Metacritic
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                            {(game.metacritic ?? 0) >= 75 ? 'Generally favorable' : (game.metacritic ?? 0) >= 50 ? 'Mixed or average' : 'Generally unfavorable'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            {/* 3. DEVELOPERS & PUBLISHERS - Tertiary Priority */}
            {(game.developers || game.publishers) && (
              <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1} divider={<Typography color="text.secondary">•</Typography>}>
                  {game.developers && (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '1rem',
                      }}
                    >
                      {game.developers}
                    </Typography>
                  )}
                  {game.publishers && (
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '1rem',
                      }}
                    >
                      {game.publishers}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* 4. PLATFORMS - Supporting Information */}
            {game.platforms && (
              <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  {game.platforms.split(',').map((platform, idx) => (
                    <Chip
                      key={idx}
                      label={platform.trim()}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderRadius: 1,
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        borderWidth: 1.5,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* 5. REST - Remaining Content */}
            <Box>
              {/* Release Date and ESRB */}
              <Grid container spacing={3} sx={{ mb: 2 }}>
                {game.releaseDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                      {t('game.released')}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontSize: '0.9375rem' }}>
                      {game.releaseDate}
                    </Typography>
                  </Grid>
                )}
                {game.esrbRating && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                      {t('game.esrbRating')}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontSize: '0.9375rem' }}>
                      {game.esrbRating}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Genres and Tags */}
              {game.genres && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
                    {t('game.genres')}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 1 }}>
                    {game.genres.split(', ').filter((g: string) => g).map((genre: string, idx: number) => (
                      <Chip 
                        key={idx} 
                        label={genre} 
                        size="small" 
                        sx={{
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                          color: 'text.primary',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {game.tags && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
                    {t('game.tags')}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 1 }}>
                    {game.tags.split(', ').filter((t: string) => t).slice(0, 10).map((tag: string, idx: number) => (
                      <Chip 
                        key={idx} 
                        label={tag} 
                        size="small" 
                        sx={{
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Website */}
              {game.website && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                    {t('game.officialWebsite')}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    <a 
                      href={game.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: theme.palette.primary.main, 
                        textDecoration: 'none',
                        fontWeight: 500,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      {t('game.visitWebsite')}
                    </a>
                  </Typography>
                </Box>
              )}

              {/* Reddit Community */}
              {(game.redditUrl || game.redditName) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                    {t('game.redditCommunity')}
                  </Typography>
                  {game.redditUrl && (
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      <a 
                        href={game.redditUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          color: theme.palette.primary.main, 
                          textDecoration: 'none',
                          fontWeight: 500,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        r/{game.redditName || t('game.visitSubreddit')}
                      </a>
                      {game.redditCount && ` • ${game.redditCount.toLocaleString()} ${t('game.members')}`}
                    </Typography>
                  )}
                  {game.redditDescription && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {game.redditDescription}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Alternative Names */}
              {game.alternativeNames && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                    {t('game.alsoKnownAs')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                    {game.alternativeNames}
                  </Typography>
                </Box>
              )}

              {/* Description */}
              {game.description && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{
                        fontWeight: 600,
                        fontSize: '1.125rem',
                        mb: 1.5,
                      }}
                    >
                      {t('game.aboutThisGame')}
                    </Typography>
                    <Box sx={{ 
                      fontSize: '0.9375rem', 
                      lineHeight: 1.7,
                      color: 'text.secondary',
                    }}>
                      {formatDescription(game.description)}
                    </Box>
                  </Box>
                </>
              )}

              {/* Metadata Footer */}
              {game.slug && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {t('game.slug')}: {game.slug}
                      {game.updated && ` • ${t('game.lastUpdated')}: ${new Date(game.updated).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <IconButton onClick={() => setEditDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4, pb: 2 }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
              color: theme.palette.info.main,
            }}>
              <Schedule sx={{ fontSize: 48 }} />
            </Box>
          </Box>
          <DialogTitle sx={{ textAlign: 'center', pt: 2, pb: 1, px: 4, fontSize: '1.5rem', fontWeight: 600 }}>
            {t('playthrough.editTimeManually')}
          </DialogTitle>
          <DialogContent sx={{ px: 4, pb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', lineHeight: 1.6 }}>
              {t('playthrough.editTimeDescription')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                label={t('playthrough.hours')}
                type="number"
                value={editHours}
                onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                label={t('playthrough.minutes')}
                type="number"
                value={editMinutes}
                onChange={(e) => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                inputProps={{ min: 0, max: 59 }}
                fullWidth
              />
              <TextField
                label={t('playthrough.seconds')}
                type="number"
                value={editSeconds}
                onChange={(e) => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                inputProps={{ min: 0, max: 59 }}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 4, pb: 3, pt: 2, gap: 1.5 }}>
            <Button onClick={() => setEditDialogOpen(false)} variant="outlined" size="large" fullWidth>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveTime} variant="contained" size="large" fullWidth>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={platformDialogOpen} onClose={() => {}} maxWidth="sm" fullWidth>
          <DialogTitle>{t('playthrough.selectPlatform') || 'Select Platform'}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This playthrough doesn't have a platform set. Please select which platform you're playing on.
            </Typography>
            <TextField
              select
              fullWidth
              label={t('playthrough.platform')}
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              {game?.platforms?.split(',').map((platform) => (
                <MenuItem key={platform.trim()} value={platform.trim()}>
                  {platform.trim()}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
            <Button onClick={handleUpdatePlatform} variant="contained" disabled={!selectedPlatform} fullWidth>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={titleDialogOpen} onClose={() => setTitleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('playthrough.editTitle')}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={t('playthrough.playthroughTitle')}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder={game ? `${game.name} playthrough` : ''}
              margin="normal"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
            <Button onClick={() => setTitleDialogOpen(false)} variant="outlined">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateTitle} variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Import Time from Another Playthrough</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Import the playtime from another playthrough of the same game. Only the total time will be added to this 100% playthrough, without duplicating individual sessions.
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ mb: 3, fontWeight: 600 }}>
              ⚠️ Note: You can only import once per 100% playthrough. Choose carefully!
            </Typography>
            <TextField
              select
              fullWidth
              label="Select Playthrough"
              value={selectedImportPlaythrough}
              onChange={(e) => setSelectedImportPlaythrough(Number(e.target.value))}
              margin="normal"
            >
              {availablePlaythroughs.length === 0 ? (
                <MenuItem disabled value="">No playthroughs available</MenuItem>
              ) : (
                availablePlaythroughs.map((pt) => (
                  <MenuItem key={pt.id} value={pt.id}>
                    {pt.title || pt.gameName} - {formatPlaythroughType(pt.playthroughType)} 
                    {pt.startDate && ` (${new Date(pt.startDate).toLocaleDateString()})`}
                    {pt.endDate && ` - ${new Date(pt.endDate).toLocaleDateString()}`}
                    {` - ${formatTime(pt.durationSeconds || 0)}`}
                  </MenuItem>
                ))
              )}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
            <Button onClick={() => setImportDialogOpen(false)} variant="outlined">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImportSessions} variant="contained" disabled={!selectedImportPlaythrough}>
              Import
            </Button>
          </DialogActions>
        </Dialog>

        <TypedConfirmDialog
          open={finishModalOpen}
          onClose={() => setFinishModalOpen(false)}
          onConfirm={() => {
            setFinishModalOpen(false)
            handlers.handleFinish()
          }}
          title="Finish Game"
          message="Are you sure you want to mark this game as finished? This action will move it to your completed games."
          confirmText="Finish"
          requiredText="Finish"
          destructive={false}
        />

        <TypedConfirmDialog
          open={dropModalOpen}
          onClose={() => setDropModalOpen(false)}
          onConfirm={() => {
            setDropModalOpen(false)
            handlers.handleDrop()
          }}
          title="Drop Game"
          message="Are you sure you want to drop this game? It will be moved to your dropped games list."
          confirmText="Drop"
          requiredText="Drop"
          destructive
        />

        <ConfirmModal
          open={pickupModalOpen}
          onClose={() => setPickupModalOpen(false)}
          onConfirm={() => {
            setPickupModalOpen(false)
            handlers.handlePickup()
          }}
          title={t('playthrough.pickupPlaythrough')}
          message={t('playthrough.pickupConfirm')}
          confirmText={t('playthrough.yesPickup')}
          confirmColor="primary"
        />

        <TypedConfirmDialog
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => {
            setDeleteModalOpen(false)
            handlers.handleDelete()
          }}
          title="Delete Playthrough"
          message="Are you sure you want to permanently delete this playthrough? This will remove all session data and cannot be undone."
          confirmText="Delete"
          requiredText="Delete"
          destructive
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled">
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <LogManualSessionDialog
          open={manualSessionDialogOpen}
          onClose={() => setManualSessionDialogOpen(false)}
          onSubmit={handleLogManualSession}
          playthroughStartDate={playthrough.startDate}
          isCompleted={playthrough.isCompleted}
          isDropped={playthrough.isDropped}
        />

        <MoodPromptModal
          open={showMoodPrompt}
          onClose={closeMoodPrompt}
          sessionHistoryId={lastSessionId}
          required={required}
        />
      </Box>
    </Box>
  )
}

export default PlaythroughDetail
