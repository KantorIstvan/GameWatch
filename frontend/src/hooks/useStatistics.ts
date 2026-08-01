import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { statisticsApi } from '../services/api'
import { UserStatistics, GameRecommendation } from '../types'
import { apiCache, createCacheKey } from '../utils/apiCache'
import { toLocalDateString } from '../utils/dateUtils'

export function useStatistics(
  interval: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date,
  isAuthReady: boolean
) {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [recommendations, setRecommendations] = useState<GameRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topGamesHash, setTopGamesHash] = useState<string>('')
  // Guards against a slower, stale request (e.g. from a period the user has since
  // navigated away from) resolving after a faster, newer one and clobbering it.
  const abortControllerRef = useRef<AbortController | null>(null)

  const createTopGamesHash = useCallback((stats: UserStatistics | null): string => {
    if (!stats || !stats.topMostPlayedGames || stats.topMostPlayedGames.length === 0) {
      return ''
    }
    return stats.topMostPlayedGames
      .slice(0, 5)
      .map(game => game.gameId)
      .join('-')
  }, [])

  const fetchStatistics = useCallback(async () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setLoading(true)
      setError(null)
      const response = await statisticsApi.getUserStatistics(interval, toLocalDateString(referenceDate), controller.signal)
      setStatistics(response.data)
    } catch (err: any) {
      if (axios.isCancel(err)) return
      setError(err.response?.data?.message || 'Failed to load statistics')
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false)
      }
    }
  }, [interval, referenceDate])

  const fetchRecommendations = useCallback(async (gamesHash: string) => {
    try {
      const cacheKey = createCacheKey('recommendations', { gamesHash })
      const cachedData = apiCache.get<GameRecommendation[]>(cacheKey, 30 * 60 * 1000)
      
      if (cachedData) {
        setRecommendations(cachedData)
        return
      }

      const response = await statisticsApi.getGameRecommendations(5)
      apiCache.set(cacheKey, response.data)
      setRecommendations(response.data)
    } catch (err: any) {
      // Silently fail for recommendations
    }
  }, [])

  useEffect(() => {
    if (isAuthReady) {
      fetchStatistics()
    }
  }, [interval, isAuthReady, fetchStatistics])

  useEffect(() => {
    if (statistics && statistics.topMostPlayedGames && statistics.topMostPlayedGames.length > 0) {
      const newHash = createTopGamesHash(statistics)
      if (newHash && newHash !== topGamesHash) {
        setTopGamesHash(newHash)
        fetchRecommendations(newHash)
      }
    }
  }, [statistics, topGamesHash, createTopGamesHash, fetchRecommendations])

  return {
    statistics,
    recommendations,
    loading,
    error,
    refetch: fetchStatistics
  }
}
