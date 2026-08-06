import { useCallback, useSyncExternalStore } from 'react'

/**
 * What the entry looks like in the bell - not what raised it.
 *
 * Three tones rather than one per reminder type, because the list only needs to say how
 * much attention something wants: a nudge to stand up, a goal you have reached, or a limit
 * you have gone past.
 */
export type LocalNotificationTone = 'reminder' | 'goal' | 'warning'

export interface LocalNotification {
  id: string
  /**
   * The full i18n key rather than a rendered sentence.
   *
   * An entry written this morning has to still read correctly after the language is changed
   * this afternoon, which a stored string cannot do.
   */
  messageKey: string
  values?: Record<string, string | number>
  tone: LocalNotificationTone
  read: boolean
  /** ISO 8601, to sort against the server's notifications without converting either. */
  createdAt: string
}

const STORAGE_KEY = 'gamewatch.notifications.local'

/**
 * How many reminders are kept.
 *
 * A long session fires one every twenty minutes or so; fifty covers several days of that,
 * and nobody scrolls a reminder list looking for last Tuesday's drink of water.
 */
const MAX_ENTRIES = 50

/**
 * Timer and health reminders, kept on the device.
 *
 * These are raised by the browser on a schedule the browser is holding - no server ever
 * learns that a break reminder fired, so there is nothing to fetch and nothing that could
 * arrive while the tab was closed. Persisting them locally is what lets the bell show the
 * reminder you dismissed a toast for ten minutes ago, which is the whole reason people go
 * looking for a notification list in the first place.
 *
 * Held in a module-level cache with subscribers so that whatever fires a reminder and the
 * header that displays it need no connection to each other beyond this file.
 */
let cache: LocalNotification[] | null = null
const listeners = new Set<() => void>()

function isEntry(value: unknown): value is LocalNotification {
  const entry = value as LocalNotification
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.id === 'string' &&
    typeof entry.messageKey === 'string' &&
    typeof entry.createdAt === 'string'
  )
}

function read(): LocalNotification[] {
  if (cache) {
    return cache
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    cache = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: LocalNotification[]) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A full or unavailable store costs the persistence, not the session: the cache still
    // drives this tab until it closes.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cache = null
      listeners.forEach((each) => each())
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Files a reminder in the bell.
 *
 * Called alongside the toast rather than instead of it: the toast is the interruption, and
 * this is what remains after it fades. A reminder nobody was at the screen for is exactly
 * the one worth keeping.
 */
export function recordLocalNotification(entry: {
  messageKey: string
  values?: Record<string, string | number>
  tone: LocalNotificationTone
}) {
  const notification: LocalNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  write([notification, ...read()].slice(0, MAX_ENTRIES))
}

interface LocalNotifications {
  notifications: LocalNotification[]
  unreadCount: number
  markAllRead: () => void
  clear: () => void
}

export function useLocalNotifications(): LocalNotifications {
  const notifications = useSyncExternalStore(subscribe, read)

  const markAllRead = useCallback(() => {
    const current = read()
    if (current.every((entry) => entry.read)) {
      // Nothing to change, and rewriting would wake every subscriber for no reason.
      return
    }
    write(current.map((entry) => ({ ...entry, read: true })))
  }, [])

  const clear = useCallback(() => write([]), [])

  return {
    notifications,
    unreadCount: notifications.filter((entry) => !entry.read).length,
    markAllRead,
    clear,
  }
}
