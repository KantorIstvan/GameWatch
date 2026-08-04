import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, CircleSlash, RotateCcw, PlayCircle, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import UserLink from '../components/social/UserLink'
import { feedApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { formatTime } from '../utils/formatters'
import type { ActivityEvent } from '../types'

const ICONS: Record<string, JSX.Element> = {
  FINISHED: <Trophy className="size-4" />,
  DROPPED: <CircleSlash className="size-4" />,
  PICKED_UP: <RotateCcw className="size-4" />,
  STARTED: <PlayCircle className="size-4" />,
}

/**
 * What the people you follow have been playing.
 *
 * Events are derived from playthrough state on the backend rather than stored, so a
 * playthrough that is deleted or made private simply stops appearing here.
 */
function Feed() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthReady) return

    feedApi
      .getFeed()
      .then((response) => setEvents(response.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [isAuthReady])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 bg-border" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-h2 font-bold">{t('feed.title')}</h1>

      {events.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <Users className="mt-0.5 size-5 shrink-0 text-text-secondary" />
          <div>
            <p className="text-body-sm font-medium">{t('feed.emptyTitle')}</p>
            <p className="text-body-sm text-text-secondary">{t('feed.emptyBody')}</p>
          </div>
        </div>
      ) : (
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
                    {formatTime(event.playtimeSeconds)}
                  </span>
                  <span>{new Date(event.occurredAt).toLocaleDateString()}</span>
                </p>
              </div>

              {event.bannerImageUrl && (
                <img
                  src={event.bannerImageUrl}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Feed
