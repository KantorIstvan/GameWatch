import { Library, PackageOpen, Hourglass, CircleCheck, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import StatCard from '../StatCard'
import SectionHeader from './SectionHeader'
import { formatTime } from '../../utils/formatters'
import { statColors, statForegrounds } from '../../lib/statColors'
import type { BacklogStats } from '../../types'

interface BacklogSectionProps {
  stats?: BacklogStats
}

interface FunnelStep {
  label: string
  count: number
}

/**
 * The shape of the library rather than of the selected period.
 *
 * Unlike everything else on this page these numbers ignore the period picker, because a
 * backlog is a fact about right now - forty unplayed games do not become a different
 * number because the chart above is showing March.
 */
function BacklogSection({ stats }: BacklogSectionProps) {
  const { t } = useTranslation()

  if (!stats || !stats.gamesInLibrary) {
    return null
  }

  const funnel: FunnelStep[] = [
    { label: t('statistics.backlog.owned'), count: stats.gamesInLibrary },
    { label: t('statistics.backlog.started'), count: stats.gamesStarted },
    { label: t('statistics.backlog.pastFirstHour'), count: stats.gamesPastFirstHour },
    { label: t('statistics.backlog.finished'), count: stats.gamesFinished },
  ]

  const net = stats.gamesAddedRecently - stats.gamesFinishedRecently

  return (
    <section className="mb-6 md:mb-8">
      <SectionHeader icon={<Library className="size-4.5" />} title={t('statistics.backlog.title')} />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <div className="h-full rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6">
          <p className="mb-4 text-body-sm font-medium text-text-secondary">
            {t('statistics.backlog.funnelTitle')}
          </p>

          <div className="flex flex-col gap-3">
            {funnel.map((step) => {
              const share = stats.gamesInLibrary > 0 ? (step.count / stats.gamesInLibrary) * 100 : 0
              return (
                <div key={step.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-4">
                    <span className="text-body-sm text-text-secondary">{step.label}</span>
                    <span className="text-body-sm font-semibold text-text-primary">
                      {step.count}
                    </span>
                  </div>
                  {/* Width encodes the share of the library reaching this step, so the
                      drop-off between rows is visible without reading the numbers. */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/30">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-standard"
                      style={{ width: `${share}%`, backgroundColor: statColors.aqua }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <StatCard
            title={t('statistics.backlog.neverStarted')}
            value={stats.gamesNeverStarted}
            icon={<PackageOpen className="size-5" />}
            color={statColors.violet}
            foreground={statForegrounds.violet}
          />

          <StatCard
            title={t('statistics.backlog.medianShelfTime')}
            value={
              stats.medianShelfTimeDays === null || stats.medianShelfTimeDays === undefined
                ? t('statistics.backlog.noShelfData')
                : t('statistics.consistency.dayCount', { count: stats.medianShelfTimeDays })
            }
            icon={<Hourglass className="size-5" />}
          />

          <StatCard
            title={t('statistics.backlog.addedRecently', { months: stats.backlogWindowMonths })}
            value={stats.gamesAddedRecently}
            icon={<Library className="size-5" />}
          />

          <StatCard
            title={t('statistics.backlog.finishedRecently', { months: stats.backlogWindowMonths })}
            value={stats.gamesFinishedRecently}
            icon={<CircleCheck className="size-5" />}
          />

          <div className="col-span-2 rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6">
            <p className="text-body-sm text-text-secondary">
              {net > 0
                ? t('statistics.backlog.growingBy', { count: net, months: stats.backlogWindowMonths })
                : net < 0
                  ? t('statistics.backlog.shrinkingBy', { count: -net, months: stats.backlogWindowMonths })
                  : t('statistics.backlog.holdingSteady', { months: stats.backlogWindowMonths })}
            </p>
          </div>
        </div>
      </div>

      {stats.stalePlaythroughs.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:mt-5 sm:p-6">
          <p className="mb-1 text-body-sm font-medium text-text-secondary">
            {t('statistics.backlog.staleTitle')}
          </p>
          <p className="mb-4 text-caption text-text-secondary">
            {t('statistics.backlog.staleSubtitle')}
          </p>

          <ul className="flex flex-col gap-3">
            {stats.stalePlaythroughs.map((game) => (
              <li key={`${game.gameId}-${game.daysSinceLastPlayed}`} className="flex items-center gap-3">
                {game.bannerImageUrl && (
                  <img
                    src={game.bannerImageUrl}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium text-text-primary">
                    {game.gameName}
                  </span>
                  <span className="block text-caption text-text-secondary">
                    {formatTime(game.playtimeSeconds)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-caption text-text-secondary">
                  <Clock className="size-3" />
                  {t('statistics.backlog.untouchedFor', { count: game.daysSinceLastPlayed ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default BacklogSection
