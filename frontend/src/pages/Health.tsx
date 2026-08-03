import { useEffect, useState, useRef } from 'react'
import { Smile, PersonStanding, MoonStar, TrendingUp, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CalHeatmap from 'cal-heatmap'
import 'cal-heatmap/cal-heatmap.css'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import LegendLite from 'cal-heatmap/plugins/LegendLite'
import healthApi, { HealthDashboard } from '../services/healthApi'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Loading from '../components/Loading'
import { useWeekStart } from '../contexts/WeekStartContext'
import { useTimeFormat } from '../contexts/TimeFormatContext'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const HEATMAP_YEAR_OPTIONS = 5

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
  const { mode } = useTheme()
  const { t } = useTranslation()
  const { isAuthReady, isAuthenticated } = useAuthContext()
  const { getFirstDayNumber } = useWeekStart()
  const { timeFormat } = useTimeFormat()
  const [dashboard, setDashboard] = useState<HealthDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
  const [heatmapData, setHeatmapData] = useState<Record<string, number> | null>(null)
  const calHeatmapRef = useRef<HTMLDivElement>(null)
  const calInstanceRef = useRef<CalHeatmap | null>(null)

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      loadDashboard()
    }
  }, [isAuthReady, isAuthenticated])

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      loadHeatmap(heatmapYear)
    }
  }, [isAuthReady, isAuthenticated, heatmapYear])

  useEffect(() => {
    if (heatmapData && calHeatmapRef.current) {
      initializeHeatmap()
    }

    return () => {
      if (calInstanceRef.current) {
        calInstanceRef.current.destroy()
      }
    }
    // `loading` is included so this still runs once the heatmap container mounts,
    // in case the heatmap request resolves before the (independent) dashboard request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapData, mode, loading])

  const loadHeatmap = async (year: number) => {
    try {
      const response = await healthApi.getYearlyHeatmap(year)
      setHeatmapData(response.data)
    } catch (error) {
      // Silently fail
    }
  }

  const initializeHeatmap = () => {
    if (!calHeatmapRef.current || !heatmapData) return

    if (calInstanceRef.current) {
      calInstanceRef.current.destroy()
    }

    const heatmapPoints = Object.entries(heatmapData).map(([dateStr, score]) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
      const timestamp = date.getTime()
      return { date: timestamp, value: score }
    })

    const isDark = mode === 'dark'

    const cal = new CalHeatmap()
    calInstanceRef.current = cal

    const startDate = new Date(heatmapYear, 0, 1, 12, 0, 0)

    cal.paint({
      itemSelector: calHeatmapRef.current,
      data: {
        source: heatmapPoints,
        x: 'date',
        y: (d: any) => d.value,
      },
      date: {
        start: startDate,
        locale: { weekStart: getFirstDayNumber() }
      },
      range: 12,
      // cal-heatmap animates its SVG width/height attributes in from 0 by default
      // (200ms). Since the container has no `viewBox` until paint() resolves, the
      // browser recomputes CSS `h-auto` height on every frame of that transition,
      // producing a visible "small, framed" heatmap that pops to full size. Disabling
      // it removes the pop; the viewBox swap below still gives a smooth CSS transition.
      animationDuration: 0,
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
        gutter: 6,
        label: {
          text: 'MMM',
          textAlign: 'start',
          position: 'top',
        },
      },
      subDomain: {
        type: 'day',
        radius: 3,
        width: 11,
        height: 11,
        gutter: 3,
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
            return `${formattedDate}: ${value !== null && value !== undefined ? `${t('health.scoreLabel')} ${value}` : t('health.noDataShort')}`
          },
        },
      ],
      [
        LegendLite,
        {
          itemSelector: '#legend',
          label: t('health.legend'),
        },
      ],
    ]).then(() => {
      const svg = calHeatmapRef.current?.querySelector('svg')
      const width = svg?.getAttribute('width')
      const height = svg?.getAttribute('height')
      if (svg && width && height) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        svg.removeAttribute('width')
        svg.removeAttribute('height')
      }
    })
  }

  const loadDashboard = async () => {
    try {
      const response = await healthApi.getHealthDashboard()
      setDashboard(response.data)
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthReady || loading) {
    return <Loading />
  }

  if (!dashboard) {
    return (
      <div className="my-8">
        <p className="text-h3 text-text-secondary">{t('health.noData')}</p>
      </div>
    )
  }

  const currentScore = dashboard.currentHealthScore
  const scoreColor = getScoreColor(currentScore)
  const cardClass = 'rounded-xl border border-border bg-surface/90 p-8'

  return (
    <div className="my-8">
      <h1 className="mb-8 text-h2 font-semibold text-text-primary">{t('health.title')}</h1>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className="flex h-full flex-col rounded-xl border-2 p-8"
          style={{
            background: `linear-gradient(135deg, ${scoreColor}15, ${scoreColor}05)`,
            borderColor: `${scoreColor}40`,
          }}
        >
          <div className="mb-2 flex items-center">
            <p className="flex-1 text-h4 font-semibold">{t('health.todaysScore')}</p>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Info className="size-4.5 cursor-help text-text-secondary" />
              </TooltipTrigger>
              <TooltipContent>{t('health.scoreTooltip')}</TooltipContent>
            </UiTooltip>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-baseline">
              <p className="mr-2 text-6xl font-bold" style={{ color: scoreColor }}>
                {currentScore !== null ? currentScore : '--'}
              </p>
              <p className="text-h4 text-text-secondary">{t('health.outOf100')}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-2 flex items-center">
            <TrendingUp className="mr-2 size-5 text-accent" />
            <p className="text-h4 font-semibold">{t('health.weeklyTrend')}</p>
          </div>

          {dashboard.weeklyAverageScore !== null ? (
            <>
              <p className="mb-1 text-h2 font-bold" style={{ color: getScoreColor(Math.round(dashboard.weeklyAverageScore)) }}>
                {Math.round(dashboard.weeklyAverageScore)}
              </p>
              <p className="mb-6 text-body-sm text-text-secondary">{t('health.averageScoreWeek')}</p>

              <div className="flex h-20 items-end gap-2">
                {dashboard.last7DaysScores.map((score, index) => (
                  <div
                    key={index}
                    className="min-h-2 flex-1 rounded-sm transition-all hover:-translate-y-1 hover:opacity-80"
                    style={{ height: `${score}%`, backgroundColor: getScoreColor(score) }}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-text-secondary">{t('health.notEnoughData')}</p>
          )}
        </div>
      </div>

      <div
        className={`${cardClass} mb-6 [&_.ch-domain-text]:fill-text-secondary [&_.ch-domain-text]:text-xs [&_.ch-domain-text]:font-semibold [&_.ch-domain-text]:uppercase [&_.ch-plugin-legend-lite]:fill-text-secondary [&_.ch-subdomain-bg]:fill-surface`}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-h4 font-semibold">{t('health.yearOverview')}</p>
          <Select value={String(heatmapYear)} onValueChange={(v) => setHeatmapYear(Number(v))}>
            <SelectTrigger className="w-30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: HEATMAP_YEAR_OPTIONS }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="-mx-8 overflow-x-auto px-8 pb-1 md:mx-0 md:px-0 md:pb-0">
          <div
            ref={calHeatmapRef}
            className="w-187.5 [&_.ch-container]:w-full [&_svg]:h-auto [&_svg]:w-187.5 md:w-full md:[&_svg]:w-full"
          />
        </div>
        <div id="legend" className="mt-2 flex flex-wrap gap-2" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className={`${cardClass} flex min-h-45 flex-col`}>
          <div className="mb-2 flex items-center">
            <PersonStanding className="mr-2 size-5 text-accent" />
            <p className="text-body-sm font-semibold">{t('health.breakCompliance')}</p>
          </div>
          <p className="mb-1 text-h3 font-bold">
            {dashboard.weekMetrics.breakCompliance !== null
              ? Math.round(dashboard.weekMetrics.breakCompliance * 100)
              : '--'}%
          </p>
          <p className="text-body-sm text-text-secondary">{t('health.sessionsWithBreaks')}</p>
        </div>

        <div className={`${cardClass} flex min-h-45 flex-col`}>
          <div className="mb-2 flex items-center">
            <Smile className="mr-2 size-5 text-accent" />
            <p className="text-body-sm font-semibold">{t('health.averageMood')}</p>
          </div>
          <p className="mb-1 text-h3 font-bold">
            {dashboard.weekMetrics.averageMood !== null
              ? dashboard.weekMetrics.averageMood.toFixed(1)
              : '--'}
          </p>
          <p className="text-body-sm text-text-secondary">{t('health.outOf5Week')}</p>
        </div>

        <div className={`${cardClass} flex min-h-45 flex-col`}>
          <div className="mb-2 flex items-center">
            <MoonStar className="mr-2 size-5 text-accent" />
            <p className="text-body-sm font-semibold">{t('health.lateNightGaming')}</p>
          </div>
          <p className="mb-1 text-h3 font-bold">
            {Math.floor(dashboard.weekMetrics.lateNightMinutes / 60)}h
          </p>
          <p className="text-body-sm text-text-secondary">
            {t('health.afterTime', { time: timeFormat === '12h' ? '10:00 PM' : '22:00' })}
          </p>
        </div>
      </div>

      {dashboard.goalProgress.goalsEnabled && (
        <div className={`${cardClass} mb-6`}>
          <p className="mb-6 text-h4 font-semibold">{t('health.goalProgress')}</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {dashboard.goalProgress.maxHoursPerDayEnabled && dashboard.goalProgress.maxHoursPerDay && (
              <div>
                <p className="mb-1 text-body-sm text-text-secondary">{t('health.hoursToday')}</p>
                <Progress
                  value={Math.min(100, (dashboard.goalProgress.hoursToday / dashboard.goalProgress.maxHoursPerDay) * 100)}
                  className={`mb-1 h-2 bg-border ${dashboard.goalProgress.hoursToday > dashboard.goalProgress.maxHoursPerDay ? '[&>div]:bg-danger' : '[&>div]:bg-success'}`}
                />
                <p className="text-body-sm">
                  {dashboard.goalProgress.hoursToday.toFixed(1)} / {dashboard.goalProgress.maxHoursPerDay} {t('health.hours')}
                </p>
              </div>
            )}

            {dashboard.goalProgress.maxSessionsPerDayEnabled && dashboard.goalProgress.maxSessionsPerDay && (
              <div>
                <p className="mb-1 text-body-sm text-text-secondary">{t('health.sessionsToday')}</p>
                <Progress
                  value={Math.min(100, (dashboard.goalProgress.sessionsToday / dashboard.goalProgress.maxSessionsPerDay) * 100)}
                  className={`mb-1 h-2 bg-border ${dashboard.goalProgress.sessionsToday > dashboard.goalProgress.maxSessionsPerDay ? '[&>div]:bg-danger' : '[&>div]:bg-success'}`}
                />
                <p className="text-body-sm">
                  {dashboard.goalProgress.sessionsToday} / {dashboard.goalProgress.maxSessionsPerDay} {t('health.sessions')}
                </p>
              </div>
            )}

            {dashboard.goalProgress.maxHoursPerWeekEnabled && dashboard.goalProgress.maxHoursPerWeek && (
              <div>
                <p className="mb-1 text-body-sm text-text-secondary">{t('health.hoursThisWeek')}</p>
                <Progress
                  value={Math.min(100, (dashboard.goalProgress.hoursThisWeek / dashboard.goalProgress.maxHoursPerWeek) * 100)}
                  className={`mb-1 h-2 bg-border ${dashboard.goalProgress.hoursThisWeek > dashboard.goalProgress.maxHoursPerWeek ? '[&>div]:bg-danger' : '[&>div]:bg-success'}`}
                />
                <p className="text-body-sm">
                  {dashboard.goalProgress.hoursThisWeek.toFixed(1)} / {dashboard.goalProgress.maxHoursPerWeek} {t('health.hours')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cardClass}>
        <p className="mb-6 text-h4 font-semibold">{t('health.recentSessions')}</p>

        {dashboard.recentSessions.length > 0 ? (
          <div>
            {dashboard.recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between border-b border-border py-4 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-semibold">{session.gameName}</p>
                  <p className="text-body-sm text-text-secondary">
                    {formatDuration(session.durationSeconds)} •{' '}
                    {new Date(session.endedAt).toLocaleDateString()}
                  </p>
                </div>
                {session.moodRating && (
                  <Badge
                    style={{
                      backgroundColor:
                        session.moodRating >= 4 ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' :
                        session.moodRating >= 3 ? 'color-mix(in srgb, var(--color-warning) 15%, transparent)' :
                        'color-mix(in srgb, var(--color-danger) 15%, transparent)',
                      color:
                        session.moodRating >= 4 ? 'var(--color-success)' :
                        session.moodRating >= 3 ? 'var(--color-warning)' :
                        'var(--color-danger)',
                    }}
                  >
                    {t('health.mood')}: {session.moodRating}/5
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">{t('health.noSessionsYet')}</p>
        )}
      </div>
    </div>
  )
}
