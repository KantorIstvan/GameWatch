import { useCallback, useSyncExternalStore } from 'react'

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

const STORAGE_KEY = 'gamewatch.catalog.recentGames'

/**
 * How many games are remembered.
 *
 * Enough to cover an evening of looking things up, and few enough that the row stays a
 * shortcut rather than a second library the viewer has to scan. Anything older is not
 * something anyone scrolls back to - they search for it again.
 */
const MAX_ENTRIES = 12

/**
 * Games the viewer looked up, kept on the device rather than on the server.
 *
 * This is browsing history, not library data: it says what someone was curious about,
 * including games they decided against, and that is a different kind of fact from the ones
 * this app stores about you. Keeping it local means it never leaves the machine, disappears
 * with the browser data, and costs no round trip to read - and the price, that it does not
 * follow you to another device, is the right trade for a shortcut list.
 *
 * Held in a module-level cache with subscribers rather than in component state, so the
 * catalog page and the game page it navigates to agree without passing anything between
 * them, and so a second tab stays in step.
 */
let cache: RecentCatalogGame[] | null = null
const listeners = new Set<() => void>()

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

function read(): RecentCatalogGame[] {
  if (cache) {
    return cache
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    // Anything hand-edited, half-written or left by an older shape is dropped rather than
    // rendered - a corrupt entry here should cost the shortcut list, not the whole page.
    cache = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : []
  } catch {
    cache = []
  }
  return cache
}

function write(next: RecentCatalogGame[]) {
  cache = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A full or unavailable store (private browsing, quota) costs the persistence, not the
    // session: the in-memory cache still drives this tab until it is closed.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  // Fires only for writes from other tabs, which is exactly the case the cache cannot see.
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
 * Records a visit, newest first.
 *
 * Re-opening a game moves it to the front instead of adding a duplicate: the list answers
 * "what was I just looking at", and the same game twice answers it worse.
 */
export function rememberCatalogGame(game: Omit<RecentCatalogGame, 'viewedAt'>) {
  const rest = read().filter((entry) => entry.externalId !== game.externalId)
  write([{ ...game, viewedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES))
}

interface RecentCatalogGames {
  games: RecentCatalogGame[]
  forget: (externalId: number) => void
  clear: () => void
}

export function useRecentCatalogGames(): RecentCatalogGames {
  const games = useSyncExternalStore(subscribe, read)

  const forget = useCallback((externalId: number) => {
    write(read().filter((entry) => entry.externalId !== externalId))
  }, [])

  const clear = useCallback(() => write([]), [])

  return { games, forget, clear }
}
