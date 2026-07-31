import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { playthroughsApi, gamesApi } from '../services/api'
import StopwatchCard from '../components/StopwatchCard'
import CreatePlaythroughDialog from '../components/CreatePlaythroughDialog'
import Loading from '../components/Loading'
import { useAuthContext } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Playthrough, Game } from '../types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL = '__all__'

function Timers() {
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
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
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b-2 border-border/10 pb-4 sm:mb-8 sm:flex-row sm:items-center sm:pb-6">
        <div>
          <h1 className="text-h2 font-bold">{t('timers.title')}</h1>
          <p className="mt-1 text-body-sm text-text-secondary">
            {playthroughs.length} {playthroughs.length === 1 ? t('labels.timer') : t('labels.timers')} {t('labels.active')}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={games.length === 0}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" />
          {t('timers.newPlaythrough')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
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
        <Alert variant="info" className="mb-6">
          <AlertDescription>{t('errors.noGamesFound')}</AlertDescription>
        </Alert>
      )}

      {playthroughs.length > 0 && (
        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('timers.searchTimers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-9"
            />
          </div>

          <div className="flex flex-col flex-wrap gap-4 sm:flex-row">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-45">
                <SelectValue placeholder={t('timers.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">{t('timers.sortNameAsc')}</SelectItem>
                <SelectItem value="name-desc">{t('timers.sortNameDesc')}</SelectItem>
                <SelectItem value="time-desc">{t('timers.sortTimeDesc')}</SelectItem>
                <SelectItem value="time-asc">{t('timers.sortTimeAsc')}</SelectItem>
                <SelectItem value="date-desc">{t('timers.sortDateDesc')}</SelectItem>
                <SelectItem value="date-asc">{t('timers.sortDateAsc')}</SelectItem>
                <SelectItem value="sessions-desc">{t('timers.sortSessionsDesc')}</SelectItem>
                <SelectItem value="sessions-asc">{t('timers.sortSessionsAsc')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus || ALL} onValueChange={(v) => setFilterStatus(v === ALL ? '' : v)}>
              <SelectTrigger className="w-full sm:w-37.5">
                <SelectValue placeholder={t('timers.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timers.statusAll')}</SelectItem>
                <SelectItem value="active">{t('timers.statusActive')}</SelectItem>
                <SelectItem value="paused">{t('timers.statusPaused')}</SelectItem>
                <SelectItem value="completed">{t('timers.statusCompleted')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType || ALL} onValueChange={(v) => setFilterType(v === ALL ? '' : v)}>
              <SelectTrigger className="w-full sm:w-37.5">
                <SelectValue placeholder={t('timers.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timers.typeAll')}</SelectItem>
                <SelectItem value="story">{t('timers.typeStory')}</SelectItem>
                <SelectItem value="speedrun">{t('timers.typeSpeedrun')}</SelectItem>
                <SelectItem value="casual">{t('timers.typeCasual')}</SelectItem>
                <SelectItem value="100_percent">{t('timers.type100')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGame || ALL} onValueChange={(v) => setFilterGame(v === ALL ? '' : v)}>
              <SelectTrigger className="w-full sm:w-45">
                <SelectValue placeholder={t('timers.filterByGame')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timers.gameAll')}</SelectItem>
                {games
                  .filter(game => playthroughs.some(p => p.gameId === game.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((game) => (
                    <SelectItem key={game.id} value={game.id.toString()}>
                      {game.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={filterPlatform || ALL} onValueChange={(v) => setFilterPlatform(v === ALL ? '' : v)}>
              <SelectTrigger className="w-full sm:w-37.5">
                <SelectValue placeholder={t('timers.filterByPlatform')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timers.platformAll')}</SelectItem>
                {Array.from(new Set(playthroughs.map(p => p.platform).filter(Boolean)))
                  .sort()
                  .map((platform) => (
                    <SelectItem key={platform} value={platform as string}>
                      {platform}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {filteredAndSortedPlaythroughs.length === 0 ? (
        <div className="mt-12 rounded-xl border-2 border-dashed border-border/20 bg-surface/60 px-4 py-12 text-center sm:mt-16 sm:px-6 sm:py-16">
          <p className="text-body sm:text-h4 text-text-secondary">{t('timers.noPlaythroughsMessage')}</p>
          <p className="mt-1 text-body-sm text-text-secondary opacity-70">{t('labels.clickNewPlaythrough')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filteredAndSortedPlaythroughs.map((playthrough) => (
            <StopwatchCard key={playthrough.id} playthrough={playthrough} />
          ))}
        </div>
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
    </div>
  )
}

export default Timers
