interface CacheEntry<T> {
  data: T
  timestamp: number
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 60 * 1000 

  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    const now = Date.now()
    const isExpired = (now - entry.timestamp) > ttl
    
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }


  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > this.defaultTTL) {
        this.cache.delete(key)
      }
    }
  }
}

export const apiCache = new ApiCache()

setInterval(() => {
  apiCache.cleanup()
}, 5 * 60 * 1000)

export const createCacheKey = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  return `${endpoint}?${sortedParams}`
}
