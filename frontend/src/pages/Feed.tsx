import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { feedApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import ActivityList, { FeedScope } from '../components/social/ActivityList'
import type { ActivityEvent } from '../types'

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
  const [isFetching, setIsFetching] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [scope, setScope] = useState<FeedScope>('following')

  useEffect(() => {
    if (!isAuthReady) return

    // Switching scope keeps whatever's already rendered on screen instead of blanking it -
    // only a request for a scope that has never loaded shows the skeleton state.
    let cancelled = false
    setIsFetching(true)
    feedApi
      .getFeed(undefined, scope)
      .then((response) => {
        if (cancelled) return
        setEvents(response.data)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false)
          setHasLoadedOnce(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthReady, scope])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h2 font-bold">{t('feed.title')}</h1>
        <div className="flex items-center gap-3">
          {isFetching && hasLoadedOnce && (
            <Loader2 className="size-4 shrink-0 animate-spin text-text-secondary" />
          )}
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
      </div>

      <div
        className={`transition-opacity duration-150 ease-standard ${isFetching && hasLoadedOnce ? 'opacity-60' : 'opacity-100'}`}
      >
        <ActivityList events={events} scope={scope} loading={isFetching && !hasLoadedOnce} />
      </div>
    </div>
  )
}

export default Feed
