import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { gamesApi, playthroughsApi } from '../services/api'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import { useAuthContext } from '../contexts/AuthContext'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useWeekStart } from '../contexts/WeekStartContext'
import { useTranslation } from 'react-i18next'
import { getStartOfWeek, getStartOfMonth, getStartOfYear } from '../utils/dateUtils'
import type { GameStatistics } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
      setError(err.response?.data?.message || 'Failed to load game statistics')
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
      setError(err.response?.data?.message || 'Failed to delete session')
    }
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0h 0m 0s'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    return formatDateTime(dateString)
  }

  const formatDateOnly = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
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

  const paginatedSessions = useMemo(() => {
    return filteredAndSortedSessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [filteredAndSortedSessions, page, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedSessions.length / rowsPerPage))

  const exportToCSV = () => {
    if (!statistics) return

    const rows: (string | number)[][] = []

    rows.push(['GameWatch Game Statistics Export'])
    rows.push(['Game', statistics.gameName])
    rows.push(['Export Date', new Date().toLocaleString()])
    rows.push([])

    rows.push(['Overview'])
    rows.push(['Total Playtime', formatDuration(statistics.totalPlayTimeSeconds)])
    rows.push(['Total Sessions', statistics.totalSessions.toString()])
    rows.push(['Average Session Time', formatDuration(Math.round(statistics.averageSessionTimeSeconds))])
    rows.push(['Longest Session', formatDuration(statistics.longestSessionSeconds)])
    rows.push(['Number of Replays', statistics.replaysCount.toString()])
    if (statistics.firstStartedDate) rows.push(['First Started', formatDateOnly(statistics.firstStartedDate)])
    if (statistics.lastPlayedDate) rows.push(['Last Played', formatDateOnly(statistics.lastPlayedDate)])
    if (statistics.longestCompletionSeconds) rows.push(['Longest Completion', formatDuration(statistics.longestCompletionSeconds)])
    if (statistics.shortestCompletionSeconds) rows.push(['Shortest Completion', formatDuration(statistics.shortestCompletionSeconds)])
    rows.push([])

    rows.push(['Session Details'])
    rows.push(['Session #', 'Playthrough', 'Date', 'Duration', 'Pause Count'])
    filteredAndSortedSessions.forEach(session => {
      rows.push([
        session.sessionNumber,
        session.playthroughTitle || 'N/A',
        formatDateOnly(session.sessionDate),
        formatDuration(session.sessionTimeSeconds),
        session.pauseCount || 0
      ])
    })

    const csvContent = rows.map(row =>
      row.map(cell => {
        const cellStr = String(cell ?? '')
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `gamewatch-${statistics.gameName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const statCards = [
    { label: t('statistics.gameStats.totalPlayTime'), value: formatDuration(statistics.totalPlayTimeSeconds) },
    { label: t('statistics.gameStats.totalSessions'), value: statistics.totalSessions.toString() },
    { label: t('statistics.gameStats.averageSession'), value: formatDuration(statistics.averageSessionTimeSeconds) },
    { label: t('statistics.gameStats.longestSession'), value: formatDuration(statistics.longestSessionSeconds) },
    { label: t('statistics.gameStats.replays'), value: statistics.replaysCount.toString() },
    { label: t('statistics.gameStats.firstStarted'), value: formatDateOnly(statistics.firstStartedDate) },
    { label: t('statistics.gameStats.lastPlayed'), value: formatDateOnly(statistics.lastPlayedDate) },
    { label: t('statistics.gameStats.gameAdded'), value: formatDateOnly(statistics.gameAddedDate) },
    {
      label: t('statistics.gameStats.longestCompletion'),
      value: statistics.longestCompletionSeconds ? formatDuration(statistics.longestCompletionSeconds) : t('statistics.gameStats.na')
    },
    {
      label: t('statistics.gameStats.shortestCompletion'),
      value: statistics.shortestCompletionSeconds ? formatDuration(statistics.shortestCompletionSeconds) : t('statistics.gameStats.na')
    },
  ]

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-2">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/games')} className="mr-3">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-h2 font-semibold">{statistics.gameName}</h1>
            <p className="mt-1 text-body-sm text-text-secondary">{t('statistics.gameStats.title')}</p>
          </div>
        </div>
        <Button onClick={exportToCSV} className="bg-success text-white hover:bg-success/90">
          <Download className="size-4" />
          {t('statistics.exportCSV')}
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {statCards.map((stat, index) => (
          <div key={index} className="h-full rounded-lg border border-border bg-surface/60 p-5 backdrop-blur-xl">
            <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">{stat.label}</p>
            <p className="mt-2 text-h4 font-bold text-accent">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-h4 font-semibold">{t('statistics.gameStats.dailyPlaytime')}</p>
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
        <Separator className="mb-6" />
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
                  formatter={(value: number | undefined) => [`${value || 0} ${t('statistics.gameStats.hours').toLowerCase()}`, t('statistics.gameStats.playtime')]}
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

      <div className="rounded-lg border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <p className="text-h4 font-semibold">{t('statistics.gameStats.sessionHistory')}</p>
        <Separator className="my-4" />

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative min-w-62.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('statistics.gameStats.searchSessions')}
              value={sessionSearchQuery}
              onChange={(e) => setSessionSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={sessionSortBy} onValueChange={setSessionSortBy}>
            <SelectTrigger className="w-45">
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
              <SelectTrigger className="w-50">
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
        </div>

        <div className="overflow-hidden rounded-md border border-border">
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
                {paginatedSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <p className="py-16 text-body text-text-secondary">{t('statistics.gameStats.noSessions')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSessions.map((session) => {
                    const startTime = session.startedAt ? formatTime(session.startedAt) : 'N/A'
                    const endTime = session.endedAt ? formatTime(session.endedAt) : 'N/A'

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
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-surface/30 px-4 py-2">
            <div className="flex items-center gap-2 text-caption text-text-secondary">
              <span>Rows per page:</span>
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
            <div className="flex items-center gap-3 text-caption text-text-secondary">
              <span>
                {filteredAndSortedSessions.length === 0 ? 0 : page * rowsPerPage + 1}-
                {Math.min((page + 1) * rowsPerPage, filteredAndSortedSessions.length)} of {filteredAndSortedSessions.length}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={sessionToDelete !== null}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        title="Delete Session"
        message={`Are you sure you want to delete session #${sessionToDelete?.sessionNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
      />
    </div>
  )
}

export default GameStatisticsPage
