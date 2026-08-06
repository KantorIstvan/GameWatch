import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EyeOff } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { cn } from '@/lib/utils'
import type { ProfileReview } from '../../types'

interface RecentReviewsProps {
  reviews: ProfileReview[]
}

/**
 * What this profile has recently written, next to what they've most played.
 *
 * A leaner row than {@link GameReviewsPanel}'s: the author is implicitly whoever owns this
 * profile, so each row leads with the game instead of the author, and the body is clamped
 * rather than shown in full - this is a summary, the full review still lives on the game's
 * own page. The spoiler-hide interaction is kept, since it's the one behavior a review row
 * on this app is not itself without.
 */
function RecentReviews({ reviews }: RecentReviewsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const reveal = (index: number) => {
    setRevealed((current) => new Set(current).add(index))
  }

  return (
    <section>
      <p className="mb-3 text-body-lg font-bold sm:mb-4">{t('profile.recentReviews')}</p>
      <ul className="flex flex-col gap-3">
        {reviews.map((review, index) => {
          const hidden = review.containsSpoilers && !revealed.has(index)
          return (
            <li
              key={`${review.gameId}-${review.createdAt}`}
              onClick={
                review.gameExternalId ? () => navigate(`/catalog/${review.gameExternalId}`) : undefined
              }
              className={cn(
                'rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl',
                review.gameExternalId &&
                  'cursor-pointer transition-colors duration-150 ease-standard hover:bg-surface'
              )}
            >
              <div className="flex items-center gap-3">
                {review.gameBannerImageUrl && (
                  <img
                    src={review.gameBannerImageUrl}
                    alt=""
                    className="h-24 w-16 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                      {review.gameName}
                    </span>
                    {review.score !== null && (
                      <span className="shrink-0 text-body-sm font-semibold text-text-primary">
                        {review.score}/10
                      </span>
                    )}
                  </div>
                  <span className="text-caption text-text-secondary">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </div>

              {hidden ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    reveal(index)
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-left text-body-sm text-text-secondary transition-colors duration-150 ease-standard hover:bg-border/10"
                >
                  <EyeOff className="size-4 shrink-0" />
                  {t('reviews.spoilerHidden')}
                </button>
              ) : (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-body-sm text-text-secondary">
                  {review.body}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default RecentReviews
