import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trophy, CircleSlash, RotateCcw, PlayCircle, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { feedApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime } from '../utils/formatters'
import type { ActivityEvent } from '../types'

type FeedScope = 'following' | 'self'

const ICONS: Record<string, JSX.Element> = {
  FINISHED: <Trophy className="size-4" />,
  DROPPED: <CircleSlash className="size-4" />,
  PICKED_UP: <RotateCcw className="size-4" />,
  STARTED: <PlayCircle className="size-4" />,
}

/**
 * What the people you follow - or you yourself - have been playing.
 *
 * Events are derived from playthrough state on the backend rather than stored, so a
 * playthrough that is deleted or made private simply stops appearing here.
 */
function Feed() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<FeedScope>('following')

  useEffect(() => {
    if (!isAuthReady) return

    setLoading(true)
    feedApi
      .getFeed(undefined, scope)
      .then((response) => setEvents(response.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [isAuthReady, scope])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h2 font-bold">{t('feed.title')}</h1>
        <ToggleGroup
          type="single"
          value={scope}
          onValueChange={(v) => v && setScope(v as FeedScope)}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <ToggleGroupItem value="following" className="flex-1 sm:flex-initial">
            {t('feed.filter.following')}
          </ToggleGroupItem>
          <ToggleGroupItem value="self" className="flex-1 sm:flex-initial">
            {t('feed.filter.self')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 bg-border" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <div>
            <p className="text-body-sm font-medium">{t('feed.emptyTitle')}</p>
            <p className="text-body-sm text-text-secondary">
              {scope === 'self' ? t('feed.emptySelfBody') : t('feed.emptyBody')}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={`${event.actorHandle}-${event.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 backdrop-blur-xl sm:p-4"
            >
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={event.actorPictureUrl ?? undefined} alt="" />
                <AvatarFallback>
                  {(event.actorHandle ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-body-sm">
                  <Link
                    to={`/u/${event.actorHandle}`}
                    className="font-medium text-text-primary hover:underline"
                  >
                    {event.actorDisplayName ?? event.actorHandle}
                  </Link>{' '}
                  <span className="text-text-secondary">
                    {t(`feed.action.${event.type}`)}
                  </span>{' '}
                  <span className="font-medium text-text-primary">{event.gameName}</span>
                </p>
                <p className="flex items-center gap-2 text-caption text-text-secondary">
                  <span className="flex items-center gap-1">
                    {ICONS[event.type]}
                    {formatTime(event.playtimeSeconds)}
                  </span>
                  <span>{new Date(event.occurredAt).toLocaleDateString()}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Feed
