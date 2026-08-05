import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatistics, getPlatformColorVariant } from '../types'
import { useWeekStart } from '../contexts/WeekStartContext'

const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a28dff',
  '#ff9f40',
  '#4bc0c0',
  '#9966ff',
  '#ff6384',
  '#36a2eb',
]

export function useStatisticsCharts(
  statistics: UserStatistics | null,
  interval: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date,
  heatmapYear: number
) {
  const { t } = useTranslation()
  const { weekStart } = useWeekStart()

  return useMemo(() => {
    if (!statistics) return null

    // Reshaped for the calendar heatmap: keyed by the raw "yyyy-MM-dd" date
    // string (cal-heatmap parses that itself) instead of a display label, and carrying the
    // rolling average alongside it so the heatmap's tooltip can still surface the trend
    // line the old area chart used to show, without cal-heatmap needing a second series.
    //
    // "all time" fetches the user's entire daily history in one response (potentially
    // years of entries), but the heatmap only ever shows one calendar year at a time - so
    // only that year's entries are kept here rather than handing cal-heatmap thousands of
    // points it will never draw.
    const dailyHeatmapData: Record<string, number> = {}
    const dailyHeatmapRollingSecondsByDate: Record<string, number | null | undefined> = {}
    statistics.dailyPlaytime.forEach((dp) => {
      if (interval !== 'all' || dp.date.startsWith(`${heatmapYear}-`)) {
        dailyHeatmapData[dp.date] = dp.playtimeSeconds / 3600
      }
      dailyHeatmapRollingSecondsByDate[dp.date] = dp.rollingAverageSeconds
    })

    // The heatmap's window mirrors whichever period filter is active on the page, rather
    // than being inferred from how much data happens to exist: "all time" gets its own
    // independently-selectable calendar year (like the Health page's heatmap), "year"
    // always renders the full Jan-Dec grid even mid-year (future days just show empty),
    // and "week"/"month" narrow the grid down to exactly that single period.
    let dailyHeatmapSpan: {
      startDate: Date
      range: number
      domain: 'month' | 'week'
      subDomainType: 'day' | 'xDay'
    } | null = null
    if (statistics.dailyPlaytime.length > 0) {
      const parseLocalDate = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number)
        return new Date(y, m - 1, d)
      }

      switch (interval) {
        case 'week':
          // One week reads best as a single horizontal strip of seven days, which is what
          // the default orientation already produces for a week domain.
          dailyHeatmapSpan = {
            startDate: parseLocalDate(statistics.dailyPlaytime[0].date),
            range: 1,
            domain: 'week',
            subDomainType: 'day',
          }
          break
        case 'month':
          // Transposed into weekday-columns so a lone month renders as the calendar shape
          // people already read months in, rather than a sideways slice of the year ribbon.
          dailyHeatmapSpan = {
            startDate: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
            range: 1,
            domain: 'month',
            subDomainType: 'xDay',
          }
          break
        case 'year':
          dailyHeatmapSpan = {
            startDate: new Date(referenceDate.getFullYear(), 0, 1),
            range: 12,
            domain: 'month',
            subDomainType: 'day',
          }
          break
        case 'all':
          dailyHeatmapSpan = {
            startDate: new Date(heatmapYear, 0, 1),
            range: 12,
            domain: 'month',
            subDomainType: 'day',
          }
          break
      }
    }

    const timeOfDayData = [
      { name: t('statistics.userStats.dawn'), fullName: `${t('statistics.userStats.dawn')} (4-7)`, value: statistics.timeOfDayStats.dawnSeconds / 3600, fill: '#ffd93d' },
      { name: t('statistics.userStats.morning'), fullName: `${t('statistics.userStats.morning')} (7-12)`, value: statistics.timeOfDayStats.morningSeconds / 3600, fill: '#ffb347' },
      { name: t('statistics.userStats.noon'), fullName: `${t('statistics.userStats.noon')} (12-13)`, value: statistics.timeOfDayStats.noonSeconds / 3600, fill: '#ff6b6b' },
      { name: t('statistics.userStats.afternoon'), fullName: `${t('statistics.userStats.afternoon')} (13-18)`, value: statistics.timeOfDayStats.afternoonSeconds / 3600, fill: '#9966ff' },
      { name: t('statistics.userStats.evening'), fullName: `${t('statistics.userStats.evening')} (18-22)`, value: statistics.timeOfDayStats.eveningSeconds / 3600, fill: '#4ecdc4' },
      { name: t('statistics.userStats.night'), fullName: `${t('statistics.userStats.night')} (22-4)`, value: statistics.timeOfDayStats.nightSeconds / 3600, fill: '#3d5a80' },
    ]

    const genreData = Object.entries(statistics.genreDistribution)
      .map(([name, value], index) => ({
        name,
        value: value / 3600,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((item) => item.value > 0.5)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const platformData = Object.entries(statistics.platformDistribution || {})
      .map(([name, value]) => ({
        name: name,
        value: value / 3600,
        fill: getPlatformColorVariant(name),
      }))
      .filter((item) => item.value > 0.1)
      .sort((a, b) => b.value - a.value)

    const hourlyData = Object.entries(statistics.timeOfDayStats.hourlyDistribution)
      .map(([hour, seconds]) => {
        const hourNum = parseInt(hour)
        return {
          hour: `${hourNum}:00`,
          hourNum,
          hours: Math.round((seconds / 3600) * 10) / 10,
        }
      })
      .sort((a, b) => a.hourNum - b.hourNum)

    // Reorder days based on first day of week setting
    const baseDayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    const baseDayNameKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    const dayOrder = weekStart === 'SUNDAY' 
      ? ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      : baseDayOrder
    
    const dayNameKeys = weekStart === 'SUNDAY'
      ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      : baseDayNameKeys
    
    const dayOfWeekData = dayOrder.map((day, index) => ({
      day: t(`statistics.userStats.${dayNameKeys[index]}`),
      hours: Math.round(((statistics.dayOfWeekTotalPlaytime[day] || 0) / 3600) * 10) / 10,
      avgHours: Math.round(((statistics.dayOfWeekPlaytime[day] || 0) / 3600) * 10) / 10,
    }))

    return {
      dailyHeatmapData,
      dailyHeatmapRollingSecondsByDate,
      dailyHeatmapSpan,
      timeOfDayData,
      genreData,
      platformData,
      hourlyData,
      dayOfWeekData
    }
  }, [statistics, t, weekStart, interval, referenceDate, heatmapYear])
}
