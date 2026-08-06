import { useCallback, useSyncExternalStore } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getCurrentUserId } from '../lib/currentUserId'

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

/**
 * Base of the storage key - never read or written to directly. Each account gets its own
 * key built from this (see `storageKeyFor`), so one browser used by two different accounts
 * never shows either of them the other's reminders.
 */
const STORAGE_KEY_BASE = 'gamewatch.notifications.local'

/**
 * The flat, unscoped key this list used before per-account scoping existed. Left on disk in
 * anyone's browser who used the feature pre-fix - see `loadForUser` for the one-time,
 * one-way migration out of it.
 */
const LEGACY_STORAGE_KEY = STORAGE_KEY_BASE

/**
 * How many reminders are kept.
 *
 * A long session fires one every twenty minutes or so; fifty covers several days of that,
 * and nobody scrolls a reminder list looking for last Tuesday's drink of water.
 */
const MAX_ENTRIES = 50

/** Stable empty reference for the signed-out snapshot, so useSyncExternalStore never sees
 *  a "changed" value it has to loop on just because a new array literal was returned. */
const EMPTY: LocalNotification[] = []

/**
 * Timer and health reminders, kept on the device.
 *
 * These are raised by the browser on a schedule the browser is holding - no server ever
 * learns that a break reminder fired, so there is nothing to fetch and nothing that could
 * arrive while the tab was closed. Persisting them locally is what lets the bell show the
 * reminder you dismissed a toast for ten minutes ago, which is the whole reason people go
 * looking for a notification list in the first place.
 *
 * Scoped per signed-in account (see `storageKeyFor`): these reminders are tied to that
 * account's session activity (goals reached, break/hydration timing), so a shared or reused
 * browser must never hand one account's reminders to the next person who logs in.
 *
 * Held in a module-level cache with subscribers so that whatever fires a reminder and the
 * header that displays it need no connection to each other beyond this file. The cache is
 * keyed by which account it currently reflects, not just populated once, so switching
 * accounts within the same tab session invalidates it instead of quietly serving the
 * previous account's entries.
 */
let cache: LocalNotification[] | null = null
let cachedKey: string | null = null

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

function parseEntries(raw: string): LocalNotification[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}

function storageKeyFor(userId: string): string {
  return `${STORAGE_KEY_BASE}.${userId}`
}

/**
 * Loads this account's list, migrating the old unscoped list into it exactly once if
 * nothing has been saved under the account's own key yet.
 *
 * Migrating (rather than abandoning the old key) avoids surprising the common case - one
 * person, one account, on their own browser - by silently wiping the reminders they had
 * open yesterday. The risk this trades away is that a genuinely shared/reused browser could
 * hand its leftover unscoped reminders to whichever account happens to load the app first
 * after this fix ships; that is bounded to a single, one-time adoption, since the legacy key
 * is deleted the moment it is read, so no second account can ever collide with it afterward.
 */
function loadForUser(key: string): LocalNotification[] {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored) {
      return parseEntries(stored)
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === null) {
      return []
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    const migrated = parseEntries(legacy)
    if (migrated.length > 0) {
      window.localStorage.setItem(key, JSON.stringify(migrated))
    }
    return migrated
  } catch {
    return []
  }
}

function read(userId: string | null): LocalNotification[] {
  if (!userId) {
    // Signed out: nothing to scope this to, and there is no session raising reminders.
    return EMPTY
  }
  const key = storageKeyFor(userId)
  if (cache && cachedKey === key) {
    return cache
  }
  cache = loadForUser(key)
  cachedKey = key
  return cache
}

function write(userId: string | null, next: LocalNotification[]) {
  if (!userId) {
    // Signed out: persisting under any shared key is exactly the bug this scoping fixes,
    // so there is nothing to do here until someone is actually signed in.
    return
  }
  const key = storageKeyFor(userId)
  cache = next
  cachedKey = key
  try {
    window.localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // A full or unavailable store costs the persistence, not the session: the cache still
    // drives this tab until it closes.
  }
  listeners.forEach((listener) => listener())
}

const listeners = new Set<() => void>()

function subscribe(userId: string | null, listener: () => void): () => void {
  listeners.add(listener)

  const key = userId ? storageKeyFor(userId) : null

  const onStorage = (event: StorageEvent) => {
    if (key !== null && (event.key === key || event.key === null)) {
      cache = null
      cachedKey = null
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
 *
 * Called from a plain singleton service, not a hook, so the acting account comes from the
 * shared `currentUserId` mirror rather than from `useAuth0()` directly.
 */
export function recordLocalNotification(entry: {
  messageKey: string
  values?: Record<string, string | number>
  tone: LocalNotificationTone
}) {
  const userId = getCurrentUserId()
  const notification: LocalNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  write(userId, [notification, ...read(userId)].slice(0, MAX_ENTRIES))
}

interface LocalNotifications {
  notifications: LocalNotification[]
  unreadCount: number
  markAllRead: () => void
  clear: () => void
}

export function useLocalNotifications(): LocalNotifications {
  const { user } = useAuth0()
  const userId = user?.sub ?? null

  const subscribeForUser = useCallback(
    (listener: () => void) => subscribe(userId, listener),
    [userId]
  )
  const getSnapshot = useCallback(() => read(userId), [userId])
  const notifications = useSyncExternalStore(subscribeForUser, getSnapshot)

  const markAllRead = useCallback(() => {
    const current = read(userId)
    if (current.every((entry) => entry.read)) {
      // Nothing to change, and rewriting would wake every subscriber for no reason.
      return
    }
    write(userId, current.map((entry) => ({ ...entry, read: true })))
  }, [userId])

  const clear = useCallback(() => write(userId, []), [userId])

  return {
    notifications,
    unreadCount: notifications.filter((entry) => !entry.read).length,
    markAllRead,
    clear,
  }
}
