import { TrendingUp, TrendingDown, Minus, Shuffle, CalendarRange, CircleSlash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatCard from '../StatCard'
import { formatTime } from '../../utils/formatters'
import { statColors, statForegrounds } from '../../lib/statColors'
import type { TrendStats } from '../../types'

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

  return (
    <section className="mb-6 md:mb-8">
      <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('statistics.trends.title')}</p>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
        {hasComparison && (
          <StatCard
            title={t('statistics.trends.vsPreviousPeriod')}
            value={`${change > 0 ? '+' : ''}${Math.round(change)}%`}
            icon={
              rising ? (
                <TrendingUp className="size-5" />
              ) : falling ? (
                <TrendingDown className="size-5" />
              ) : (
                <Minus className="size-5" />
              )
            }
            color={changeColor}
            foreground={changeForeground}
          />
        )}

        {stats.weekendIntensityRatio !== null && stats.weekendIntensityRatio !== undefined && (
          <StatCard
            title={t('statistics.trends.weekendIntensity')}
            value={`${stats.weekendIntensityRatio.toFixed(1)}×`}
            icon={<CalendarRange className="size-5" />}
          />
        )}

        <StatCard
          title={t('statistics.trends.varietyScore')}
          value={Math.round(stats.varietyScore)}
          icon={<Shuffle className="size-5" />}
        />

        <StatCard
          title={t('statistics.trends.topThreeShare')}
          value={`${Math.round(stats.topThreeSharePercentage)}%`}
          icon={<TrendingUp className="size-5" />}
        />

        {stats.dropRatePercentage !== null && stats.dropRatePercentage !== undefined && (
          <StatCard
            title={t('statistics.trends.dropRate')}
            value={`${Math.round(stats.dropRatePercentage)}%`}
            icon={<CircleSlash className="size-5" />}
          />
        )}

        {stats.medianSecondsBeforeDropping !== null &&
          stats.medianSecondsBeforeDropping !== undefined && (
            <StatCard
              title={t('statistics.trends.medianBeforeDropping')}
              value={formatTime(stats.medianSecondsBeforeDropping)}
              icon={<CircleSlash className="size-5" />}
            />
          )}
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

      {stats.completionComparisons.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:mt-5 sm:p-6">
          <p className="mb-1 text-body-sm font-medium text-text-secondary">
            {t('statistics.trends.comparisonTitle')}
          </p>
          <p className="mb-4 text-caption text-text-secondary">
            {t('statistics.trends.comparisonSubtitle')}
          </p>

          <ul className="flex flex-col gap-3">
            {stats.completionComparisons.map((comparison) => {
              const slower = comparison.ratio >= 1
              return (
                <li key={comparison.gameId} className="flex items-center gap-3">
                  {comparison.bannerImageUrl && (
                    <img
                      src={comparison.bannerImageUrl}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium text-text-primary">
                      {comparison.gameName}
                    </span>
                    <span className="block text-caption text-text-secondary">
                      {t('statistics.trends.yoursVsTypical', {
                        yours: formatTime(comparison.yourSeconds),
                        typical: formatTime(comparison.typicalSeconds),
                      })}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-md px-2 py-1 text-caption font-semibold"
                    style={{
                      color: slower ? statColors.orange : statColors.green,
                      backgroundColor: `color-mix(in srgb, ${
                        slower ? statColors.orange : statColors.green
                      } 12%, transparent)`,
                    }}
                  >
                    {slower
                      ? t('statistics.trends.slower', { factor: comparison.ratio.toFixed(1) })
                      : t('statistics.trends.faster', {
                          factor: (1 / comparison.ratio).toFixed(1),
                        })}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export default TrendsSection
