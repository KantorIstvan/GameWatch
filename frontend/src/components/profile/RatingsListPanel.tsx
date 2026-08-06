import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Lock, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { profilesApi } from '../../services/api'
import { formatDate } from '../../utils/formatters'
import type { GameRatingEntry } from '../../types'

interface RatingsListPanelProps {
  handle: string
}

/**
 * Every game a profile owner has rated, and the score they gave it - plus what they wrote
 * and when, for the games that also got a written review.
 *
 * Loads on mount rather than with the profile, matching {@link FollowListPanel} - opening a
 * profile should not pay for a list nobody may look at, since the tabs above this are where
 * most visits stop. Gated behind library visibility server-side: a `null` response means the
 * viewer may not see it, not that nothing has been rated, and renders the same "not shared"
 * message the Overview tab shows for the rest of the library.
 */
function RatingsListPanel({ handle }: RatingsListPanelProps) {
  const { t } = useTranslation()
  const [ratings, setRatings] = useState<GameRatingEntry[] | null>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const reveal = (gameId: number) => {
    setRevealed((current) => new Set(current).add(gameId))
  }

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)
    profilesApi
      .getRatings(handle)
      .then((response) => {
        if (active) setRatings(response.data)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [handle])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-18 bg-border" />
        ))}
      </div>
    )
  }

  if (failed) {
    return <p className="text-body-sm text-text-secondary">{t('profile.listUnavailable')}</p>
  }

  if (ratings === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <Lock className="size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{t('profile.libraryHidden')}</p>
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
        <Star className="mt-0.5 size-5 shrink-0 text-text-secondary" />
        <p className="text-body-sm text-text-secondary">{t('profile.noRatings')}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {ratings.map((entry) => {
        const hasReview = Boolean(entry.reviewBody)
        const hidden = hasReview && entry.containsSpoilers && !revealed.has(entry.gameId)
        return (
          <li
            key={entry.gameId}
            className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              {entry.bannerImageUrl && (
                <img
                  src={entry.bannerImageUrl}
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-md bg-surface object-contain"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                    {entry.gameName}
                  </span>
                  <span className="shrink-0 text-body-sm font-semibold text-text-primary">
                    {t('profile.ratingScore', { score: entry.score })}
                  </span>
                </div>
                <span className="text-caption text-text-secondary">
                  {formatDate(hasReview ? entry.reviewCreatedAt! : entry.ratedAt)}
                </span>
              </div>
            </div>

            {hasReview && (
              hidden ? (
                <button
                  type="button"
                  onClick={() => reveal(entry.gameId)}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-left text-body-sm text-text-secondary transition-colors duration-150 ease-standard hover:bg-border/10"
                >
                  <EyeOff className="size-4 shrink-0" />
                  {t('reviews.spoilerHidden')}
                </button>
              ) : (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-body-sm text-text-secondary">
                  {entry.reviewBody}
                </p>
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default RatingsListPanel
