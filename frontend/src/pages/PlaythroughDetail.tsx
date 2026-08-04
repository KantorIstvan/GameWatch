import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Check, Clock, Pencil, Star } from 'lucide-react'
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
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { usePlaythrough } from '../hooks/usePlaythrough'
import { useMoodPrompt } from '../hooks/useHealth'
import { formatTime } from '../utils/formatters'
import { formatPlaythroughType, formatDescription, getPlaythroughTypeColor } from '../utils/playthroughUtils'
import { parseLocalDate } from '../utils/dateUtils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function PlaythroughDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const { mode } = useTheme()

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
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [manualSessionDialogOpen, setManualSessionDialogOpen] = useState(false)
  const [titleDialogOpen, setTitleDialogOpen] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [availablePlaythroughs, setAvailablePlaythroughs] = useState<Playthrough[]>([])
  const [selectedImportPlaythrough, setSelectedImportPlaythrough] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { showMoodPrompt, lastSessionId, promptForMood, closeMoodPrompt, required } = useMoodPrompt()

  const handleEndSessionWithMood = useCallback(async () => {
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      const sessionHistoryId = await handlers.handleEndSession()
      promptForMood(sessionHistoryId)
    } catch (error) {
      toast.error(t('playthrough.failedToEndSession'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, handlers, promptForMood, t])

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
    if (isSubmitting) return
    const totalSeconds = (Number(editHours) || 0) * 3600 + (Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0)

    if (totalSeconds > elapsedTime) {
      toast.warning(t('playthrough.cannotIncreaseTimeManually'))
      return
    }

    try {
      setIsSubmitting(true)
      await handlers.updateDuration(totalSeconds)
      setEditDialogOpen(false)
      toast.success(t('common.success'))
    } catch (err: any) {
      toast.error(t('playthrough.failedToUpdateTime'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, editHours, editMinutes, editSeconds, elapsedTime, handlers, t])

  const handleUpdatePlatform = useCallback(async () => {
    if (!selectedPlatform || isSubmitting) return

    try {
      setIsSubmitting(true)
      await handlers.updatePlatform(selectedPlatform)
      setPlatformDialogOpen(false)
      toast.success(t('common.success'))
    } catch (err: any) {
      toast.error(t('playthrough.failedToUpdatePlatform'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, selectedPlatform, handlers, t])

  const handleOpenTitleDialog = useCallback(() => {
    setEditedTitle(playthrough?.title || '')
    setTitleDialogOpen(true)
  }, [playthrough])

  const handleUpdateTitle = useCallback(async () => {
    const title = editedTitle.trim()
    if (isSubmitting || !title) return
    try {
      setIsSubmitting(true)
      await handlers.updateTitle(title)
      setTitleDialogOpen(false)
      toast.success(t('common.success'))
    } catch (err: any) {
      toast.error(t('playthrough.failedToUpdateTitle'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, editedTitle, handlers, t])

  const handleLogManualSession = useCallback(async (startedAt: string, endedAt: string) => {
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      const sessionHistoryId = await handlers.logManualSession(startedAt, endedAt)
      setManualSessionDialogOpen(false)
      toast.success(t('playthrough.sessionLoggedSuccess'))
      promptForMood(sessionHistoryId)
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('playthrough.failedToLogManualSession'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, handlers, promptForMood, t])

  const handleOpenImportDialog = useCallback(async () => {
    if (!playthrough || !game || isSubmitting) return

    try {
      setIsSubmitting(true)
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
      toast.error(t('playthrough.failedToLoadImportOptions'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, playthrough, game, t])

  const handleImportSessions = useCallback(async () => {
    if (isSubmitting) return
    if (!selectedImportPlaythrough) {
      toast.warning(t('playthrough.selectPlaythroughToImport'))
      return
    }

    try {
      setIsSubmitting(true)
      await handlers.importSessions(Number(selectedImportPlaythrough))
      setImportDialogOpen(false)
      setSelectedImportPlaythrough('')
      toast.success(t('playthrough.sessionsImportedSuccess'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('playthrough.failedToImportSessions'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, selectedImportPlaythrough, handlers, t])

  if (loading) {
    return <Loading />
  }

  if (error || !playthrough || !game) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="size-4" />
          {t('common.backToTimers')}
        </Button>
        <p className="mt-4 text-destructive">{error || t('playthrough.notFound')}</p>
      </div>
    )
  }

  const statusText = `${t('playthrough.status')}: ${
    playthrough.isDropped ? t('playthrough.statusDropped') :
    playthrough.isCompleted ? t('playthrough.statusCompleted') :
    playthrough.isActive ? t('playthrough.statusInProgress') :
    t('playthrough.statusPaused')
  }`

  const alreadyImported = playthrough.importedFromPlaythroughId !== null && playthrough.importedFromPlaythroughId !== undefined

  return (
    <div className="relative min-h-screen">
      {game.bannerImageUrl && (
        <div
          className="fixed inset-x-0 top-0 -z-10 h-screen bg-cover bg-center opacity-60 after:absolute after:inset-0"
          style={{
            backgroundImage: `url(${game.bannerImageUrl})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: mode === 'dark'
                ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)'
                : 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.9) 100%)',
            }}
          />
        </div>
      )}

      <div className="relative z-10">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="size-4" />
          {t('common.backToTimers')}
        </Button>

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

        <div className="overflow-hidden rounded-lg bg-surface shadow-3">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                {game.name}
              </h1>

              <div className="mb-3">
                <Badge
                  className="px-2.5 py-1 text-body-sm font-semibold text-white"
                  style={{ backgroundColor: getPlaythroughTypeColor(playthrough.playthroughType) }}
                >
                  {formatPlaythroughType(playthrough.playthroughType)}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-1">
                {playthrough.title ? (
                  <p className="text-h4 font-medium text-text-secondary">{playthrough.title}</p>
                ) : (
                  <p className="text-body-sm italic text-text-secondary">{t('playthrough.noTitle')}</p>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleOpenTitleDialog}
                      className="text-text-secondary hover:bg-accent/10 hover:text-accent"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('playthrough.editTitle')}</TooltipContent>
                </Tooltip>
              </div>

              {playthrough.playthroughType === '100%' && (
                <div className="mt-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenImportDialog}
                          disabled={alreadyImported || isSubmitting}
                          className="text-caption disabled:border-success disabled:text-success disabled:opacity-70"
                        >
                          {playthrough.importedFromPlaythroughId ? (
                            <>
                              <Check className="size-3.5" />
                              {t('playthrough.imported')}
                            </>
                          ) : (
                            t('playthrough.importTime')
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {alreadyImported
                        ? t('playthrough.importTimeTooltipDone')
                        : t('playthrough.importTimeTooltipAvailable')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {game.rating && (
              <div className="mb-6 flex flex-row flex-wrap gap-6">
                <div>
                  <div className="mb-1 flex items-center gap-1">
                    <span className="text-h4 font-bold">{game.rating}/5</span>
                    <Star className="size-4 fill-warning text-warning" />
                  </div>
                  <p className="text-body-sm text-text-secondary">
                    {(game.ratingsCount ?? 0) > 0 && `${game.ratingsCount?.toLocaleString()} ${t('game.ratings')}`}
                  </p>
                </div>
              </div>
            )}

            {(game.developers || game.publishers) && (
              <div className="mb-4 flex items-center gap-2">
                {game.developers && <span className="font-medium">{game.developers}</span>}
                {game.developers && game.publishers && <span className="text-text-secondary">•</span>}
                {game.publishers && <span className="font-medium text-text-secondary">{game.publishers}</span>}
              </div>
            )}

            {game.platforms && (
              <div className="mb-4 flex flex-row flex-wrap gap-2">
                {game.platforms.split(',').map((platform, idx) => (
                  <Badge key={idx} variant="outline" className="text-caption font-medium">
                    {platform.trim()}
                  </Badge>
                ))}
              </div>
            )}

            <Separator className="my-6" />

            <div>
              <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {game.releaseDate && (
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.released')}</p>
                    <p className="mt-0.5 text-body-sm">{game.releaseDate}</p>
                  </div>
                )}
                {game.esrbRating && (
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.esrbRating')}</p>
                    <p className="mt-0.5 text-body-sm">{game.esrbRating}</p>
                  </div>
                )}
              </div>

              {game.genres && (
                <div className="mb-4">
                  <p className="mb-1 block text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.genres')}</p>
                  <div className="flex flex-row flex-wrap gap-2">
                    {game.genres.split(', ').filter((g: string) => g).map((genre: string, idx: number) => (
                      <Badge key={idx} className="bg-text-tertiary/10 font-medium text-text-primary">{genre}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {game.tags && (
                <div className="mb-4">
                  <p className="mb-1 block text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.tags')}</p>
                  <div className="flex flex-row flex-wrap gap-2">
                    {game.tags.split(', ').filter((tag: string) => tag).slice(0, 10).map((tag: string, idx: number) => (
                      <Badge key={idx} className="bg-accent/8 font-medium text-accent">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {game.website && (
                <div className="mb-4">
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.officialWebsite')}</p>
                  <p className="mt-0.5">
                    <a href={game.website} target="_blank" rel="noopener noreferrer" className="font-medium text-accent no-underline transition-opacity hover:opacity-70">
                      {t('game.visitWebsite')}
                    </a>
                  </p>
                </div>
              )}

              {game.alternativeNames && (
                <div className="mb-4">
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{t('game.alsoKnownAs')}</p>
                  <p className="mt-0.5 text-body-sm text-text-secondary">{game.alternativeNames}</p>
                </div>
              )}

              {game.description && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <p className="mb-2 text-h4 font-semibold">{t('game.aboutThisGame')}</p>
                    <div className="text-body-sm leading-7 text-text-secondary">
                      {formatDescription(game.description)}
                    </div>
                  </div>
                </>
              )}

              {game.slug && (
                <>
                  <Separator className="my-6" />
                  <p className="text-caption text-text-secondary">
                    {t('game.slug')}: {game.slug}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="overflow-visible rounded-xl">
            <div className="flex justify-center pb-2 pt-2">
              <div className="flex size-20 items-center justify-center rounded-full border-2 border-accent/20 bg-accent/10 text-accent">
                <Clock className="size-12" />
              </div>
            </div>
            <DialogTitle className="pb-1 text-center text-h3 font-semibold">
              {t('playthrough.editTimeManually')}
            </DialogTitle>
            <p className="text-center text-body-sm leading-7 text-text-secondary">
              {t('playthrough.editTimeDescription')}
            </p>
            <div className="mt-2 flex gap-4">
              <div className="flex-1">
                <Label className="mb-1.5 block">{t('playthrough.hours')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={editHours}
                  onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block">{t('playthrough.minutes')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block">{t('playthrough.seconds')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={editSeconds}
                  onChange={(e) => setEditSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={() => setEditDialogOpen(false)} variant="outline" size="lg" className="h-12 w-full">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveTime} disabled={isSubmitting} size="lg" className="h-12 w-full">
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={platformDialogOpen} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>{t('playthrough.selectPlatform')}</DialogTitle>
            <p className="text-body-sm text-text-secondary">
              {t('playthrough.selectPlatformDescription')}
            </p>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('playthrough.platform')} />
              </SelectTrigger>
              <SelectContent>
                {game?.platforms?.split(',').map((platform) => (
                  <SelectItem key={platform.trim()} value={platform.trim()}>
                    {platform.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleUpdatePlatform} disabled={!selectedPlatform || isSubmitting} className="h-12 w-full">
              {t('common.save')}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={titleDialogOpen} onOpenChange={setTitleDialogOpen}>
          <DialogContent>
            <DialogTitle>{t('playthrough.editTitle')}</DialogTitle>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-playthrough-title">{t('playthrough.titleLabel')} *</Label>
              <Input
                autoFocus
                id="edit-playthrough-title"
                required
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder={game ? t('playthrough.titlePlaceholder', { game: game.name }) : ''}
              />
              <p className="text-caption text-text-secondary">{t('playthrough.titleRequired')}</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={() => setTitleDialogOpen(false)} variant="outline" className="h-12 w-full">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleUpdateTitle}
                disabled={isSubmitting || !editedTitle.trim()}
                className="h-12 w-full"
              >
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogTitle>{t('playthrough.importSessionsTitle')}</DialogTitle>
            <p className="text-body-sm text-text-secondary">
              {t('playthrough.importSessionsDescription')}
            </p>
            <p className="font-semibold text-warning">
              {t('playthrough.importSessionsWarning')}
            </p>
            <Select
              value={selectedImportPlaythrough ? String(selectedImportPlaythrough) : undefined}
              onValueChange={(v) => setSelectedImportPlaythrough(Number(v))}
              disabled={availablePlaythroughs.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('playthrough.selectPlaythroughPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availablePlaythroughs.map((pt) => (
                  <SelectItem key={pt.id} value={String(pt.id)}>
                    {pt.title || pt.gameName} - {formatPlaythroughType(pt.playthroughType)}
                    {pt.startDate && ` (${parseLocalDate(pt.startDate).toLocaleDateString()})`}
                    {pt.endDate && ` - ${parseLocalDate(pt.endDate).toLocaleDateString()}`}
                    {` - ${formatTime(pt.durationSeconds || 0)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={() => setImportDialogOpen(false)} variant="outline" className="h-12 w-full">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImportSessions} disabled={!selectedImportPlaythrough || isSubmitting} className="h-12 w-full">
                {t('playthrough.import')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TypedConfirmDialog
          open={finishModalOpen}
          onClose={() => setFinishModalOpen(false)}
          onConfirm={() => {
            setFinishModalOpen(false)
            handlers.handleFinish()
          }}
          title={t('playthrough.finishPlaythrough')}
          message={t('playthrough.finishConfirm')}
          confirmText={t('playthrough.finish')}
          requiredText={t('playthrough.finish')}
          destructive={false}
        />

        <TypedConfirmDialog
          open={dropModalOpen}
          onClose={() => setDropModalOpen(false)}
          onConfirm={() => {
            setDropModalOpen(false)
            handlers.handleDrop()
          }}
          title={t('playthrough.dropPlaythrough')}
          message={t('playthrough.dropConfirm')}
          confirmText={t('playthrough.drop')}
          requiredText={t('playthrough.drop')}
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
          title={t('playthrough.delete')}
          message={t('playthrough.deleteConfirm')}
          confirmText={t('common.delete')}
          requiredText={t('common.delete')}
          destructive
        />

        <LogManualSessionDialog
          open={manualSessionDialogOpen}
          onClose={() => setManualSessionDialogOpen(false)}
          onSubmit={handleLogManualSession}
          playthroughStartDate={playthrough.startDate}
          submitting={isSubmitting}
        />

        <MoodPromptModal
          open={showMoodPrompt}
          onClose={closeMoodPrompt}
          sessionHistoryId={lastSessionId}
          required={required}
        />
      </div>
    </div>
  )
}

export default PlaythroughDetail
