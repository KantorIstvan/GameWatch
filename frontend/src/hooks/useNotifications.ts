import { useCallback, useEffect, useMemo, useState } from 'react'
import { notificationsApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import { useLocalNotifications } from './useLocalNotifications'
import type { LocalNotification } from './useLocalNotifications'
import type { NotificationFeed, ServerNotification } from '../types'

/**
 * How often the bell asks for anything new.
 *
 * A minute is short enough that a reply feels like it arrived promptly and long enough that
 * a tab left open all day is not a stream of requests. Real-time delivery would mean a
 * socket, and nothing here is worth a permanent connection.
 */
const POLL_INTERVAL_MS = 60_000

export type NotificationItem =
  | ({ source: 'server' } & ServerNotification)
  | ({ source: 'local' } & LocalNotification)

interface Notifications {
  /** Both kinds in one list, newest first. */
  items: NotificationItem[]
  unreadCount: number
  loading: boolean
  markAllRead: () => void
  clear: () => void
  refresh: () => void
}

const EMPTY_FEED: NotificationFeed = { notifications: [], unreadCount: 0 }

/**
 * Everything worth telling the viewer about, from wherever it came.
 *
 * Two sources, one list. Follows and replies happen on the server while nobody is looking,
 * so they are fetched; break and goal reminders are raised by this browser on a schedule
 * this browser is holding, so no server ever hears about them and there would be nothing to
 * fetch. Merging them here rather than showing two lists is the point - "did anything
 * happen" is one question, and answering it in two places means it gets asked twice.
 */
export function useNotifications(): Notifications {
  const { isAuthReady } = useAuthContext()
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_FEED)
  const [loading, setLoading] = useState(true)
  const local = useLocalNotifications()

  const load = useCallback(() => {
    if (!isAuthReady) return
    notificationsApi
      .getNotifications()
      .then((response) => setFeed(response.data ?? EMPTY_FEED))
      // A bell that cannot reach the server is empty, not broken: there is nothing useful to
      // say in a dropdown about a failed background poll.
      .catch(() => setFeed(EMPTY_FEED))
      .finally(() => setLoading(false))
  }, [isAuthReady])

  useEffect(() => {
    if (!isAuthReady) return

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)

    // Coming back to a backgrounded tab is exactly when the list is most likely to be stale
    // and most likely to be looked at.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthReady, load])

  const items = useMemo<NotificationItem[]>(() => {
    const merged: NotificationItem[] = [
      ...feed.notifications.map((n) => ({ source: 'server' as const, ...n })),
      ...local.notifications.map((n) => ({ source: 'local' as const, ...n })),
    ]
    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [feed.notifications, local.notifications])

  const markAllRead = useCallback(() => {
    local.markAllRead()
    if (feed.unreadCount === 0) return

    // Marked locally first so the badge clears on the click rather than on the round trip,
    // then reconciled with whatever the server says once it answers.
    setFeed((current) => ({
      notifications: current.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
    notificationsApi
      .markAllRead()
      .then((response) => setFeed(response.data ?? EMPTY_FEED))
      .catch(() => load())
  }, [feed.unreadCount, local, load])

  const clear = useCallback(() => {
    local.clear()
    setFeed(EMPTY_FEED)
    notificationsApi
      .clear()
      .then((response) => setFeed(response.data ?? EMPTY_FEED))
      .catch(() => load())
  }, [local, load])

  return {
    items,
    unreadCount: feed.unreadCount + local.unreadCount,
    loading,
    markAllRead,
    clear,
    refresh: load,
  }
}
