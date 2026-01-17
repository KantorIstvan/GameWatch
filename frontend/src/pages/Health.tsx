import { useEffect, useState, useRef } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  Tooltip as MuiTooltip,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material'
import {
  Mood,
  SelfImprovement,
  NightsStay,
  TrendingUp,
  Info,
} from '@mui/icons-material'
import CalHeatmap from 'cal-heatmap'
import 'cal-heatmap/cal-heatmap.css'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import LegendLite from 'cal-heatmap/plugins/LegendLite'
import healthApi, { HealthDashboard } from '../services/healthApi'
import { useAuthContext } from '../contexts/AuthContext'

function getScoreColor(score: number | null) {
  if (score === null) return '#9e9e9e'
  if (score >= 81) return '#4caf50'
  if (score >= 61) return '#81c784'
  if (score >= 41) return '#ffeb3b'
  if (score >= 21) return '#ff9800'
  return '#ef5350'
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${secs}s`
}

export default function Health() {
  const theme = useTheme()
  const { isAuthReady, isAuthenticated } = useAuthContext()
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const calHeatmapRef = useRef<HTMLDivElement>(null)
  const calInstanceRef = useRef<CalHeatmap | null>(null)

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      loadDashboard()
    }
  }, [isAuthReady, isAuthenticated])

  useEffect(() => {
    if (dashboard && calHeatmapRef.current) {
      initializeHeatmap()
    }

    return () => {
      if (calInstanceRef.current) {
        calInstanceRef.current.destroy()
      }
    }
  }, [dashboard, theme.palette.mode])

  const initializeHeatmap = () => {
    if (!calHeatmapRef.current || !dashboard) return

    // Destroy existing instance
    if (calInstanceRef.current) {
      calInstanceRef.current.destroy()
    }

    // Convert data to array format with proper date parsing
    const heatmapData = Object.entries(dashboard.yearlyHeatmap).map(([dateStr, score]) => {
      // Parse the date string (YYYY-MM-DD) and create date at noon UTC to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
      const timestamp = date.getTime()
      return { date: timestamp, value: score }
    })

    const isDark = theme.palette.mode === 'dark'
    
    const cal = new CalHeatmap()
    calInstanceRef.current = cal

    const today = new Date()
    // Set start date to January 1st of the current year at noon to avoid timezone issues
    const startDate = new Date(today.getFullYear(), 0, 1, 12, 0, 0)

    cal.paint({
      itemSelector: calHeatmapRef.current,
      data: {
        source: heatmapData,
        x: 'date',
        y: (d: any) => d.value,
      },
      date: { 
        start: startDate,
        locale: { weekStart: 1 }
      },
      range: 12,
      scale: {
        color: {
          type: 'threshold',
          range: [
            isDark ? '#2a2a2a' : '#f0f0f0',
            '#ef5350',
            '#ff9800', 
            '#ffeb3b',
            '#81c784',
            '#4caf50',
          ],
          domain: [1, 21, 41, 61, 81],
        },
      },
      domain: {
        type: 'month',
        gutter: 10,
        label: { 
          text: 'MMM',
          textAlign: 'start',
          position: 'top',
        },
      },
      subDomain: { 
        type: 'day',
        radius: 4,
        width: 16,
        height: 16,
        gutter: 5,
      },
    }, [
      [
        Tooltip,
        {
          text: (timestamp: number, value: number | null) => {
            const date = new Date(timestamp)
            const formattedDate = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
            return `${formattedDate}: ${value !== null && value !== undefined ? `Score ${value}` : 'No data'}`
          },
        },
      ],
      [
        LegendLite,
        {
          itemSelector: '#legend',
          label: 'Health Score',
        },
      ],
    ])
  }

  const loadDashboard = async () => {
    try {
      const response = await healthApi.getHealthDashboard()
      setDashboard(response.data)
    } catch (error) {
      console.error('Failed to load health dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthReady || loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  if (!dashboard) {
    return (
      <Box>
        <Box sx={{ my: 4 }}>
          <Typography variant="h5" color="text.secondary">
            No health data available yet. Start gaming to track your health!
          </Typography>
        </Box>
      </Box>
    )
  }

  const currentScore = dashboard.currentHealthScore
  const scoreColor = getScoreColor(currentScore)

  return (
    <Box sx={{ my: 4 }}>
      <Box sx={{ my: 4 }}>
        {/* Page Title */}
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 4,
            color: theme.palette.mode === 'light' ? '#212529' : '#ffffff'
          }}
        >
          Health Dashboard
        </Typography>

        {/* Top Section: Health Score Card + Weekly Trend */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Health Score Card */}
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}05)`,
                border: `2px solid ${scoreColor}40`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    Today's Health Score
                  </Typography>
                  <MuiTooltip title="Health score is calculated based on hours played, sessions, breaks, mood, and late-night gaming">
                    <IconButton size="small">
                      <Info />
                    </IconButton>
                  </MuiTooltip>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography 
                      variant="h1" 
                      sx={{ 
                        fontWeight: 700, 
                        color: scoreColor,
                        fontSize: '4rem',
                        mr: 2,
                      }}
                    >
                      {currentScore !== null ? currentScore : '--'}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>
                </Box>

              </Box>
            </Paper>
          </Grid>

          {/* Weekly Average & Trend */}
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: theme.palette.mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(33, 37, 41, 0.5)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: '#667eea' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Weekly Trend
                </Typography>
              </Box>

              {dashboard.weeklyAverageScore !== null ? (
                <>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: getScoreColor(Math.round(dashboard.weeklyAverageScore)) }}>
                    {Math.round(dashboard.weeklyAverageScore)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Average score this week
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 80 }}>
                    {dashboard.last7DaysScores.map((score, index) => (
                      <Box
                        key={index}
                        sx={{
                          flex: 1,
                          height: `${score}%`,
                          minHeight: '8px',
                          bgcolor: getScoreColor(score),
                          borderRadius: 1,
                          transition: 'all 0.3s',
                          '&:hover': {
                            opacity: 0.8,
                            transform: 'translateY(-4px)',
                          },
                        }}
                      />
                    ))}
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">
                  Not enough data yet. Keep gaming!
                </Typography>
              )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Heatmap */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            mb: 3,
            bgcolor: theme.palette.mode === 'light' 
              ? 'rgba(255, 255, 255, 0.9)' 
              : 'rgba(33, 37, 41, 0.5)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'light' 
              ? 'rgba(0, 0, 0, 0.1)' 
              : 'rgba(255, 255, 255, 0.1)',
            '& .ch-domain-text': {
              fill: theme.palette.mode === 'light' ? '#495057' : '#adb5bd',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
            },
            '& .ch-subdomain-bg': {
              fill: theme.palette.mode === 'light' ? '#f8f9fa' : '#1a1d23',
            },
            '& .ch-plugin-legend-lite': {
              fill: theme.palette.mode === 'light' ? '#495057' : '#adb5bd',
            },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Year Overview
          </Typography>
          <Box 
            ref={calHeatmapRef} 
            sx={{ 
              overflowX: 'auto',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: theme.palette.mode === 'light' ? '#f1f1f1' : '#2a2a2a',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'light' ? '#667eea' : '#8b9af7',
                borderRadius: '4px',
                '&:hover': {
                  background: theme.palette.mode === 'light' ? '#5568d3' : '#7684e0',
                },
              },
            }}
          />
          <Box 
            id="legend" 
            sx={{ 
              mt: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              '& .ch-plugin-legend-lite': {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              },
            }} 
          />
        </Paper>

        {/* Metrics Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: theme.palette.mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(33, 37, 41, 0.5)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SelfImprovement sx={{ mr: 1, color: '#667eea' }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Break Compliance
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {dashboard.weekMetrics.breakCompliance !== null
                    ? Math.round(dashboard.weekMetrics.breakCompliance * 100)
                    : '--'}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sessions with breaks this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: theme.palette.mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(33, 37, 41, 0.5)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Mood sx={{ mr: 1, color: '#f59e0b' }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Average Mood
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {dashboard.weekMetrics.averageMood !== null
                    ? dashboard.weekMetrics.averageMood.toFixed(1)
                    : '--'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Out of 5.0 this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: theme.palette.mode === 'light' 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(33, 37, 41, 0.5)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NightsStay sx={{ mr: 1, color: '#8b5cf6' }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Late Night Gaming
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {Math.floor(dashboard.weekMetrics.lateNightMinutes / 60)}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  After 22:00 this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Goals Panel */}
        {dashboard.goalProgress.goalsEnabled && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              mb: 3,
              bgcolor: theme.palette.mode === 'light' 
                ? 'rgba(255, 255, 255, 0.9)' 
                : 'rgba(33, 37, 41, 0.5)',
              border: '1px solid',
              borderColor: theme.palette.mode === 'light' 
                ? 'rgba(0, 0, 0, 0.1)' 
                : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Goal Progress
            </Typography>

            <Grid container spacing={3}>
              {dashboard.goalProgress.maxHoursPerDayEnabled && dashboard.goalProgress.maxHoursPerDay && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Hours Today
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (dashboard.goalProgress.hoursToday / dashboard.goalProgress.maxHoursPerDay) * 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1,
                      bgcolor: theme.palette.mode === 'light' ? '#f0f0f0' : '#3a3a3a',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: dashboard.goalProgress.hoursToday > dashboard.goalProgress.maxHoursPerDay 
                          ? '#ef5350' 
                          : '#4caf50',
                      },
                    }}
                  />
                  <Typography variant="body2">
                    {dashboard.goalProgress.hoursToday.toFixed(1)} / {dashboard.goalProgress.maxHoursPerDay} hours
                  </Typography>
                </Grid>
              )}

              {dashboard.goalProgress.maxSessionsPerDayEnabled && dashboard.goalProgress.maxSessionsPerDay && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Sessions Today
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (dashboard.goalProgress.sessionsToday / dashboard.goalProgress.maxSessionsPerDay) * 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1,
                      bgcolor: theme.palette.mode === 'light' ? '#f0f0f0' : '#3a3a3a',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: dashboard.goalProgress.sessionsToday > dashboard.goalProgress.maxSessionsPerDay 
                          ? '#ef5350' 
                          : '#4caf50',
                      },
                    }}
                  />
                  <Typography variant="body2">
                    {dashboard.goalProgress.sessionsToday} / {dashboard.goalProgress.maxSessionsPerDay} sessions
                  </Typography>
                </Grid>
              )}

              {dashboard.goalProgress.maxHoursPerWeekEnabled && dashboard.goalProgress.maxHoursPerWeek && (
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Hours This Week
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (dashboard.goalProgress.hoursThisWeek / dashboard.goalProgress.maxHoursPerWeek) * 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1,
                      bgcolor: theme.palette.mode === 'light' ? '#f0f0f0' : '#3a3a3a',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: dashboard.goalProgress.hoursThisWeek > dashboard.goalProgress.maxHoursPerWeek 
                          ? '#ef5350' 
                          : '#4caf50',
                      },
                    }}
                  />
                  <Typography variant="body2">
                    {dashboard.goalProgress.hoursThisWeek.toFixed(1)} / {dashboard.goalProgress.maxHoursPerWeek} hours
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Recent Sessions */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'light' 
              ? 'rgba(255, 255, 255, 0.9)' 
              : 'rgba(33, 37, 41, 0.5)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'light' 
              ? 'rgba(0, 0, 0, 0.1)' 
              : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Recent Sessions
          </Typography>

          {dashboard.recentSessions.length > 0 ? (
            <Box>
              {dashboard.recentSessions.slice(0, 5).map((session) => (
                <Box
                  key={session.sessionId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: theme.palette.mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.1)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {session.gameName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDuration(session.durationSeconds)} •{' '}
                      {new Date(session.endedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {session.moodRating && (
                    <Chip
                      label={`Mood: ${session.moodRating}/5`}
                      size="small"
                      sx={{
                        bgcolor: 
                          session.moodRating >= 4 ? '#4caf5020' :
                          session.moodRating >= 3 ? '#ff980020' :
                          '#ef535020',
                        color:
                          session.moodRating >= 4 ? '#4caf50' :
                          session.moodRating >= 3 ? '#ff9800' :
                          '#ef5350',
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">
              No sessions recorded yet.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
