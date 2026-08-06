import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, CircleCheck, EyeOff, Gamepad2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, splitCommaList } from '../../utils/formatters'
import { statColors } from '../../lib/statColors'
import { cn } from '@/lib/utils'

/**
 * Everything one row of the Ratings or Wishlist tab might need to show.
 *
 * A wishlist entry has no {@link score}, no {@link ratedAt} and no review - the row treats
 * those as genuinely absent rather than rendering a label next to nothing, which is what
 * makes this one shape work for both tabs instead of needing a near-duplicate per tab.
 */
export interface GameEntryRowData {
  gameId: number
  externalId?: number
  gameName: string
  bannerImageUrl?: string
  releaseDate?: string
  developers?: string
  publishers?: string
  averageCompletionSeconds?: number
  communityRatingScore?: number | null
  communityRatingCount?: number
  /** Present on a rating, absent on a wishlist entry. */
  score?: number
  ratedAt?: string
  reviewBody?: string
  reviewCreatedAt?: string
  containsSpoilers?: boolean
  /** This owner's own tracked time on the game - not the community's average. */
  playtimeSeconds?: number
  /** Present on a wishlist entry, absent on a rating. */
  addedAt?: string
}

interface GameEntryRowProps {
  /** 1-based position in the list as currently filtered and sorted. */
  index: number
  entry: GameEntryRowData
  /** Present only where the row sits inside a filterable list (the Ratings tab). */
  onDeveloperSelect?: (name: string) => void
  onPublisherSelect?: (name: string) => void
}

/**
 * One game in the Ratings or Wishlist tab: cover, "rated on" date, ordinal title, release
 * year and time-to-beat, a Developer/Publisher byline, a stats line, and - as this row's
 * own focal point, when the owner wrote one - their review. The review sits in the same
 * quoted, left-bordered treatment {@link ReviewReplies} uses for a reply thread, integrated
 * into the row's own column rather than tacked on as a full-width block underneath it. The
 * game's own catalog description never renders here: that's the catalog's synopsis, not
 * this owner's take on the game, and this row is only ever about the latter.
 *
 * The cover and the title are the only two links to the game's catalog page. Developer and
 * publisher names are separate buttons rather than nested inside that link - an `<a>`
 * containing another interactive control breaks keyboard and screen-reader navigation, and
 * clicking a company name here does something different anyway: with no per-company page in
 * this app, it narrows the current list to that company's other games instead of navigating
 * away.
 */
function GameEntryRow({ index, entry, onDeveloperSelect, onPublisherSelect }: GameEntryRowProps) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  const hasReview = Boolean(entry.reviewBody)
  const isRating = entry.score !== undefined
  const hidden = hasReview && entry.containsSpoilers && !revealed

  const ratedDate = formatDate(hasReview ? entry.reviewCreatedAt : entry.ratedAt)
  const addedDate = formatDate(entry.addedAt)
  const dateLabel = isRating
    ? ratedDate && t('profile.entryRow.ratedOn', { date: ratedDate })
    : addedDate && t('profile.wishlistAddedOn', { date: addedDate })

  const releaseYear = entry.releaseDate?.split('-')[0]
  const timeToBeat = entry.averageCompletionSeconds
    ? t('profile.entryRow.timeToBeat', { time: formatTime(entry.averageCompletionSeconds) })
    : null
  const metaLine = [releaseYear, timeToBeat].filter(Boolean).join(' · ')

  const gameLink = entry.externalId ? `/catalog/${entry.externalId}` : null

  const cover = (
    <Avatar className="h-24 w-16 shrink-0 rounded-md">
      <AvatarImage src={entry.bannerImageUrl} alt="" className="object-cover" />
      <AvatarFallback className="rounded-md bg-surface-raised text-text-tertiary">
        <Gamepad2 className="size-5" />
      </AvatarFallback>
    </Avatar>
  )

  return (
    <li className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl sm:p-4">
      <div className="flex gap-3">
        {gameLink ? (
          <Link
            to={gameLink}
            aria-label={entry.gameName}
            className="shrink-0 rounded-md outline-none transition-opacity duration-150 ease-standard hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {cover}
          </Link>
        ) : (
          cover
        )}

        <div className="min-w-0 flex-1">
          {dateLabel && <p className="text-caption text-text-secondary">{dateLabel}</p>}

          {/* One step up from the other profile rows' text-body-sm heading (see
              ProfileListRow, RecentReviews): this row stacks several metadata lines under
              it, so it needs a clearer anchor than a single-line row does. */}
          <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-body font-semibold text-text-primary">
            <span className="shrink-0 text-text-tertiary">{index}.</span>
            {gameLink ? (
              <Link
                to={gameLink}
                className="min-w-0 truncate outline-none transition-colors duration-150 ease-standard hover:text-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {entry.gameName}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{entry.gameName}</span>
            )}
          </p>

          {metaLine && <p className="mt-0.5 text-caption text-text-secondary">{metaLine}</p>}

          {(entry.developers || entry.publishers) && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-caption text-text-secondary">
              {entry.developers && (
                <span>
                  <span className="font-semibold text-text-primary">
                    {t('profile.entryRow.developerLabel')}
                  </span>{' '}
                  <NameLinks names={entry.developers} onSelect={onDeveloperSelect} />
                </span>
              )}
              {entry.publishers && (
                <span>
                  <span className="font-semibold text-text-primary">
                    {t('profile.entryRow.publisherLabel')}
                  </span>{' '}
                  <NameLinks names={entry.publishers} onSelect={onPublisherSelect} />
                </span>
              )}
            </p>
          )}

          {(entry.communityRatingScore != null || isRating) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              {entry.communityRatingScore != null && (
                <span className="flex items-center gap-1 text-body-sm font-medium text-text-secondary">
                  <Star className="size-3.5 fill-current" style={{ color: statColors.yellow }} />
                  {entry.communityRatingScore.toFixed(1)}
                  <span className="text-caption text-text-tertiary">
                    {t('profile.entryRow.communityScore', {
                      count: entry.communityRatingCount ?? 0,
                    })}
                  </span>
                </span>
              )}

              {isRating && (
                <span className="flex items-center gap-1.5">
                  <span className="text-caption text-text-tertiary">
                    {t('profile.entryRow.yourScoreLabel')}
                  </span>
                  <Badge variant="secondary">{t('profile.ratingScore', { score: entry.score })}</Badge>
                </span>
              )}

              {isRating && (
                <span className="flex items-center gap-1 text-caption text-text-tertiary">
                  <CircleCheck className="size-3.5 text-success" />
                  {entry.playtimeSeconds
                    ? t('profile.entryRow.playedWithTime', { time: formatTime(entry.playtimeSeconds) })
                    : t('profile.entryRow.played')}
                </span>
              )}
            </div>
          )}

          {/* The row's own focal point when one exists: the owner's take on the game, not
              the catalog's. Quoted with the same border-l-2 border-border treatment
              ReviewReplies uses for a reply thread, and folded into this column instead of
              spanning full-width below everything - it reads as this row's headline
              content, not an appendage bolted on underneath the metadata. */}
          {hasReview && (
            <div className="mt-2 border-l-2 border-border pl-3">
              {hidden ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-left text-body-sm text-text-secondary transition-colors duration-150 ease-standard hover:bg-border/10"
                >
                  <EyeOff className="size-4 shrink-0" />
                  {t('reviews.spoilerHidden')}
                </button>
              ) : (
                <p className="line-clamp-3 whitespace-pre-wrap text-body-sm text-text-secondary">
                  {entry.reviewBody}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/** A comma-separated catalog field, rendered as one clickable name per entry. */
function NameLinks({ names, onSelect }: { names: string; onSelect?: (name: string) => void }) {
  const list = splitCommaList(names)
  return (
    <>
      {list.map((name, i) => (
        <span key={name}>
          {onSelect ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onSelect(name)
              }}
              className={cn(
                'text-accent underline-offset-2 outline-none hover:underline',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:rounded-sm'
              )}
            >
              {name}
            </button>
          ) : (
            name
          )}
          {i < list.length - 1 && ', '}
        </span>
      ))}
    </>
  )
}

export default GameEntryRow
