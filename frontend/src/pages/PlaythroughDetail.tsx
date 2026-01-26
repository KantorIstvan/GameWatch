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
} from '@mui/material'
import { ArrowBack, Schedule, Close } from '@mui/icons-material'
import { playthroughsApi } from '../services/api'
import { Playthrough } from '../types'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import LogManualSessionDialog from '../components/LogManualSessionDialog'
import TimerControls from '../components/TimerControls'
import GameDetails from '../components/GameDetails'
import TimerDisplay from '../components/playthrough/TimerDisplay'
import PlaythroughHeader from '../components/playthrough/PlaythroughHeader'
import MoodPromptModal from '../components/MoodPromptModal'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { usePlaythrough } from '../hooks/usePlaythrough'
import { useMoodPrompt } from '../hooks/useHealth'
import { formatTime } from '../utils/formatters'
import { formatPlaythroughType, formatDescription } from '../utils/playthroughUtils'

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
      console.error('Failed to end session:', error)
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
      console.error('Failed to update time:', err)
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
      console.error('Failed to update platform:', err)
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
      console.error('Failed to update title:', err)
      showSnackbar('Failed to update title.', 'error')
    }
  }, [editedTitle, handlers, showSnackbar, t])

  const handleLogManualSession = useCallback(async (startedAt: string, endedAt: string) => {
    try {
      await handlers.logManualSession(startedAt, endedAt)
      setManualSessionDialogOpen(false)
      showSnackbar('Session logged successfully!', 'success')
    } catch (err: any) {
      console.error('Failed to log manual session:', err)
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
      console.error('Failed to fetch playthroughs:', err)
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
      console.error('Failed to import sessions:', err)
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
        <Card elevation={3}>
          <CardContent sx={{ p: 3 }}>
            <PlaythroughHeader
              playthrough={playthrough}
              gameName={game.name}
              onEditTitle={handleOpenTitleDialog}
              onImport={handleOpenImportDialog}
              showImportButton={playthrough.playthroughType === '100%'}
              t={t}
            />

            <Divider sx={{ my: 3 }} />

            <GameDetails game={game} t={t} />

            {game.description && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('game.aboutThisGame')}
                  </Typography>
                  <Box>
                    {formatDescription(game.description)}
                  </Box>
                </Box>
              </>
            )}

            {game.slug && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('game.slug')}: {game.slug}
                    {game.updated && ` • ${t('game.lastUpdated')}: ${new Date(game.updated).toLocaleDateString()}`}
                  </Typography>
                </Box>
              </>
            )}
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

        <ConfirmModal
          open={finishModalOpen}
          onClose={() => setFinishModalOpen(false)}
          onConfirm={() => {
            setFinishModalOpen(false)
            handlers.handleFinish()
          }}
          title={t('playthrough.finishPlaythrough')}
          message={t('playthrough.finishConfirm')}
          confirmText={t('playthrough.yesFinish')}
          confirmColor="success"
        />

        <ConfirmModal
          open={dropModalOpen}
          onClose={() => setDropModalOpen(false)}
          onConfirm={() => {
            setDropModalOpen(false)
            handlers.handleDrop()
          }}
          title={t('playthrough.dropPlaythrough')}
          message={t('playthrough.dropConfirm')}
          confirmText={t('playthrough.yesDrop')}
          confirmColor="error"
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

        <ConfirmModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => {
            setDeleteModalOpen(false)
            handlers.handleDelete()
          }}
          title={t('playthrough.delete')}
          message={t('playthrough.deleteConfirm')}
          confirmText={t('playthrough.yesDelete')}
          confirmColor="error"
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
