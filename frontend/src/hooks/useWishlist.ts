import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { wishlistApi } from '../services/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { WishlistEntry } from '../types'

interface WishlistState {
  entries: WishlistEntry[]
  loading: boolean
  isWishlisted: (externalId: number) => boolean
  toggle: (externalId: number) => Promise<void>
}

/**
 * The signed-in viewer's own wishlist, loaded once and kept in sync locally.
 *
 * Loaded as a whole rather than checked per game: the catalog's search results and its game
 * pages all need to know "is this one on my wishlist", and a request per row would turn a
 * page of search results into one request per result for what is, in practice, a short list.
 */
export function useWishlist(): WishlistState {
  const { t } = useTranslation()
  const { isAuthReady } = useAuthContext()
  const [entries, setEntries] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthReady) return
    wishlistApi
      .getMine()
      .then((response) => setEntries(response.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [isAuthReady])

  const externalIds = useMemo(
    () => new Set(entries.map((entry) => entry.externalId)),
    [entries]
  )
  const isWishlisted = useCallback((externalId: number) => externalIds.has(externalId), [externalIds])

  const toggle = useCallback(
    async (externalId: number) => {
      try {
        if (externalIds.has(externalId)) {
          await wishlistApi.remove(externalId)
          setEntries((current) => current.filter((entry) => entry.externalId !== externalId))
        } else {
          const response = await wishlistApi.add(externalId)
          setEntries((current) => [response.data, ...current])
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || t('wishlist.failed'))
      }
    },
    [externalIds, t]
  )

  return { entries, loading, isWishlisted, toggle }
}
