import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Alert,
  useTheme,
  alpha,
  Button,
} from '@mui/material'
import {
  Timer,
  SportsEsports,
  CheckCircle,
  PlayCircle,
  AccessTime,
  CalendarMonth,
  Code,
  Business,
  Download,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime, formatTimeDetailed } from '../utils/formatters'
import { exportStatisticsToCSV } from '../utils/csvExport'
import { useStatistics } from '../hooks/useStatistics'
import { useStatisticsCharts } from '../hooks/useStatisticsCharts'
import StatCard from '../components/StatCard'
import InfoCard from '../components/InfoCard'
import ReusablePieChart from '../components/charts/ReusablePieChart'
import ReusableBarChart from '../components/charts/ReusableBarChart'
import DailyPlaytimeChart from '../components/statistics/DailyPlaytimeChart'
import DayOfWeekDualAxisChart from '../components/statistics/DayOfWeekDualAxisChart'
import TopGamesSection from '../components/statistics/TopGamesSection'
import GameRecommendations from '../components/statistics/GameRecommendations'
import SpecialGameCards from '../components/statistics/SpecialGameCards'

function Statistics() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { isAuthReady } = useAuthContext()
  const [interval, setInterval] = useState<'week' | 'month' | 'year' | 'all'>('all')
  
  const { statistics, recommendations, loading, error } = useStatistics(interval, isAuthReady)
  const chartData = useStatisticsCharts(statistics)

  const handleIntervalChange = useCallback((
    _event: React.MouseEvent<HTMLElement>,
    newInterval: 'week' | 'month' | 'year' | 'all' | null,
  ) => {
    if (newInterval !== null) {
      setInterval(newInterval)
    }
  }, [])

  const handleExportCSV = useCallback(() => {
    if (statistics) {
      exportStatisticsToCSV(statistics, interval)
    }
  }, [statistics, interval])

  const hasData = statistics ? statistics.totalPlaytimeSeconds > 0 : false

  if (loading) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Skeleton variant="text" width={200} height={50} />
          <Skeleton variant="rectangular" width={300} height={40} />
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('statistics.title')}
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  if (!statistics || !chartData) {
    return null
  }

  const { dailyPlaytimeData, timeOfDayData, genreData, platformData, hourlyData, dayOfWeekData } = chartData

  return (
    <Box>
      {/* Header */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={4} 
        gap={2}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' } }}
        >
          {t('statistics.title')}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <ToggleButtonGroup 
            value={interval} 
            exclusive 
            onChange={handleIntervalChange} 
            size="small"
            sx={{
              bgcolor: 'background.paper',
              width: { xs: '100%', sm: 'auto' },
              '& .MuiToggleButton-root': {
                px: { xs: 2, sm: 3 },
                flex: { xs: 1, sm: 'initial' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              },
            }}
          >
            <ToggleButton value="week">{t('statistics.userStats.week')}</ToggleButton>
            <ToggleButton value="month">{t('statistics.userStats.month')}</ToggleButton>
            <ToggleButton value="year">{t('statistics.userStats.year')}</ToggleButton>
            <ToggleButton value="all">{t('statistics.userStats.allTime')}</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportCSV}
            disabled={!hasData}
            size="small"
            sx={{
              bgcolor: theme.palette.success.main,
              color: 'white',
              px: 3,
              fontSize: '0.875rem',
              '&:hover': { bgcolor: theme.palette.success.dark },
              '&:disabled': { bgcolor: alpha(theme.palette.success.main, 0.3) }
            }}
          >
            {t('statistics.exportCSV')}
          </Button>
        </Box>
      </Box>

      {!hasData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('statistics.userStats.noData')}
        </Alert>
      )}

      {/* Key Statistics Cards */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} mb={{ xs: 3, md: 4 }}>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.totalPlaytime')}
            value={formatTime(statistics.totalPlaytimeSeconds)}
            icon={<Timer />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.totalGames')}
            value={statistics.totalGamesCount}
            icon={<SportsEsports />}
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.completed')}
            value={statistics.gamesCompleted}
            icon={<CheckCircle />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.inProgress')}
            value={statistics.gamesInProgress}
            icon={<PlayCircle />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.totalSessions')}
            value={statistics.totalSessionCount}
            icon={<CalendarMonth />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <StatCard
            title={t('statistics.userStats.avgSession')}
            value={formatTime(Math.round(statistics.averageSessionPlaytimeSeconds))}
            icon={<AccessTime />}
            color={theme.palette.error.main}
          />
        </Grid>
      </Grid>

      {hasData && (
        <>
          {/* Library Completion & Developer/Publisher Cards */}
          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} mb={{ xs: 3, md: 4 }}>
            <Grid item xs={12} md={6} lg={4}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, // Unified card padding (32px)
                  borderRadius: 3, // Unified card border radius (24px)
                  height: '100%',
                  background: alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box display="flex" alignItems="center" mb={2}>
                  <CheckCircle sx={{ mr: 1, color: theme.palette.success.main }} />
                  <Typography variant="h6" fontWeight="bold">
                    {t('statistics.userStats.libraryCompletion')}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h3" fontWeight="bold" color={theme.palette.success.main}>
                    {statistics.libraryCompletionPercentage.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('statistics.userStats.gamesCompletedOf', { 
                      completed: statistics.gamesCompleted, 
                      total: statistics.totalGamesCount 
                    })}
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', bgcolor: alpha(theme.palette.divider, 0.3), borderRadius: 2, height: 12 }}>
                  <Box 
                    sx={{ 
                      width: `${Math.min(statistics.libraryCompletionPercentage, 100)}%`, 
                      bgcolor: theme.palette.success.main,
                      height: '100%',
                      borderRadius: 2,
                      transition: 'width 0.5s ease-in-out'
                    }} 
                  />
                </Box>
              </Paper>
            </Grid>

            {statistics.favoriteDeveloper && (
              <Grid item xs={12} md={6} lg={4}>
                <InfoCard
                  icon={<Code />}
                  iconColor={theme.palette.secondary.main}
                  title={t('statistics.userStats.favoriteDeveloper')}
                  value={statistics.favoriteDeveloper}
                  subtitle={t('statistics.userStats.mostGamesPlayed')}
                />
              </Grid>
            )}

            {statistics.favoritePublisher && (
              <Grid item xs={12} md={6} lg={4}>
                <InfoCard
                  icon={<Business />}
                  iconColor={theme.palette.warning.main}
                  title={t('statistics.userStats.favoritePublisher')}
                  value={statistics.favoritePublisher}
                  subtitle={t('statistics.userStats.mostGamesPlayed')}
                />
              </Grid>
            )}
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} mb={{ xs: 3, md: 4 }}>
            {/* Daily Playtime */}
            {dailyPlaytimeData.length > 0 && (
              <Grid item xs={12}>
                <DailyPlaytimeChart 
                  data={dailyPlaytimeData}
                  title={t('statistics.userStats.dailyPlaytime')}
                />
              </Grid>
            )}

            {/* Pie Charts */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 }, 
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <ReusablePieChart
                  data={timeOfDayData}
                  title={t('statistics.userStats.timeOfDayDistribution')}
                  noDataMessage={t('statistics.userStats.noData')}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <ReusablePieChart
                  data={genreData}
                  title={t('statistics.userStats.genreDistribution')}
                  noDataMessage={t('statistics.userStats.noData')}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <ReusablePieChart
                  data={platformData}
                  title={t('statistics.userStats.platformDistribution')}
                  minLabelPercent={0.2}
                  noDataMessage={t('statistics.userStats.noData')}
                />
              </Paper>
            </Grid>

            {/* Bar Charts */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <ReusableBarChart
                  data={hourlyData}
                  title={t('statistics.userStats.hourlyActivity')}
                  xAxisKey="hour"
                  yAxisLabel={t('statistics.userStats.hours')}
                  bars={[{
                    dataKey: 'hours',
                    fill: theme.palette.secondary.main,
                    name: t('statistics.userStats.hoursPlayed')
                  }]}
                  height={280}
                  noDataMessage={t('statistics.userStats.noData')}
                  isHourlyChart={true}
                  highlightCurrentHour={true}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper elevation={0} sx={{ 
                p: 3, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                  }}
                >
                  {t('statistics.userStats.playtimeByDayOfWeek')}
                </Typography>
                <DayOfWeekDualAxisChart
                  data={dayOfWeekData}
                  noDataMessage={t('statistics.userStats.noData')}
                />
              </Paper>
            </Grid>

            {/* Recommendations */}
            <Grid item xs={12} lg={6}>
              <GameRecommendations
                recommendations={recommendations}
                title={t('statistics.userStats.recommendedGames')}
                noDataMessage={t('statistics.userStats.noRecommendations')}
              />
            </Grid>
          </Grid>

          {/* Special Game Cards */}
          <SpecialGameCards
            favoriteGame={statistics.favoriteGame}
            longestToComplete={statistics.longestToCompleteGame}
            fastestToComplete={statistics.fastestToCompleteGame}
            t={t}
          />

          {/* Longest Session */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  background: alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                  {t('statistics.userStats.longestSession')}
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={theme.palette.warning.main}>
                  {formatTimeDetailed(statistics.longestSessionSeconds)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Top 5 Most Played Games */}
          {statistics.topMostPlayedGames.length > 0 && (
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12}>
                <TopGamesSection
                  games={statistics.topMostPlayedGames}
                  title={t('statistics.userStats.topMostPlayed')}
                />
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  )
}

export default Statistics
