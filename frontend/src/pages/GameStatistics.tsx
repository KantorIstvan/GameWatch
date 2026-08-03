import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, SlidersHorizontal, Trash2, Download, ChevronLeft, ChevronRight,
  Timer, CalendarDays, Clock, RotateCcw, PlayCircle, History, PlusCircle, Trophy, Zap
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { gamesApi, playthroughsApi } from '../services/api'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import StatCard from '../components/StatCard'
import GameRatingPanel from '../components/ratings/GameRatingPanel'
import GameReviewsPanel from '../components/ratings/GameReviewsPanel'
import GameCommunityPanel from '../components/ratings/GameCommunityPanel'
import { useAuthContext } from '../contexts/AuthContext'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useWeekStart } from '../contexts/WeekStartContext'
import { useTranslation } from 'react-i18next'
import { getStartOfWeek, getStartOfMonth, getStartOfYear } from '../utils/dateUtils'
import { formatDurationWords } from '../utils/formatters'
import type { GameStatistics } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ALL = '__all__'

function GameStatisticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const { weekStart } = useWeekStart()
  const { formatTime, formatDateTime } = useTimeFormat()
  const [statistics, setStatistics] = useState<GameStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionSortBy, setSessionSortBy] = useState('date-desc')
  const [sessionFilterPlaythrough, setSessionFilterPlaythrough] = useState('')
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')
  const [timeInterval, setTimeInterval] = useState<'week' | 'month' | 'year' | 'all'>('all')
  const [sessionToDelete, setSessionToDelete] = useState<{ sessionId?: number, playthroughId: number, sessionNumber: number } | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  useEffect(() => {
    if (isAuthReady && id) {
      fetchStatistics()
    }
  }, [isAuthReady, id])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const response = await gamesApi.getStatistics(Number(id))
      setStatistics(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || t('statistics.gameStats.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !sessionToDelete.sessionId) return

    try {
      await playthroughsApi.deleteSession(sessionToDelete.playthroughId, sessionToDelete.sessionId)
      await fetchStatistics()
      setSessionToDelete(null)
    } catch (err: any) {
      setError(err.response?.data?.message || t('statistics.gameStats.failedToDeleteSession'))
    }
  }

  const formatDuration = (seconds: number): string => formatDurationWords(seconds, t)

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return t('statistics.gameStats.na')
    return formatDateTime(dateString)
  }

  const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return t('statistics.gameStats.na')
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const aggregateDataByDate = () => {
    const dataByDate: { [key: string]: number } = {}

    statistics?.sessions.forEach(session => {
      if (session.sessionDate) {
        const date = new Date(session.sessionDate).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
        dataByDate[date] = (dataByDate[date] || 0) + session.sessionTimeSeconds
      }
    })

    return Object.entries(dataByDate)
      .map(([date, seconds]) => ({
        date,
        hours: Number((seconds / 3600).toFixed(2)),
        minutes: Math.floor(seconds / 60)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filterDataByTimeInterval = (data: { date: string; hours: number }[]) => {
    if (timeInterval === 'all') return data

    const now = new Date()
    let cutoffDate: Date

    switch (timeInterval) {
      case 'week':
        cutoffDate = getStartOfWeek(now, weekStart)
        break
      case 'month':
        cutoffDate = getStartOfMonth(now)
        break
      case 'year':
        cutoffDate = getStartOfYear(now)
        break
      default:
        return data
    }

    return data.filter(item => new Date(item.date) >= cutoffDate)
  }

  const rawChartData = statistics ? aggregateDataByDate() : []
  const chartData = filterDataByTimeInterval(rawChartData)

  const availablePlaythroughs = useMemo(() => {
    if (!statistics) return []
    const playthroughs = new Set(statistics.sessions.map(s => s.playthroughTitle))
    return Array.from(playthroughs).sort()
  }, [statistics])

  const filteredAndSortedSessions = useMemo(() => {
    if (!statistics) return []

    let sessions = [...statistics.sessions]

    if (sessionFilterPlaythrough) {
      sessions = sessions.filter(s => s.playthroughTitle === sessionFilterPlaythrough)
    }

    if (sessionSearchQuery) {
      const query = sessionSearchQuery.toLowerCase()
      sessions = sessions.filter(s =>
        s.playthroughTitle.toLowerCase().includes(query) ||
        s.sessionNumber.toString().includes(query)
      )
    }

    sessions.sort((a, b) => {
      switch (sessionSortBy) {
        case 'date-desc':
          return new Date(b.sessionDate || '').getTime() - new Date(a.sessionDate || '').getTime()
        case 'date-asc':
          return new Date(a.sessionDate || '').getTime() - new Date(b.sessionDate || '').getTime()
        case 'duration-desc':
          return b.sessionTimeSeconds - a.sessionTimeSeconds
        case 'duration-asc':
          return a.sessionTimeSeconds - b.sessionTimeSeconds
        case 'session-desc':
          return b.sessionNumber - a.sessionNumber
        case 'session-asc':
          return a.sessionNumber - b.sessionNumber
        default:
          return 0
      }
    })

    return sessions
  }, [statistics, sessionSortBy, sessionFilterPlaythrough, sessionSearchQuery])

  const hasActiveSessionFilters = Boolean(
    sessionSearchQuery || sessionFilterPlaythrough || sessionSortBy !== 'date-desc'
  )

  const clearSessionFilters = useCallback(() => {
    setSessionSearchQuery('')
    setSessionFilterPlaythrough('')
    setSessionSortBy('date-desc')
  }, [])

  const paginatedSessions = useMemo(() => {
    return filteredAndSortedSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredAndSortedSessions, page, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSessions.length / rowsPerPage))

  const handleExport = async () => {
    if (!statistics) return
    const { exportGameStatisticsToXlsx } = await import('../utils/xlsxExport')
    exportGameStatisticsToXlsx(statistics, filteredAndSortedSessions, t)
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!statistics) return null

  // Bento hierarchy matching the Statistics page's pattern: one hero tile for the
  // single most important number (total play time), one wide secondary tile for the
  // next most important (total sessions), and the rest as uniform, neutral small
  // tiles rather than coloring or sizing every stat the same.
  const heroStat = {
    label: t('statistics.gameStats.totalPlayTime'),
    value: formatDuration(statistics.totalPlayTimeSeconds),
    icon: <Timer className="size-6" />,
  }

  const secondaryStat = {
    label: t('statistics.gameStats.totalSessions'),
    value: statistics.totalSessions.toString(),
    icon: <CalendarDays className="size-5" />,
  }

  const statCards = [
    { label: t('statistics.gameStats.averageSession'), value: formatDuration(statistics.averageSessionTimeSeconds), icon: <Clock className="size-5" /> },
    { label: t('statistics.gameStats.longestSession'), value: formatDuration(statistics.longestSessionSeconds), icon: <Trophy className="size-5" /> },
    { label: t('statistics.gameStats.replays'), value: statistics.replaysCount.toString(), icon: <RotateCcw className="size-5" /> },
    { label: t('statistics.gameStats.firstStarted'), value: formatDateOnly(statistics.firstStartedDate), icon: <PlayCircle className="size-5" /> },
    { label: t('statistics.gameStats.lastPlayed'), value: formatDateOnly(statistics.lastPlayedDate), icon: <History className="size-5" /> },
    { label: t('statistics.gameStats.gameAdded'), value: formatDateOnly(statistics.gameAddedDate), icon: <PlusCircle className="size-5" /> },
    {
      label: t('statistics.gameStats.longestCompletion'),
      value: statistics.longestCompletionSeconds ? formatDuration(statistics.longestCompletionSeconds) : t('statistics.gameStats.na'),
      icon: <Trophy className="size-5" />
    },
    {
      label: t('statistics.gameStats.shortestCompletion'),
      value: statistics.shortestCompletionSeconds ? formatDuration(statistics.shortestCompletionSeconds) : t('statistics.gameStats.na'),
      icon: <Zap className="size-5" />
    },
  ]

  return (
    <div className="mx-auto max-w-8xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/games')} className="mr-3">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-h2 font-bold">{statistics.gameName}</h1>
            <p className="mt-1 text-body-sm text-text-secondary">{t('statistics.gameStats.title')}</p>
          </div>
        </div>
        <Button onClick={handleExport} className="bg-success text-white hover:bg-success/90">
          <Download className="size-4" />
          {t('statistics.exportCSV')}
        </Button>
      </div>

      <section className="mb-6 md:mb-8">
        <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('statistics.gameStats.overview')}</p>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          <StatCard
            hero
            className="col-span-2 md:row-span-2"
            title={heroStat.label}
            value={heroStat.value}
            icon={heroStat.icon}
            color="var(--color-success)"
          />
          <StatCard
            className="col-span-2 md:row-span-2"
            title={secondaryStat.label}
            value={secondaryStat.value}
            icon={secondaryStat.icon}
            color="var(--color-accent)"
          />
          {statCards.map((stat, index) => (
            <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </div>
      </section>

      <section className="mb-6 md:mb-8">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:mb-4 sm:flex-row sm:items-center">
          <p className="text-body-lg font-bold">{t('statistics.gameStats.dailyPlaytime')}</p>
          <Select value={timeInterval} onValueChange={(v) => setTimeInterval(v as any)}>
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder={t('statistics.gameStats.timeRange')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('statistics.gameStats.oneWeek')}</SelectItem>
              <SelectItem value="month">{t('statistics.gameStats.oneMonth')}</SelectItem>
              <SelectItem value="year">{t('statistics.gameStats.oneYear')}</SelectItem>
              <SelectItem value="all">{t('statistics.gameStats.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6">
          {chartData.length > 0 ? (
            <div className="h-75 w-full sm:h-87.5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: window.innerWidth < 600 ? 5 : 30,
                    left: window.innerWidth < 600 ? -20 : 0,
                    bottom: window.innerWidth < 600 ? 40 : 0
                  }}
                >
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: window.innerWidth < 600 ? '0.65rem' : '0.75rem' }}
                    angle={-45}
                    textAnchor="end"
                    height={window.innerWidth < 600 ? 70 : 80}
                    interval={window.innerWidth < 600 ? 'preserveStartEnd' : 0}
                  />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: window.innerWidth < 600 ? '0.65rem' : '0.75rem' }}
                    width={window.innerWidth < 600 ? 35 : 60}
                    label={window.innerWidth >= 600 ? {
                      value: t('statistics.gameStats.hours'),
                      angle: -90,
                      position: 'insideLeft'
                    } : undefined}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                    formatter={(value: number | undefined) => [formatDurationWords(Math.round((value || 0) * 3600), t), t('statistics.gameStats.playtime')]}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-text-secondary">{t('statistics.gameStats.noChartData')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 md:mb-8">
        <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('statistics.gameStats.sessionHistory')}</p>

        <div className="rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6">
          {(() => {
            const sessionFilterFields = (
              <>
                <Select value={sessionSortBy} onValueChange={setSessionSortBy}>
                  <SelectTrigger className="h-12 w-full md:h-9 md:w-45">
                    <SelectValue placeholder={t('statistics.gameStats.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">{t('statistics.gameStats.sortDateDesc')}</SelectItem>
                    <SelectItem value="date-asc">{t('statistics.gameStats.sortDateAsc')}</SelectItem>
                    <SelectItem value="duration-desc">{t('statistics.gameStats.sortDurationDesc')}</SelectItem>
                    <SelectItem value="duration-asc">{t('statistics.gameStats.sortDurationAsc')}</SelectItem>
                  </SelectContent>
                </Select>

                {availablePlaythroughs.length > 1 && (
                  <Select value={sessionFilterPlaythrough || ALL} onValueChange={(v) => setSessionFilterPlaythrough(v === ALL ? '' : v)}>
                    <SelectTrigger className="h-12 w-full md:h-9 md:w-50">
                      <SelectValue placeholder={t('statistics.gameStats.filterByPlaythrough')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>{t('statistics.gameStats.allPlaythroughs')}</SelectItem>
                      {availablePlaythroughs.map((playthrough) => (
                        <SelectItem key={playthrough} value={playthrough}>{playthrough}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )

            return (
              <div className="mb-6">
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1 md:max-w-62.5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('statistics.gameStats.searchSessions')}
                      value={sessionSearchQuery}
                      onChange={(e) => setSessionSearchQuery(e.target.value)}
                      className="h-12 pl-9 md:h-9"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-12 w-12 shrink-0 md:hidden"
                    onClick={() => setFilterSheetOpen(true)}
                    aria-label={t('statistics.gameStats.filters')}
                  >
                    <SlidersHorizontal className="size-4.5" />
                    {hasActiveSessionFilters && (
                      <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" aria-hidden="true" />
                    )}
                  </Button>

                  <div className="hidden items-center gap-4 md:flex">
                    {sessionFilterFields}
                    {hasActiveSessionFilters && (
                      <Button size="sm" variant="ghost" onClick={clearSessionFilters}>
                        {t('statistics.gameStats.clearFilters')}
                      </Button>
                    )}
                  </div>
                </div>

                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetContent side="bottom" className="md:hidden">
                    <SheetHeader>
                      <SheetTitle>{t('statistics.gameStats.filters')}</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-3 px-4 pb-2">{sessionFilterFields}</div>
                    <SheetFooter className="flex-row gap-3">
                      <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={clearSessionFilters}
                        disabled={!hasActiveSessionFilters}
                      >
                        {t('statistics.gameStats.clearFilters')}
                      </Button>
                      <Button className="h-12 flex-1" onClick={() => setFilterSheetOpen(false)}>
                        {t('games.showResults')}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            )
          })()}

          {paginatedSessions.length === 0 ? (
            <p className="py-16 text-center text-body text-text-secondary">{t('statistics.gameStats.noSessions')}</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:hidden">
                {paginatedSessions.map((session) => {
                  const startTime = session.startedAt ? formatTime(session.startedAt) : t('statistics.gameStats.na')
                  const endTime = session.endedAt ? formatTime(session.endedAt) : t('statistics.gameStats.na')

                  return (
                    <div
                      key={`${session.playthroughId}-${session.sessionNumber}`}
                      className="rounded-lg border border-border bg-surface/60 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-text-secondary/10 font-semibold text-text-secondary">
                            #{session.sessionNumber}
                          </Badge>
                          <Badge variant="outline" className="border-accent/20 bg-accent/10 font-medium text-accent">
                            {session.playthroughTitle}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSessionToDelete({
                            sessionId: session.sessionId,
                            playthroughId: session.playthroughId,
                            sessionNumber: session.sessionNumber
                          })}
                          className="size-11 shrink-0 text-destructive hover:bg-destructive/10"
                          aria-label={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <p className="text-h4 font-bold text-text-primary">{formatDuration(session.sessionTimeSeconds)}</p>
                      <p className="text-body-sm text-text-secondary">{formatDate(session.sessionDate)}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-secondary">
                        <span className="font-mono">{startTime} – {endTime}</span>
                        {(session.pauseCount || 0) > 0 && (
                          <span>
                            {session.pauseCount} {session.pauseCount === 1
                              ? t('statistics.gameStats.breakSingular')
                              : t('statistics.gameStats.breaksShort')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden overflow-hidden rounded-md border border-border md:block">
                <div className="max-h-125 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-surface-raised hover:bg-surface-raised">
                        <TableHead>{t('statistics.gameStats.sessionNumber')}</TableHead>
                        <TableHead>{t('statistics.gameStats.dateTime')}</TableHead>
                        <TableHead>{t('statistics.gameStats.startTime')}</TableHead>
                        <TableHead>{t('statistics.gameStats.endTime')}</TableHead>
                        <TableHead>{t('statistics.gameStats.playthrough')}</TableHead>
                        <TableHead>{t('statistics.gameStats.duration')}</TableHead>
                        <TableHead>{t('statistics.gameStats.pauses')}</TableHead>
                        <TableHead className="w-20 text-center">{t('statistics.gameStats.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSessions.map((session) => {
                        const startTime = session.startedAt ? formatTime(session.startedAt) : t('statistics.gameStats.na')
                        const endTime = session.endedAt ? formatTime(session.endedAt) : t('statistics.gameStats.na')

                        return (
                          <TableRow key={`${session.playthroughId}-${session.sessionNumber}`}>
                            <TableCell>
                              <Badge className="min-w-12.5 bg-text-secondary/10 font-semibold text-text-secondary">
                                #{session.sessionNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-text-primary">{formatDate(session.sessionDate)}</TableCell>
                            <TableCell className="font-mono text-body-sm text-text-secondary">{startTime}</TableCell>
                            <TableCell className="font-mono text-body-sm text-text-secondary">{endTime}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-accent/20 bg-accent/10 font-medium text-accent">
                                {session.playthroughTitle}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-text-primary">{formatDuration(session.sessionTimeSeconds)}</TableCell>
                            <TableCell>
                              <Badge className="min-w-10 bg-text-secondary/10 font-medium text-text-secondary">
                                {session.pauseCount || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setSessionToDelete({
                                  sessionId: session.sessionId,
                                  playthroughId: session.playthroughId,
                                  sessionNumber: session.sessionNumber
                                })}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-caption text-text-secondary">
              <span>{t('statistics.gameStats.rowsPerPage')}</span>
              <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0) }}>
                <SelectTrigger className="h-8 w-18">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 text-caption text-text-secondary">
              <span>
                {t('statistics.gameStats.rangeOfTotal', {
                  from: filteredAndSortedSessions.length === 0 ? 0 : page * rowsPerPage + 1,
                  to: Math.min((page + 1) * rowsPerPage, filteredAndSortedSessions.length),
                  total: filteredAndSortedSessions.length,
                })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Last, because it is the part of the page that is not about this user's own play:
          the numbers they came for come first, other people's opinions after. */}
      <section>
        <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('statistics.gameStats.community')}</p>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4 sm:gap-5">
            <GameRatingPanel gameId={statistics.gameId} />
            <GameCommunityPanel gameId={statistics.gameId} />
          </div>
          <GameReviewsPanel gameId={statistics.gameId} />
        </div>
      </section>

      <ConfirmModal
        open={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        title={t('statistics.gameStats.deleteSessionTitle')}
        message={t('statistics.gameStats.deleteSessionConfirm', { sessionNumber: sessionToDelete?.sessionNumber })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        confirmColor="error"
      />
    </div>
  )
}

export default GameStatisticsPage
