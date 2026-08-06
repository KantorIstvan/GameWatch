import { useCallback, useSyncExternalStore } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getCurrentUserId } from '../lib/currentUserId'

/** One game the viewer has opened from the catalog. */
export interface RecentCatalogGame {
  /** IGDB id - the catalog's address for a game, since most have no row here. */
  externalId: number
  name: string
  bannerImageUrl?: string
  releaseDate?: string
  /** Epoch millis, so the list can be kept newest-first without parsing dates. */
  viewedAt: number
}

/**
 * Base of the storage key - never read or written to directly. Each account gets its own
 * key built from this (see `storageKeyFor`), so one browser used by two different accounts
 * never shows either of them the other's history.
 */
const STORAGE_KEY_BASE = 'gamewatch.catalog.recentGames'

/**
 * The flat, unscoped key this list used before per-account scoping existed. Left on disk in
 * anyone's browser who used the feature pre-fix - see `loadForUser` for the one-time,
 * one-way migration out of it.
 */
const LEGACY_STORAGE_KEY = STORAGE_KEY_BASE

/**
 * How many games are remembered.
 *
 * Enough to cover an evening of looking things up, and few enough that the row stays a
 * shortcut rather than a second library the viewer has to scan. Anything older is not
 * something anyone scrolls back to - they search for it again.
 */
const MAX_ENTRIES = 12

/** Stable empty reference for the signed-out snapshot, so useSyncExternalStore never sees
 *  a "changed" value it has to loop on just because a new array literal was returned. */
const EMPTY: RecentCatalogGame[] = []

/**
 * Games the viewer looked up, kept on the device rather than on the server.
 *
 * This is browsing history, not library data: it says what someone was curious about,
 * including games they decided against, and that is a different kind of fact from the ones
 * this app stores about you. Keeping it local means it never leaves the machine, disappears
 * with the browser data, and costs no round trip to read - and the price, that it does not
 * follow you to another device, is the right trade for a shortcut list.
 *
 * Scoped per signed-in account (see `storageKeyFor`): a shared or reused browser must never
 * hand one account's search/browse history to the next person who logs in.
 *
 * Held in a module-level cache with subscribers rather than in component state, so the
 * catalog page and the game page it navigates to agree without passing anything between
 * them, and so a second tab stays in step. The cache is keyed by which account it currently
 * reflects, not just populated once, so switching accounts within the same tab session
 * invalidates it instead of quietly serving the previous account's entries.
 */
let cache: RecentCatalogGame[] | null = null
let cachedKey: string | null = null

function isEntry(value: unknown): value is RecentCatalogGame {
  const entry = value as RecentCatalogGame
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.externalId === 'number' &&
    typeof entry.name === 'string' &&
    typeof entry.viewedAt === 'number'
  )
}

function parseEntries(raw: string): RecentCatalogGame[] {
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
function loadForUser(key: string): RecentCatalogGame[] {
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

function read(userId: string | null): RecentCatalogGame[] {
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

function write(userId: string | null, next: RecentCatalogGame[]) {
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
 * Records a visit, newest first.
 *
 * Re-opening a game moves it to the front instead of adding a duplicate: the list answers
 * "what was I just looking at", and the same game twice answers it worse.
 *
 * Called from places that are not themselves hooks (e.g. an effect that has no reason to
 * also call `useRecentCatalogGames`), so the acting account comes from the shared
 * `currentUserId` mirror rather than from `useAuth0()` directly.
 */
export function rememberCatalogGame(game: Omit<RecentCatalogGame, 'viewedAt'>) {
  const userId = getCurrentUserId()
  const rest = read(userId).filter((entry) => entry.externalId !== game.externalId)
  write(userId, [{ ...game, viewedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES))
}

interface RecentCatalogGames {
  games: RecentCatalogGame[]
  forget: (externalId: number) => void
  clear: () => void
}

export function useRecentCatalogGames(): RecentCatalogGames {
  const { user } = useAuth0()
  const userId = user?.sub ?? null

  const subscribeForUser = useCallback(
    (listener: () => void) => subscribe(userId, listener),
    [userId]
  )
  const getSnapshot = useCallback(() => read(userId), [userId])
  const games = useSyncExternalStore(subscribeForUser, getSnapshot)

  const forget = useCallback(
    (externalId: number) => {
      write(userId, read(userId).filter((entry) => entry.externalId !== externalId))
    },
    [userId]
  )

  const clear = useCallback(() => write(userId, []), [userId])

  return { games, forget, clear }
}
