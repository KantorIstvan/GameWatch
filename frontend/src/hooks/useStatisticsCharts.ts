import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatistics, getPlatformColorVariant } from '../types'

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

export function useStatisticsCharts(statistics: UserStatistics | null) {
  const { t } = useTranslation()
  
  return useMemo(() => {
    if (!statistics) return null

    const dailyPlaytimeData = statistics.dailyPlaytime
      .filter(dp => dp.playtimeSeconds > 0)
      .map((dp) => ({
        date: new Date(dp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: Math.round((dp.playtimeSeconds / 3600) * 10) / 10,
      }))

    const timeOfDayData = [
      { name: t('statistics.userStats.dawn'), fullName: `${t('statistics.userStats.dawn')} (4-7)`, value: statistics.timeOfDayStats.dawnSeconds / 3600, fill: '#ffd93d' },
      { name: t('statistics.userStats.morning'), fullName: `${t('statistics.userStats.morning')} (7-12)`, value: statistics.timeOfDayStats.morningSeconds / 3600, fill: '#ffb347' },
      { name: t('statistics.userStats.noon'), fullName: `${t('statistics.userStats.noon')} (12-13)`, value: statistics.timeOfDayStats.noonSeconds / 3600, fill: '#ff6b6b' },
      { name: t('statistics.userStats.afternoon'), fullName: `${t('statistics.userStats.afternoon')} (13-18)`, value: statistics.timeOfDayStats.afternoonSeconds / 3600, fill: '#ee5a6f' },
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

    const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    const dayOfWeekData = dayOrder.map((day, index) => ({
      day: t(`statistics.userStats.${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]}`),
      hours: Math.round(((statistics.dayOfWeekTotalPlaytime[day] || 0) / 3600) * 10) / 10,
      avgHours: Math.round(((statistics.dayOfWeekPlaytime[day] || 0) / 3600) * 10) / 10,
    }))

    return { 
      dailyPlaytimeData, 
      timeOfDayData, 
      genreData, 
      platformData, 
      hourlyData, 
      dayOfWeekData
    }
  }, [statistics, t])
}
