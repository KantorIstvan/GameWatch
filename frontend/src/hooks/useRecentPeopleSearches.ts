import { useCallback, useSyncExternalStore } from 'react'

/** One person the viewer has opened from people search. */
export interface RecentPersonSearch {
  /** The only address a profile has - unhandled accounts never reach this list. */
  handle: string
  displayName: string | null
  profilePictureUrl: string | null
  /** Epoch millis, so the list can be kept newest-first without parsing dates. */
  searchedAt: number
}

const STORAGE_KEY = 'gamewatch.people.recentSearches'

/**
 * How many people are remembered.
 *
 * Enough to cover an evening of looking people up, and few enough that the row stays a
 * shortcut rather than a second directory the viewer has to scan. Anything older is not
 * something anyone scrolls back to - they search for it again.
 */
const MAX_ENTRIES = 12

/**
 * People the viewer searched for and opened, kept on the device rather than on the server.
 *
 * This is search history, not social data: it says who someone went looking for, which is a
 * different kind of fact from the ones this app stores about who they follow. Keeping it
 * local means it never leaves the machine, disappears with the browser data, and costs no
 * round trip to read - and the price, that it does not follow you to another device, is the
 * right trade for a shortcut list.
 *
 * Held in a module-level cache with subscribers rather than in component state, so the
 * people page agrees with itself across renders without passing anything between them, and
 * so a second tab stays in step.
 */
let cache: RecentPersonSearch[] | null = null
const listeners = new Set<() => void>()

function isEntry(value: unknown): value is RecentPersonSearch {
  const entry = value as RecentPersonSearch
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.handle === 'string' &&
    typeof entry.searchedAt === 'number'
  )
}

function read(): RecentPersonSearch[] {
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

function write(next: RecentPersonSearch[]) {
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
 * Records a search result being opened, newest first.
 *
 * Re-opening the same person moves them to the front instead of adding a duplicate: the
 * list answers "who was I just looking for", and the same person twice answers it worse.
 */
export function rememberPersonSearch(person: Omit<RecentPersonSearch, 'searchedAt'>) {
  const rest = read().filter((entry) => entry.handle !== person.handle)
  write([{ ...person, searchedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES))
}

interface RecentPeopleSearches {
  people: RecentPersonSearch[]
  forget: (handle: string) => void
  clear: () => void
}

export function useRecentPeopleSearches(): RecentPeopleSearches {
  const people = useSyncExternalStore(subscribe, read)

  const forget = useCallback((handle: string) => {
    write(read().filter((entry) => entry.handle !== handle))
  }, [])

  const clear = useCallback(() => write([]), [])

  return { people, forget, clear }
}
