import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import MultiSelectFilter from '../components/MultiSelectFilter'
import { feedApi, followsApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import ActivityList, { FeedScope } from '../components/social/ActivityList'
import type { ActivityEvent, FollowPerson } from '../types'

const PAGE_SIZE = 30

/**
 * What the people you follow - or you yourself - have been playing, reviewing, rating and
 * wishlisting.
 *
 * Events are derived from playthrough/review/rating/wishlist state on the backend rather
 * than stored, so something deleted or made private simply stops appearing here.
 */
function Feed() {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [scope, setScope] = useState<FeedScope>('following')
  const [following, setFollowing] = useState<FollowPerson[]>([])
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())

  // Who to offer in the "following" scope's people filter. Loaded once rather than derived
  // from the feed itself, since the feed only ever shows people who have posted something -
  // someone followed but silent so far should still be selectable, if for no other reason
  // than to prove there is nothing from them yet.
  useEffect(() => {
    if (!isAuthReady) return
    let cancelled = false
    followsApi
      .getFollowing()
      .then((response) => {
        if (!cancelled) setFollowing(response.data)
      })
      .catch(() => {
        if (!cancelled) setFollowing([])
      })
    return () => {
      cancelled = true
    }
  }, [isAuthReady])

  // MultiSelectFilter works in plain strings, with no separate id/label - so the filter
  // chip shows "@handle" (this app's usual way of printing a handle on its own) and this
  // map is what turns a chosen chip back into the handle the API actually filters by.
  const optionToHandle = useMemo(() => {
    const map = new Map<string, string>()
    following.forEach((person) => map.set(`@${person.handle}`, person.handle))
    return map
  }, [following])

  const followingOptions = useMemo(() => Array.from(optionToHandle.keys()), [optionToHandle])

  const selectedOptions = useMemo(() => {
    const options = new Set<string>()
    optionToHandle.forEach((handle, option) => {
      if (selectedHandles.has(handle)) options.add(option)
    })
    return options
  }, [optionToHandle, selectedHandles])

  const activeActorHandles = useMemo(
    () => (scope === 'following' && selectedHandles.size > 0 ? Array.from(selectedHandles) : undefined),
    [scope, selectedHandles]
  )

  useEffect(() => {
    if (!isAuthReady) return

    // Switching scope keeps whatever's already rendered on screen instead of blanking it -
    // only a request for a scope that has never loaded shows the skeleton state.
    let cancelled = false
    setIsFetching(true)
    feedApi
      .getFeed(PAGE_SIZE, scope, undefined, activeActorHandles)
      .then((response) => {
        if (cancelled) return
        setEvents(response.data)
        setHasMore(response.data.length === PAGE_SIZE)
      })
      .catch(() => {
        if (cancelled) return
        setEvents([])
        setHasMore(false)
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
  }, [isAuthReady, scope, activeActorHandles])

  // Pages with the occurredAt of the oldest event already on screen, rather than an offset -
  // events are merged from several sources and re-sorted on every call, so an offset could
  // double up or skip rows the moment two sources interleave differently between requests.
  const loadMore = useCallback(() => {
    if (events.length === 0) return
    const cursor = events[events.length - 1].occurredAt

    setIsLoadingMore(true)
    feedApi
      .getFeed(PAGE_SIZE, scope, cursor, activeActorHandles)
      .then((response) => {
        setEvents((current) => [...current, ...response.data])
        setHasMore(response.data.length === PAGE_SIZE)
      })
      .catch(() => setHasMore(false))
      .finally(() => setIsLoadingMore(false))
  }, [events, scope, activeActorHandles])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h2 font-bold">{t('feed.title')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {isFetching && hasLoadedOnce && (
            <Loader2 className="size-4 shrink-0 animate-spin text-text-secondary" />
          )}
          {scope === 'following' && followingOptions.length > 0 && (
            <MultiSelectFilter
              label={t('feed.filter.people')}
              options={followingOptions}
              selected={selectedOptions}
              onChange={(next) => {
                const handles = new Set<string>()
                next.forEach((option) => {
                  const handle = optionToHandle.get(option)
                  if (handle) handles.add(handle)
                })
                setSelectedHandles(handles)
              }}
              searchPlaceholder={t('feed.filter.searchPeople')}
              emptyMessage={t('feed.filter.noMatches')}
            />
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

      {!isFetching && hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
            {t('feed.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default Feed
