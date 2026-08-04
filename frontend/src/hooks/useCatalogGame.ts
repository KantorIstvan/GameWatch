import { useCallback, useEffect, useRef, useState } from 'react'
import { gamesApi } from '../services/api'
import type { CatalogGame } from '../types'

interface CatalogGameState {
  game: CatalogGame | null
  loading: boolean
  error: boolean
  /** Null until someone has rated or reviewed this game - see `ensureGameId`. */
  gameId: number | null
  ensureGameId: () => Promise<number>
}

/**
 * A game's catalog page, loaded by IGDB id.
 *
 * The catalog searches all of IGDB, so most games opened from it have no row in this app
 * and therefore no numeric id to hang ratings and reviews off. Rather than creating a row
 * for every game anyone glances at, the page loads read-only and the row is claimed on the
 * first write - which is what `ensureGameId` does. Panels that only read take `gameId` and
 * render their empty state while it is null; panels that write await `ensureGameId` first.
 *
 * The in-flight promise is shared so two panels writing at once cannot both try to create
 * the row.
 */
export function useCatalogGame(externalId: number): CatalogGameState {
  const [game, setGame] = useState<CatalogGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const resolving = useRef<Promise<number> | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    resolving.current = null

    gamesApi
      .getCatalogByExternalId(externalId)
      .then((response) => {
        if (active) setGame(response.data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [externalId])

  const ensureGameId = useCallback(async () => {
    if (game?.id) {
      return game.id
    }
    if (!resolving.current) {
      resolving.current = gamesApi
        .resolveCatalogGame(externalId)
        .then((response) => {
          setGame(response.data)
          return response.data.id as number
        })
        .catch((err) => {
          // Cleared so a failed write can be retried rather than replaying the rejection.
          resolving.current = null
          throw err
        })
    }
    return resolving.current
  }, [game?.id, externalId])

  return { game, loading, error, gameId: game?.id ?? null, ensureGameId }
}
