import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, ListPlus, X } from 'lucide-react'
import dayjs from 'dayjs'
import { playthroughsApi, gamesApi } from '../services/api'
import StopwatchCard from '../components/StopwatchCard'
import Loading from '../components/Loading'
import StyledDialog from '../components/StyledDialog'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Playthrough, Game } from '../types'
import DatePicker from '../components/DatePicker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
      setError(t('errors.failedLoadData'))
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
      setError(t('errors.failedCreatePlaythrough'))
    }
  }, [selectedGameId, playthroughType, startDate, playthroughs, t])

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false)
  }, [])

  const dialogActions = useMemo(() => (
    <>
      <Button onClick={handleCloseDialog} variant="outline" size="lg" className="h-12 w-full">
        {t('common.cancel')}
      </Button>
      <Button
        onClick={handleCreatePlaythrough}
        size="lg"
        className="h-12 w-full"
        disabled={!selectedGameId}
      >
        {t('playthrough.create')}
      </Button>
    </>
  ), [handleCloseDialog, handleCreatePlaythrough, selectedGameId, t])

  if (loading) {
    return <Loading />
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-h2">{t('dashboard.title')}</h1>
        <Button onClick={() => setDialogOpen(true)} disabled={games.length === 0}>
          <Plus className="size-4" />
          {t('dashboard.newPlaythrough')}
        </Button>
      </div>

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

      {games.length === 0 && (
        <Alert variant="info" className="mb-4">
          <AlertDescription>{t('errors.noGamesFound')}</AlertDescription>
        </Alert>
      )}

      {playthroughs.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-h4 text-text-secondary">{t('dashboard.noPlaythroughsMessage')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {playthroughs.map((playthrough) => (
            <StopwatchCard key={playthrough.id} playthrough={playthrough} />
          ))}
        </div>
      )}

      <StyledDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={t('playthrough.create')}
        icon={<ListPlus className="size-12" />}
        actions={dialogActions}
      >
        <div className="flex flex-col gap-4">
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('playthrough.selectGame')} />
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.id} value={String(game.id)}>{game.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={playthroughType} onValueChange={setPlaythroughType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('playthrough.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="story">{t('playthrough.typeStory')}</SelectItem>
              <SelectItem value="100%">{t('playthrough.type100')}</SelectItem>
              <SelectItem value="speedrun">{t('playthrough.typeSpeedrun')}</SelectItem>
              <SelectItem value="casual">{t('playthrough.typeCasual')}</SelectItem>
            </SelectContent>
          </Select>

          <DatePicker
            label={t('playthrough.startDate')}
            value={startDate}
            onChange={setStartDate}
            maxDate={dayjs()}
          />
        </div>
      </StyledDialog>
    </div>
  )
}

export default Dashboard
