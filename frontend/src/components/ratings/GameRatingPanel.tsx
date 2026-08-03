import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Trophy, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ratingsApi } from '../../services/api'
import { statColors } from '../../lib/statColors'
import type { GameRatingSummary } from '../../types'

interface GameRatingPanelProps {
  gameId: number
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * A game's score, and this user's contribution to it.
 *
 * Shows the ranked score, the plain average and the distribution together. The ranked
 * score is shrunk towards the global mean so a single enthusiastic rating cannot top the
 * list, which makes it defensible but not self-explanatory - the count and the histogram
 * next to it are what turn it from a magic number into something a reader can check.
 */
function GameRatingPanel({ gameId }: GameRatingPanelProps) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<GameRatingSummary | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ratingsApi
      .getSummary(gameId)
      .then((response) => setSummary(response.data))
      .catch(() => setSummary(null))
  }, [gameId])

  const submit = useCallback(
    async (score: number) => {
      setBusy(true)
      try {
        const response =
          summary?.yourScore === score
            ? await ratingsApi.removeRating(gameId)
            : await ratingsApi.rate(gameId, score)
        setSummary(response.data)
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('ratings.failed'))
      } finally {
        setBusy(false)
      }
    },
    [gameId, summary?.yourScore, t]
  )

  if (!summary) {
    return null
  }

  const peak = Math.max(1, ...Object.values(summary.distribution))
  const active = hovered ?? summary.yourScore ?? 0

  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4 backdrop-blur-xl sm:p-6">
      <p className="mb-4 text-body-sm font-bold sm:text-body-lg">{t('ratings.title')}</p>

      {summary.ratingCount === 0 ? (
        <p className="mb-4 text-body-sm text-text-secondary">{t('ratings.noRatingsYet')}</p>
      ) : (
        <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-display font-bold leading-none text-text-primary">
              {summary.bayesianScore?.toFixed(1)}
            </p>
            <p className="mt-1 text-caption text-text-secondary">
              {t('ratings.rankedScore', { count: summary.ratingCount })}
            </p>
          </div>

          <div>
            <p className="text-h3 font-semibold text-text-secondary">
              {summary.averageScore?.toFixed(1)}
            </p>
            <p className="text-caption text-text-secondary">{t('ratings.plainAverage')}</p>
          </div>

          {summary.finisherCount > 0 && (
            <div>
              <p className="flex items-center gap-1 text-h3 font-semibold text-text-secondary">
                <Trophy className="size-4" />
                {summary.finisherAverageScore?.toFixed(1)}
              </p>
              <p className="text-caption text-text-secondary">
                {t('ratings.finishers', { count: summary.finisherCount })}
              </p>
            </div>
          )}

          {summary.verifiedCount > 0 && (
            <div>
              <p className="flex items-center gap-1 text-h3 font-semibold text-text-secondary">
                <Clock className="size-4" />
                {summary.verifiedAverageScore?.toFixed(1)}
              </p>
              <p className="text-caption text-text-secondary">
                {t('ratings.verified', { count: summary.verifiedCount })}
              </p>
            </div>
          )}
        </div>
      )}

      {summary.ratingCount > 0 && (
        <div className="mb-6 flex h-16 items-end gap-1" role="img" aria-label={t('ratings.distributionLabel')}>
          {SCORES.map((score) => {
            const count = summary.distribution[score] ?? 0
            return (
              <div key={score} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all duration-150 ease-standard"
                  style={{
                    height: `${Math.max(2, (count / peak) * 100)}%`,
                    backgroundColor: count > 0 ? statColors.aqua : 'var(--color-border)',
                  }}
                  title={t('ratings.scoreCount', { score, count })}
                />
                <span className="text-caption text-text-secondary">{score}</span>
              </div>
            )
          })}
        </div>
      )}

      <p className="mb-2 text-body-sm font-semibold">
        {summary.yourScore ? t('ratings.yourScore', { score: summary.yourScore }) : t('ratings.rateIt')}
      </p>

      <div className="flex flex-wrap gap-1" onMouseLeave={() => setHovered(null)}>
        {SCORES.map((score) => (
          <Button
            key={score}
            variant={score <= active ? 'default' : 'outline'}
            size="sm"
            disabled={busy}
            onMouseEnter={() => setHovered(score)}
            onClick={() => submit(score)}
            aria-label={t('ratings.rateAria', { score })}
            aria-pressed={summary.yourScore === score}
            className="min-w-9"
          >
            {score === active ? <Star className="size-4" /> : score}
          </Button>
        ))}
      </div>

      {summary.yourScore !== null && summary.yourScore !== undefined && (
        <p className="mt-2 text-caption text-text-secondary">{t('ratings.clickAgainToClear')}</p>
      )}
    </div>
  )
}

export default GameRatingPanel
