import { ReactNode } from 'react'
import { Activity, Flame, CalendarCheck, CalendarX, Gauge, Repeat, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatCard from '../StatCard'
import SectionHeader from './SectionHeader'
import { formatTime } from '../../utils/formatters'
import { bentoLastTile } from '../../lib/bento'
import { statColors, statForegrounds } from '../../lib/statColors'
import type { ConsistencyStats } from '../../types'

interface ConsistencySectionProps {
  stats?: ConsistencyStats
}

interface Tile {
  key: string
  title: string
  value: string | number
  icon: ReactNode
  color?: string
  foreground?: string
}

/**
 * How regularly the period was played, rather than how much.
 *
 * The rest of the page answers "how many hours". Streaks, consistency and the median
 * session answer "how often, and what does a normal sitting look like" - which the totals
 * and averages above cannot show, since a single marathon and a steady month of evenings
 * can add up to exactly the same number of hours.
 */
function ConsistencySection({ stats }: ConsistencySectionProps) {
  const { t } = useTranslation()

  if (!stats || !stats.daysInPeriod) {
    return null
  }

  const consistency = Math.round(stats.consistencyPercentage)

  // Collected rather than written inline, because the current streak drops out entirely
  // for a past period and the last tile has to stretch to keep the bento row flush.
  const tiles: Tile[] = [
    // Only meaningful while the period still contains today.
    stats.currentStreakDays !== null &&
      stats.currentStreakDays !== undefined && {
        key: 'currentStreak',
        title: t('statistics.consistency.currentStreak'),
        value: t('statistics.consistency.dayCount', { count: stats.currentStreakDays }),
        icon: <Flame className="size-5" />,
        color: statColors.orange,
        foreground: statForegrounds.orange,
      },

    {
      key: 'longestStreak',
      title: t('statistics.consistency.longestStreak'),
      value: t('statistics.consistency.dayCount', { count: stats.longestStreakDays }),
      icon: <TrendingUp className="size-5" />,
    },

    {
      key: 'daysPlayed',
      title: t('statistics.consistency.daysPlayed'),
      value: t('statistics.consistency.daysOutOf', {
        played: stats.daysPlayed,
        total: stats.daysInPeriod,
      }),
      icon: <CalendarCheck className="size-5" />,
    },

    {
      key: 'consistency',
      title: t('statistics.consistency.consistency'),
      value: `${consistency}%`,
      icon: <Gauge className="size-5" />,
    },

    {
      key: 'longestGap',
      title: t('statistics.consistency.longestGap'),
      value: t('statistics.consistency.dayCount', { count: stats.longestGapDays }),
      icon: <CalendarX className="size-5" />,
    },

    {
      key: 'medianSession',
      title: t('statistics.consistency.medianSession'),
      value: formatTime(stats.medianSessionSeconds),
      icon: <Gauge className="size-5" />,
    },

    {
      key: 'longSession',
      title: t('statistics.consistency.longSession'),
      value: formatTime(stats.percentile90SessionSeconds),
      icon: <Flame className="size-5" />,
    },

    {
      key: 'sessionsPerActiveDay',
      title: t('statistics.consistency.sessionsPerActiveDay'),
      value: stats.sessionsPerActiveDay.toFixed(1),
      icon: <Repeat className="size-5" />,
    },
  ].filter(Boolean) as Tile[]

  return (
    <section className="mb-6 md:mb-8">
      <SectionHeader icon={<Activity className="size-4.5" />} title={t('statistics.consistency.title')} />

      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
        {tiles.map((tile, index) => (
          <StatCard
            key={tile.key}
            title={tile.title}
            value={tile.value}
            icon={tile.icon}
            color={tile.color}
            foreground={tile.foreground}
            className={index === tiles.length - 1 ? bentoLastTile(tiles.length) : undefined}
          />
        ))}
      </div>
    </section>
  )
}

export default ConsistencySection
