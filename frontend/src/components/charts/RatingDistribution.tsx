import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * What one bar counts, which changes the wording but nothing else.
 *
 * `games` is a person's own shelf ("3 games"), `ratings` is a game's incoming votes
 * ("3 ratings"). Same chart, and the difference is only ever a label - so it stays a
 * variant here rather than a second copy of the component.
 */
type RatingDistributionUnit = 'games' | 'ratings'

interface RatingDistributionProps {
  /** Score (1-10) to how many ratings sit on it. A missing score reads as zero. */
  distribution: Record<number, number>
  /** The mean the bars describe. Null drops the readout instead of printing a placeholder. */
  average: number | null
  /** Already-translated caption under the average - it reads differently per page. */
  averageLabel: string
  /** Already-translated description of the chart as a whole, for assistive tech. */
  chartLabel: string
  unit?: RatingDistributionUnit
  className?: string
}

/**
 * The mean of a 1-10 histogram, for callers that only have the histogram.
 *
 * A profile ships the distribution but no average, and deriving it here keeps the number
 * and the bars provably the same data instead of two figures that can drift apart.
 * Returns null for an empty histogram, since "no ratings" is not a score of zero.
 */
export function averageOfDistribution(distribution: Record<number, number>): number | null {
  let total = 0
  let weighted = 0
  for (const score of SCORES) {
    const count = distribution[score] ?? 0
    total += count
    weighted += count * score
  }
  return total > 0 ? weighted / total : null
}

/**
 * How a set of 1-10 ratings is spread, with its average as the headline.
 *
 * The average is the number worth reading; the bars are the evidence behind it, which is
 * why the mean is set large and the histogram stays chromatically neutral. Colour here
 * would imply the scores mean different things, and they don't - they are one continuous
 * scale, so the bars only vary in height.
 *
 * Renders no container of its own. Both hosts already sit inside their page's own
 * surfaces, and wrapping the chart again produced a box inside a box.
 */
function RatingDistribution({
  distribution,
  average,
  averageLabel,
  chartLabel,
  unit = 'ratings',
  className,
}: RatingDistributionProps) {
  const { t } = useTranslation()

  const peak = Math.max(1, ...SCORES.map((score) => distribution[score] ?? 0))

  return (
    <div className={cn('flex items-end gap-4 sm:gap-6', className)}>
      {average !== null && (
        <div className="shrink-0">
          <p className="text-h2 font-bold leading-none tabular-nums text-text-primary">
            {average.toFixed(1)}
          </p>
          <p className="mt-2 text-caption text-text-secondary">{averageLabel}</p>
        </div>
      )}

      <div className="flex h-24 min-w-0 flex-1 gap-1" role="group" aria-label={chartLabel}>
        {SCORES.map((score) => {
          const count = distribution[score] ?? 0
          return (
            /* Hoverable content is off so sliding along the axis swaps readouts immediately
               instead of waiting for the pointer to leave a tooltip it never entered. */
            <Tooltip key={score} disableHoverableContent>
              <TooltipTrigger
                className="group flex flex-1 cursor-default flex-col items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t(`ratingDistribution.${unit}BarLabel`, { score, count })}
              >
                {/* The track carries the definite height the bar's percentage resolves
                    against - a content-sized parent would collapse the bar to nothing. */}
                <span className="flex w-full flex-1 items-end">
                  <span
                    className={cn(
                      'w-full transition-all duration-150 ease-standard',
                      // Two neutral steps rather than an accent hue: the distribution is
                      // context for the average beside it, not a mark competing with it. An
                      // unrated score keeps a baseline tick so the axis still reads as a
                      // chart when only one or two scores have votes. Hover and focus step
                      // one shade darker - still neutral, and no size change, so pointing at
                      // a bar never reflows the row.
                      count > 0
                        ? 'bg-text-secondary group-hover:bg-text-primary group-focus-visible:bg-text-primary'
                        : 'h-0.5 bg-border group-hover:bg-text-secondary group-focus-visible:bg-text-secondary'
                    )}
                    style={
                      count > 0 ? { height: `${Math.max(8, (count / peak) * 100)}%` } : undefined
                    }
                  />
                </span>
                <span className="text-caption text-text-secondary transition-colors duration-150 ease-standard group-hover:text-text-primary group-focus-visible:text-text-primary">
                  {score}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-semibold">{t('ratingDistribution.score', { score })}</p>
                {/* Dimmed against the tooltip's own foreground rather than text-secondary,
                    which is tuned for the page background and washes out on this one. */}
                <p className="text-background/75">{t(`ratingDistribution.${unit}`, { count })}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

export default RatingDistribution
