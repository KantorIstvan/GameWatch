import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, Shuffle, CalendarRange, CircleSlash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatCard from '../StatCard'
import SectionHeader from './SectionHeader'
import { formatTime } from '../../utils/formatters'
import { bentoLastTile } from '../../lib/bento'
import { statColors, statForegrounds } from '../../lib/statColors'
import type { TrendStats } from '../../types'

interface Tile {
  key: string
  title: string
  value: string | number
  icon: ReactNode
  color?: string
  foreground?: string
}

interface TrendsSectionProps {
  stats?: TrendStats
}

/**
 * Direction and shape of play rather than its volume.
 *
 * The totals elsewhere on the page say how much was played. These say whether that is more
 * or less than last time, when in the week it happens, how spread out it is across the
 * library, and what tends to become of the games that get abandoned.
 */
function TrendsSection({ stats }: TrendsSectionProps) {
  const { t } = useTranslation()

  if (!stats) {
    return null
  }

  const change = stats.playtimeChangePercentage
  const hasComparison = change !== null && change !== undefined
  const rising = hasComparison && change > 0
  const falling = hasComparison && change < 0

  const changeColor = rising ? statColors.green : falling ? statColors.orange : undefined
  const changeForeground = rising
    ? statForegrounds.green
    : falling
      ? statForegrounds.orange
      : undefined

  // Collected rather than written inline, because how many of these survive depends on the
  // data and the last one has to stretch to keep the bento row flush.
  const tiles: Tile[] = [
    hasComparison && {
      key: 'change',
      title: t('statistics.trends.vsPreviousPeriod'),
      value: `${change > 0 ? '+' : ''}${Math.round(change)}%`,
      icon: rising ? (
        <TrendingUp className="size-5" />
      ) : falling ? (
        <TrendingDown className="size-5" />
      ) : (
        <Minus className="size-5" />
      ),
      color: changeColor,
      foreground: changeForeground,
    },

    stats.weekendIntensityRatio !== null &&
      stats.weekendIntensityRatio !== undefined && {
        key: 'weekendIntensity',
        title: t('statistics.trends.weekendIntensity'),
        value: `${stats.weekendIntensityRatio.toFixed(1)}×`,
        icon: <CalendarRange className="size-5" />,
      },

    {
      key: 'varietyScore',
      title: t('statistics.trends.varietyScore'),
      value: Math.round(stats.varietyScore),
      icon: <Shuffle className="size-5" />,
    },

    {
      key: 'topThreeShare',
      title: t('statistics.trends.topThreeShare'),
      value: `${Math.round(stats.topThreeSharePercentage)}%`,
      icon: <TrendingUp className="size-5" />,
    },

    stats.dropRatePercentage !== null &&
      stats.dropRatePercentage !== undefined && {
        key: 'dropRate',
        title: t('statistics.trends.dropRate'),
        value: `${Math.round(stats.dropRatePercentage)}%`,
        icon: <CircleSlash className="size-5" />,
      },

    stats.medianSecondsBeforeDropping !== null &&
      stats.medianSecondsBeforeDropping !== undefined && {
        key: 'medianBeforeDropping',
        title: t('statistics.trends.medianBeforeDropping'),
        value: formatTime(stats.medianSecondsBeforeDropping),
        icon: <CircleSlash className="size-5" />,
      },
  ].filter(Boolean) as Tile[]

  return (
    <section className="mb-6 md:mb-8">
      <SectionHeader icon={<TrendingUp className="size-4.5" />} title={t('statistics.trends.title')} />

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

      {stats.weekendIntensityRatio !== null && stats.weekendIntensityRatio !== undefined && (
        <p className="mt-3 text-body-sm text-text-secondary">
          {stats.weekendIntensityRatio >= 1
            ? t('statistics.trends.weekendHeavy', {
                ratio: stats.weekendIntensityRatio.toFixed(1),
              })
            : t('statistics.trends.weekdayHeavy', {
                ratio: (1 / stats.weekendIntensityRatio).toFixed(1),
              })}
        </p>
      )}
    </section>
  )
}

export default TrendsSection
