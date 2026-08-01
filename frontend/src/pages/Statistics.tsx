import { useCallback, useState } from 'react'
import { Timer, Gamepad2, CircleCheck, CirclePlay, Clock, CalendarDays, Code, Building2, Download, Hourglass, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime, formatTimeDetailed, formatDurationWords } from '../utils/formatters'
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
import GameBannerCard from '../components/statistics/GameBannerCard'
import PeriodPicker from '../components/statistics/PeriodPicker'
import { statColors, statForegrounds } from '../lib/statColors'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const palette = {
  secondary: 'var(--color-text-secondary)',
}

function Statistics() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [interval, setInterval] = useState<'week' | 'month' | 'year' | 'all'>('all')
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date())

  const { statistics, recommendations, loading, error } = useStatistics(interval, referenceDate, isAuthReady)
  const chartData = useStatisticsCharts(statistics)

  const handleIntervalChange = useCallback((newInterval: string) => {
    if (newInterval) {
      setInterval(newInterval as 'week' | 'month' | 'year' | 'all')
      setReferenceDate(new Date())
    }
  }, [])

  const handleExport = useCallback(async () => {
    if (statistics) {
      const { exportStatisticsToXlsx } = await import('../utils/xlsxExport')
      exportStatisticsToXlsx(statistics, interval, t)
    }
  }, [statistics, interval, t])

  const hasData = statistics ? statistics.totalPlaytimeSeconds > 0 : false

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-12 w-50 bg-border" />
          <Skeleton className="h-10 w-75 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-30 bg-border" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-h2">{t('statistics.title')}</h1>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!statistics || !chartData) {
    return null
  }

  const { dailyPlaytimeData, timeOfDayData, genreData, platformData, hourlyData, dayOfWeekData } = chartData

  const cardClass = 'h-full rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6'

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-h2 font-bold">{t('statistics.title')}</h1>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ToggleGroup
              type="single"
              value={interval}
              onValueChange={handleIntervalChange}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <ToggleGroupItem value="week" className="flex-1 sm:flex-initial">{t('statistics.userStats.week')}</ToggleGroupItem>
              <ToggleGroupItem value="month" className="flex-1 sm:flex-initial">{t('statistics.userStats.month')}</ToggleGroupItem>
              <ToggleGroupItem value="year" className="flex-1 sm:flex-initial">{t('statistics.userStats.year')}</ToggleGroupItem>
              <ToggleGroupItem value="all" className="flex-1 sm:flex-initial">{t('statistics.userStats.allTime')}</ToggleGroupItem>
            </ToggleGroup>
            {interval !== 'all' && (
              <PeriodPicker interval={interval} referenceDate={referenceDate} onChange={setReferenceDate} />
            )}
          </div>
          <Button
            onClick={handleExport}
            disabled={!hasData}
            className="bg-success text-white hover:bg-success/90 disabled:bg-success/30"
          >
            <Download className="size-4" />
            {t('statistics.exportCSV')}
          </Button>
        </div>
      </div>

      {!hasData && (
        <Alert variant="info" className="mb-6">
          <AlertDescription>{t('statistics.userStats.noData')}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-5 md:mb-8 md:grid-cols-4">
        <StatCard
          hero
          className="col-span-2 md:row-span-2"
          title={t('statistics.userStats.totalPlaytime')}
          value={formatTime(statistics.totalPlaytimeSeconds)}
          icon={<Timer className="size-6" />}
          color={statColors.blue}
          foreground={statForegrounds.blue}
        />
        {!!statistics.longestSessionSeconds && (
          <StatCard
            title={t('statistics.userStats.longestSession')}
            value={formatTimeDetailed(statistics.longestSessionSeconds)}
            icon={<Hourglass className="size-5" />}
          />
        )}
        <StatCard
          title={t('statistics.userStats.totalGames')}
          value={statistics.totalGamesCount}
          icon={<Gamepad2 className="size-5" />}
        />
        <StatCard
          title={t('statistics.userStats.completed')}
          value={statistics.gamesCompleted}
          icon={<CircleCheck className="size-5" />}
        />
        <StatCard
          title={t('statistics.userStats.inProgress')}
          value={statistics.gamesInProgress}
          icon={<CirclePlay className="size-5" />}
        />
        <StatCard
          title={t('statistics.userStats.totalSessions')}
          value={statistics.totalSessionCount}
          icon={<CalendarDays className="size-5" />}
        />
        <StatCard
          title={t('statistics.userStats.avgSession')}
          value={formatTime(Math.round(statistics.averageSessionPlaytimeSeconds))}
          icon={<Clock className="size-5" />}
        />

        {hasData && (
          <>
            <div
              className="h-full rounded-xl border border-current/20 p-5 backdrop-blur-xl md:col-span-2"
              style={{
                color: statColors.green,
                background: `linear-gradient(135deg, color-mix(in srgb, ${statColors.green} 10%, transparent) 0%, color-mix(in srgb, ${statColors.green} 5%, transparent) 100%)`,
              }}
            >
              <div className="mb-2 flex items-center">
                <div
                  className="mr-3 flex rounded-md p-2 shadow-2"
                  style={{ backgroundColor: statColors.green, color: statForegrounds.green }}
                >
                  <CircleCheck className="size-5" />
                </div>
                <p className="text-h4 font-bold text-text-primary">{t('statistics.userStats.libraryCompletion')}</p>
              </div>
              <div className="mb-2">
                <p className="text-h1 font-bold text-text-primary">
                  {statistics.libraryCompletionPercentage.toFixed(1)}%
                </p>
                <p className="text-body-sm text-text-secondary">
                  {t('statistics.userStats.gamesCompletedOf', {
                    completed: statistics.gamesCompleted,
                    total: statistics.totalGamesCount
                  })}
                </p>
              </div>
              <div className="h-3 w-full rounded-md bg-border/30">
                <div
                  className="h-full rounded-md transition-[width] duration-500 ease-in-out"
                  style={{
                    width: `${Math.min(statistics.libraryCompletionPercentage, 100)}%`,
                    backgroundColor: statColors.green,
                  }}
                />
              </div>
            </div>

            {statistics.favoriteDeveloper && (
              <InfoCard
                className="p-5 md:col-span-2"
                icon={<Code className="size-5" />}
                title={t('statistics.userStats.favoriteDeveloper')}
                value={statistics.favoriteDeveloper}
                subtitle={t('statistics.userStats.mostGamesPlayed')}
              />
            )}

            {statistics.favoritePublisher && (
              <InfoCard
                className="p-5 md:col-span-2"
                icon={<Building2 className="size-5" />}
                title={t('statistics.userStats.favoritePublisher')}
                value={statistics.favoritePublisher}
                subtitle={t('statistics.userStats.mostGamesPlayed')}
              />
            )}
          </>
        )}
      </div>

      {hasData && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-5 md:mb-8 lg:grid-cols-2">
            {dailyPlaytimeData.length > 0 && (
              <div className="lg:col-span-2">
                <DailyPlaytimeChart
                  data={dailyPlaytimeData}
                  title={t('statistics.userStats.dailyPlaytime')}
                  valueFormatter={(hours) => formatDurationWords(Math.round(hours * 3600), t)}
                />
              </div>
            )}

            <div className={cardClass}>
              <ReusablePieChart
                data={timeOfDayData}
                title={t('statistics.userStats.timeOfDayDistribution')}
                noDataMessage={t('statistics.userStats.noData')}
                valueFormatter={(hours) => formatDurationWords(Math.round(hours * 3600), t)}
              />
            </div>

            <div className={cardClass}>
              <ReusablePieChart
                data={genreData}
                title={t('statistics.userStats.genreDistribution')}
                noDataMessage={t('statistics.userStats.noData')}
                valueFormatter={(hours) => formatDurationWords(Math.round(hours * 3600), t)}
              />
            </div>

            <div className={`${cardClass} lg:col-span-2`}>
              <ReusablePieChart
                data={platformData}
                title={t('statistics.userStats.platformDistribution')}
                minLabelPercent={0.2}
                noDataMessage={t('statistics.userStats.noData')}
                valueFormatter={(hours) => formatDurationWords(Math.round(hours * 3600), t)}
              />
            </div>

            <div className={`${cardClass} lg:col-span-2`}>
              <ReusableBarChart
                data={hourlyData}
                title={t('statistics.userStats.hourlyActivity')}
                xAxisKey="hour"
                yAxisLabel={t('statistics.userStats.hours')}
                bars={[{
                  dataKey: 'hours',
                  fill: palette.secondary,
                  name: t('statistics.userStats.hoursPlayed')
                }]}
                height={280}
                noDataMessage={t('statistics.userStats.noData')}
                isHourlyChart={true}
                highlightCurrentHour={true}
                valueFormatter={(hours) => formatDurationWords(Math.round(hours * 3600), t)}
              />
            </div>

            <div className={`${cardClass} lg:col-span-2`}>
              <p className="mb-2 text-body-sm font-bold sm:text-body-lg">
                {t('statistics.userStats.playtimeByDayOfWeek')}
              </p>
              <DayOfWeekDualAxisChart
                data={dayOfWeekData}
                noDataMessage={t('statistics.userStats.noData')}
                height={280}
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-5 md:mb-8 md:grid-cols-2">
            <GameRecommendations
              recommendations={recommendations}
              title={t('statistics.userStats.recommendedGames')}
              noDataMessage={t('statistics.userStats.noRecommendations')}
            />

            {statistics.favoriteGame && (
              <GameBannerCard
                game={statistics.favoriteGame}
                size="hero"
                label={t('statistics.userStats.favoriteGame')}
                labelIcon={<TrendingUp className="size-4" />}
                metric={formatTime(statistics.favoriteGame.playtimeSeconds)}
              />
            )}
          </div>

          {(statistics.longestToCompleteGame || statistics.fastestToCompleteGame) && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              {statistics.longestToCompleteGame && (
                <GameBannerCard
                  game={statistics.longestToCompleteGame}
                  size="medium"
                  label={t('statistics.userStats.longestToComplete')}
                  labelIcon={<CalendarDays className="size-4" />}
                  metric={statistics.longestToCompleteGame.daysToComplete !== undefined
                    ? t('statistics.userStats.daysToComplete', { days: statistics.longestToCompleteGame.daysToComplete })
                    : undefined}
                />
              )}

              {statistics.fastestToCompleteGame && (
                <GameBannerCard
                  game={statistics.fastestToCompleteGame}
                  size="medium"
                  label={t('statistics.userStats.fastestCompletion')}
                  labelIcon={<Timer className="size-4" />}
                  metric={statistics.fastestToCompleteGame.daysToComplete !== undefined
                    ? t('statistics.userStats.daysToComplete', { days: statistics.fastestToCompleteGame.daysToComplete })
                    : undefined}
                />
              )}
            </div>
          )}

          {statistics.topMostPlayedGames.length > 0 && (
            <div className="mb-8">
              <TopGamesSection
                games={statistics.topMostPlayedGames}
                title={t('statistics.userStats.topMostPlayed')}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Statistics
