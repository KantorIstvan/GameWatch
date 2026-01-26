import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  alpha,
  useTheme,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  TablePagination
} from '@mui/material'
import { ArrowBack, Search, Delete, Download } from '@mui/icons-material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { gamesApi, playthroughsApi } from '../services/api'
import Loading from '../components/Loading'
import ConfirmModal from '../components/ConfirmModal'
import { useAuthContext } from '../contexts/AuthContext'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { useTranslation } from 'react-i18next'
import { getStartOfWeek, getStartOfMonth, getStartOfYear } from '../utils/dateUtils'
import type { GameStatistics } from '../types'

function GameStatisticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthReady } = useAuthContext()
  const { t } = useTranslation()
  const theme = useTheme()
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
        // Current calendar week (Monday to today)
        cutoffDate = getStartOfWeek(now)
        break
      case 'month':
        // Current calendar month (1st to today)
        cutoffDate = getStartOfMonth(now)
        break
      case 'year':
        // Current calendar year (Jan 1 to today)
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

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

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
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
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
    <Box sx={{ maxWidth: 1800, mx: 'auto', px: 3, py: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => navigate('/games')} 
            sx={{ 
              mr: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1)
              }
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="600">
              {statistics.gameName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('statistics.gameStats.title')}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={exportToCSV}
          sx={{
            bgcolor: theme.palette.success.main,
            color: 'white',
            '&:hover': {
              bgcolor: theme.palette.success.dark
            },
            px: 2,
            borderRadius: 2
          }}
        >
          <Download sx={{ mr: 1 }} />
          <Typography variant="button">{t('statistics.exportCSV')}</Typography>
        </IconButton>
      </Box>

      {/* Key Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={6} sm={4} md={2.4} key={index}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 2,
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                  borderColor: alpha(theme.palette.primary.main, 0.3)
                }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography 
                  variant="h5" 
                  fontWeight="700" 
                  sx={{ mt: 1, color: theme.palette.primary.main }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Playtime Chart */}
      <Card 
        elevation={0}
        sx={{ 
          mb: 4,
          borderRadius: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 2,
            gap: 2
          }}>
            <Typography variant="h6" fontWeight="600">
              {t('statistics.gameStats.dailyPlaytime')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <InputLabel>{t('statistics.gameStats.timeRange')}</InputLabel>
              <Select
                value={timeInterval}
                label={t('statistics.gameStats.timeRange')}
                onChange={(e) => setTimeInterval(e.target.value as 'week' | 'month' | 'year' | 'all')}
              >
                <MenuItem value="week">{t('statistics.gameStats.oneWeek')}</MenuItem>
                <MenuItem value="month">{t('statistics.gameStats.oneMonth')}</MenuItem>
                <MenuItem value="year">{t('statistics.gameStats.oneYear')}</MenuItem>
                <MenuItem value="all">{t('statistics.gameStats.all')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Divider sx={{ mb: 3 }} />
          {chartData.length > 0 ? (
            <Box
              sx={{
                width: '100%',
                height: { xs: 300, sm: 350 },
                '& .recharts-cartesian-axis-tick-value': {
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                },
                '& .recharts-label': {
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }
              }}
            >
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
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: window.innerWidth < 600 ? '0.65rem' : '0.75rem' }}
                    angle={-45}
                    textAnchor="end"
                    height={window.innerWidth < 600 ? 70 : 80}
                    interval={window.innerWidth < 600 ? 'preserveStartEnd' : 0}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
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
                      backgroundColor: alpha(theme.palette.background.paper, 0.95),
                      border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                      borderRadius: 8,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`
                    }}
                    labelStyle={{ color: theme.palette.text.primary, fontWeight: 600 }}
                    formatter={(value: number | undefined) => [`${value || 0} ${t('statistics.gameStats.hours').toLowerCase()}`, t('statistics.gameStats.playtime')]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('statistics.gameStats.noChartData')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Session History Table */}
      <Card 
        elevation={0}
        sx={{
          borderRadius: 2,
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" gutterBottom>
            {t('statistics.gameStats.sessionHistory')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {/* Search and Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder={t('statistics.gameStats.searchSessions')}
              value={sessionSearchQuery}
              onChange={(e) => setSessionSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('statistics.gameStats.sortBy')}</InputLabel>
              <Select
                value={sessionSortBy}
                label={t('statistics.gameStats.sortBy')}
                onChange={(e) => setSessionSortBy(e.target.value)}
              >
                <MenuItem value="date-desc">{t('statistics.gameStats.sortDateDesc')}</MenuItem>
                <MenuItem value="date-asc">{t('statistics.gameStats.sortDateAsc')}</MenuItem>
                <MenuItem value="duration-desc">{t('statistics.gameStats.sortDurationDesc')}</MenuItem>
                <MenuItem value="duration-asc">{t('statistics.gameStats.sortDurationAsc')}</MenuItem>
              </Select>
            </FormControl>
            
            {availablePlaythroughs.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>{t('statistics.gameStats.filterByPlaythrough')}</InputLabel>
                <Select
                  value={sessionFilterPlaythrough}
                  label={t('statistics.gameStats.filterByPlaythrough')}
                  onChange={(e) => setSessionFilterPlaythrough(e.target.value)}
                >
                  <MenuItem value="">{t('statistics.gameStats.allPlaythroughs')}</MenuItem>
                  {availablePlaythroughs.map((playthrough) => (
                    <MenuItem key={playthrough} value={playthrough}>{playthrough}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          
          {/* MUI Table */}
          <Paper 
            elevation={0}
            sx={{ 
              width: '100%', 
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 1
            }}
          >
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader aria-label="session history table">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.sessionNumber')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.dateTime')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.startTime')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.endTime')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.playthrough')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.duration')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }}
                    >
                      {t('statistics.gameStats.pauses')}
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        fontWeight: 700,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.default
                          : theme.palette.grey[100],
                        borderBottom: `2px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary,
                        width: 80
                      }}
                    >
                      {t('statistics.gameStats.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box sx={{ py: 8 }}>
                          <Typography color="text.secondary" variant="body1">
                            {t('statistics.gameStats.noSessions')}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSessions.map((session, index) => {
                      const startTime = session.startedAt ? formatTime(session.startedAt) : 'N/A'
                      const endTime = session.endedAt ? formatTime(session.endedAt) : 'N/A'
                      
                      return (
                        <TableRow 
                          key={`${session.playthroughId}-${session.sessionNumber}`}
                          hover
                          sx={{ 
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.05),
                              cursor: 'pointer'
                            },
                            '&:last-child td, &:last-child th': { 
                              border: 0 
                            },
                            backgroundColor: index % 2 === 0 
                              ? 'transparent' 
                              : alpha(theme.palette.action.hover, 0.02)
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip
                                label={`#${session.sessionNumber}`}
                                size="small"
                                sx={{
                                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                                  color: theme.palette.info.main,
                                  fontWeight: 600,
                                  minWidth: 50
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.primary">
                              {formatDate(session.sessionDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace', 
                                color: 'text.secondary',
                                fontSize: '0.875rem'
                              }}
                            >
                              {startTime}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace', 
                                color: 'text.secondary',
                                fontSize: '0.875rem'
                              }}
                            >
                              {endTime}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={session.playthroughTitle} 
                              size="small" 
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 500,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontWeight="600"
                              color="text.primary"
                            >
                              {formatDuration(session.sessionTimeSeconds)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={session.pauseCount || 0}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                color: theme.palette.warning.main,
                                fontWeight: 500,
                                minWidth: 40
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => setSessionToDelete({
                                sessionId: session.sessionId,
                                playthroughId: session.playthroughId,
                                sessionNumber: session.sessionNumber
                              })}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredAndSortedSessions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.background.default, 0.3)
              }}
            />
          </Paper>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
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
    </Box>
  )
}

export default GameStatisticsPage
