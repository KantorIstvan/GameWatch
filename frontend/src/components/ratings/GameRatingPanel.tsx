import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Trophy, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ratingsApi } from '../../services/api'
import type { GameRatingSummary } from '../../types'

interface GameRatingPanelProps {
  /** Null for a game nobody has rated or reviewed yet - see {@link useCatalogGame}. */
  gameId: number | null
  ensureGameId: () => Promise<number>
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const EMPTY_SUMMARY: GameRatingSummary = {
  gameId: 0,
  bayesianScore: null,
  averageScore: null,
  ratingCount: 0,
  distribution: {},
  yourScore: null,
  finisherCount: 0,
  finisherAverageScore: null,
  verifiedCount: 0,
  verifiedAverageScore: null,
}

/**
 * A game's score, and this user's contribution to it.
 *
 * Shows the ranked score, the plain average and the distribution together. The ranked
 * score is shrunk towards the global mean so a single enthusiastic rating cannot top the
 * list, which makes it defensible but not self-explanatory - the count and the histogram
 * next to it are what turn it from a magic number into something a reader can check.
 *
 * A game with no catalog row yet has nothing to fetch, so the panel starts from an empty
 * summary and claims the row on the first rating. Rating a game is exactly the moment it
 * becomes worth having a row for.
 */
function GameRatingPanel({ gameId, ensureGameId }: GameRatingPanelProps) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<GameRatingSummary | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (gameId === null) {
      setSummary(EMPTY_SUMMARY)
      return
    }
    ratingsApi
      .getSummary(gameId)
      .then((response) => setSummary(response.data))
      .catch(() => setSummary(null))
  }, [gameId])

  const submit = useCallback(
    async (score: number) => {
      setBusy(true)
      try {
        const id = await ensureGameId()
        const response =
          summary?.yourScore === score
            ? await ratingsApi.removeRating(id)
            : await ratingsApi.rate(id, score)
        setSummary(response.data)
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('ratings.failed'))
      } finally {
        setBusy(false)
      }
    },
    [ensureGameId, summary?.yourScore, t]
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
        <div className="mb-6 flex h-24 gap-1" role="img" aria-label={t('ratings.distributionLabel')}>
          {SCORES.map((score) => {
            const count = summary.distribution[score] ?? 0
            return (
              <div key={score} className="flex flex-1 flex-col items-center gap-1">
                {/* The track carries the definite height the bar's percentage resolves
                    against - a content-sized parent would collapse the bar to nothing. */}
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      'w-full rounded-sm transition-all duration-150 ease-standard',
                      // Two neutral steps rather than an accent hue: the distribution is
                      // context for the score above it, not a mark competing with it. An
                      // unrated score keeps a baseline tick so the axis still reads as a
                      // chart when only one or two scores have votes.
                      count > 0 ? 'bg-text-secondary' : 'h-0.5 bg-border'
                    )}
                    style={count > 0 ? { height: `${Math.max(8, (count / peak) * 100)}%` } : undefined}
                    title={t('ratings.scoreCount', { score, count })}
                  />
                </div>
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
