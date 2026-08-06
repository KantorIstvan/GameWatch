import { useCallback, useSyncExternalStore } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getCurrentUserId } from '../lib/currentUserId'

/** One person the viewer has opened from people search. */
export interface RecentPersonSearch {
  /** The only address a profile has - unhandled accounts never reach this list. */
  handle: string
  displayName: string | null
  profilePictureUrl: string | null
  /** Epoch millis, so the list can be kept newest-first without parsing dates. */
  searchedAt: number
}

/**
 * Base of the storage key - never read or written to directly. Each account gets its own
 * key built from this (see `storageKeyFor`), so one browser used by two different accounts
 * never shows either of them the other's history.
 */
const STORAGE_KEY_BASE = 'gamewatch.people.recentSearches'

/**
 * The flat, unscoped key this list used before per-account scoping existed. Left on disk in
 * anyone's browser who used the feature pre-fix - see `loadForUser` for the one-time,
 * one-way migration out of it.
 */
const LEGACY_STORAGE_KEY = STORAGE_KEY_BASE

/**
 * How many people are remembered.
 *
 * Enough to cover an evening of looking people up, and few enough that the row stays a
 * shortcut rather than a second directory the viewer has to scan. Anything older is not
 * something anyone scrolls back to - they search for it again.
 */
const MAX_ENTRIES = 12

/** Stable empty reference for the signed-out snapshot, so useSyncExternalStore never sees
 *  a "changed" value it has to loop on just because a new array literal was returned. */
const EMPTY: RecentPersonSearch[] = []

/**
 * People the viewer searched for and opened, kept on the device rather than on the server.
 *
 * This is search history, not social data: it says who someone went looking for, which is a
 * different kind of fact from the ones this app stores about who they follow. Keeping it
 * local means it never leaves the machine, disappears with the browser data, and costs no
 * round trip to read - and the price, that it does not follow you to another device, is the
 * right trade for a shortcut list.
 *
 * Scoped per signed-in account (see `storageKeyFor`): a shared or reused browser must never
 * hand one account's search history to the next person who logs in.
 *
 * Held in a module-level cache with subscribers rather than in component state, so the
 * people page agrees with itself across renders without passing anything between them, and
 * so a second tab stays in step. The cache is keyed by which account it currently reflects,
 * not just populated once, so switching accounts within the same tab session invalidates it
 * instead of quietly serving the previous account's entries.
 */
let cache: RecentPersonSearch[] | null = null
let cachedKey: string | null = null

function isEntry(value: unknown): value is RecentPersonSearch {
  const entry = value as RecentPersonSearch
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.handle === 'string' &&
    typeof entry.searchedAt === 'number'
  )
}

function parseEntries(raw: string): RecentPersonSearch[] {
  try {
    const parsed = JSON.parse(raw)
    // Anything hand-edited, half-written or left by an older shape is dropped rather than
    // rendered - a corrupt entry here should cost the shortcut list, not the whole page.
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
 * person, one account, on their own browser - by silently wiping the list they used
 * yesterday. The risk this trades away is that a genuinely shared/reused browser could hand
 * its leftover unscoped history to whichever account happens to load the app first after
 * this fix ships; that is bounded to a single, one-time adoption, since the legacy key is
 * deleted the moment it is read, so no second account can ever collide with it afterward.
 */
function loadForUser(key: string): RecentPersonSearch[] {
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

function read(userId: string | null): RecentPersonSearch[] {
  if (!userId) {
    // Signed out: nothing to scope this to, and there is no session to show a list for.
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

function write(userId: string | null, next: RecentPersonSearch[]) {
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
    // A full or unavailable store (private browsing, quota) costs the persistence, not the
    // session: the in-memory cache still drives this tab until it is closed.
  }
  listeners.forEach((listener) => listener())
}

const listeners = new Set<() => void>()

function subscribe(userId: string | null, listener: () => void): () => void {
  listeners.add(listener)

  const key = userId ? storageKeyFor(userId) : null

  // Fires only for writes from other tabs, which is exactly the case the cache cannot see.
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
 * Records a search result being opened, newest first.
 *
 * Re-opening the same person moves them to the front instead of adding a duplicate: the
 * list answers "who was I just looking for", and the same person twice answers it worse.
 *
 * Called from places that are not themselves hooks (e.g. a selection handler that has no
 * reason to also call `useRecentPeopleSearches`), so the acting account comes from the
 * shared `currentUserId` mirror rather than from `useAuth0()` directly.
 */
export function rememberPersonSearch(person: Omit<RecentPersonSearch, 'searchedAt'>) {
  const userId = getCurrentUserId()
  const rest = read(userId).filter((entry) => entry.handle !== person.handle)
  write(userId, [{ ...person, searchedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES))
}

interface RecentPeopleSearches {
  people: RecentPersonSearch[]
  forget: (handle: string) => void
  clear: () => void
}

export function useRecentPeopleSearches(): RecentPeopleSearches {
  const { user } = useAuth0()
  const userId = user?.sub ?? null

  const subscribeForUser = useCallback(
    (listener: () => void) => subscribe(userId, listener),
    [userId]
  )
  const getSnapshot = useCallback(() => read(userId), [userId])
  const people = useSyncExternalStore(subscribeForUser, getSnapshot)

  const forget = useCallback(
    (handle: string) => {
      write(userId, read(userId).filter((entry) => entry.handle !== handle))
    },
    [userId]
  )

  const clear = useCallback(() => write(userId, []), [userId])

  return { people, forget, clear }
}
