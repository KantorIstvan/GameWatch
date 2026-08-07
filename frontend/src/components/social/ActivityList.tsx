import { useTranslation } from 'react-i18next'
import {
  Trophy,
  CircleSlash,
  RotateCcw,
  PlayCircle,
  Users,
  MessageSquare,
  Star,
  Heart,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import UserLink from './UserLink'
import { formatTime } from '../../utils/formatters'
import type { ActivityEvent } from '../../types'

export type FeedScope = 'following' | 'self'

const ICONS: Record<string, JSX.Element> = {
  FINISHED: <Trophy className="size-4" />,
  DROPPED: <CircleSlash className="size-4" />,
  PICKED_UP: <RotateCcw className="size-4" />,
  STARTED: <PlayCircle className="size-4" />,
  REVIEWED: <MessageSquare className="size-4" />,
  RATED: <Star className="size-4" />,
  WISHLISTED: <Heart className="size-4" />,
}

/** Playtime is only recorded on playthrough-derived events - everything else has nothing to show there. */
const PLAYTIME_TYPES = new Set(['FINISHED', 'DROPPED', 'PICKED_UP', 'STARTED'])

interface ActivityListProps {
  events: ActivityEvent[]
  scope: FeedScope
  /** True only on the very first load for a scope with nothing cached yet - a scope
   *  switch that already has events to show keeps them visible instead of blanking. */
  loading: boolean
}

/**
 * Presentational activity feed list - the Feed page owns fetching/caching per scope and
 * only swaps what this component receives, so switching "Following"/"My Activity" never
 * has to blank or remount the rest of the page.
 */
function ActivityList({ events, scope, loading }: ActivityListProps) {
  const { t } = useTranslation()

  // The one extra fact worth surfacing beside the icon and date - playtime for a
  // playthrough milestone, the score for a rating, nothing for a review or a wishlist add
  // (the sentence above already says everything there is to say about those).
  const metaLabel = (event: ActivityEvent): string | null => {
    if (PLAYTIME_TYPES.has(event.type)) {
      return formatTime(event.playtimeSeconds)
    }
    if (event.type === 'RATED' && event.score != null) {
      return t('feed.scoreValue', { score: event.score })
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 bg-border" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
        <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
        <div>
          <p className="text-body-sm font-medium">{t('feed.emptyTitle')}</p>
          <p className="text-body-sm text-text-secondary">
            {scope === 'self' ? t('feed.emptySelfBody') : t('feed.emptyBody')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li
          key={`${event.actorHandle}-${event.id}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl sm:p-4"
        >
          <UserLink
            variant="avatar"
            handle={event.actorHandle}
            displayName={event.actorDisplayName}
            pictureUrl={event.actorPictureUrl}
          />

          <div className="min-w-0 flex-1">
            <p className="text-body-sm">
              <UserLink
                variant="name"
                handle={event.actorHandle}
                displayName={event.actorDisplayName}
              />{' '}
              <span className="text-text-secondary">
                {t(`feed.action.${event.type}`)}
              </span>{' '}
              <span className="font-medium text-text-primary">{event.gameName}</span>
            </p>
            <p className="flex items-center gap-2 text-caption text-text-secondary">
              <span className="flex items-center gap-1">
                {ICONS[event.type]}
                {metaLabel(event)}
              </span>
              <span>{new Date(event.occurredAt).toLocaleDateString()}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ActivityList
