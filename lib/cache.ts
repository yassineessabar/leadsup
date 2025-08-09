interface CacheEntry {
  data: any
  timestamp: number
  expiry: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()

  set(key: string, data: any, ttlMs = 60000) { // Increased default to 1 minute
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    })
  }

  get(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  // Get stale data (even if expired) for stale-while-revalidate pattern
  getStale(key: string) {
    const entry = this.cache.get(key)
    return entry ? entry.data : null
  }

  isStale(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return true
    return Date.now() > entry.expiry
  }

  has(key: string) {
    return this.get(key) !== null
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        expired: Date.now() > entry.expiry
      }))
    }
  }
}

export const apiCache = new SimpleCache()

// Cache keys for consistency
export const CACHE_KEYS = {
  REVIEW_LINK: 'review-link',
  USER_INFO: 'user-info',
  SUBSCRIPTION: 'subscription',
  PLATFORM_LINKS: 'platform-links'
} as const

export async function cachedFetch(url: string, options: RequestInit = {}, ttlMs = 60000) {
  const cacheKey = `${url}-${JSON.stringify(options)}`

  // Check cache first
  const cached = apiCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Check for stale data (stale-while-revalidate pattern)
  const stale = apiCache.getStale(cacheKey)
  let revalidatePromise: Promise<any> | null = null

  if (stale && apiCache.isStale(cacheKey)) {
    // Start revalidation in background
    revalidatePromise = fetch(url, options)
      .then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON')
        }
        
        return response.json()
      })
      .then(data => {
        if (data) {
          apiCache.set(cacheKey, data, ttlMs)
        }
        return data
      })
      .catch(error => {
        return stale
      })

    // Return stale data immediately
    return stale
  }

  try {
    // Fetch fresh data
    const response = await fetch(url, options)

    if (!response.ok) {
      // Handle 404 specially for review-link endpoint (new users may not have a review link yet)
      if (response.status === 404 && url.includes('/api/review-link')) {
        const emptyResponse = { success: false, error: 'Review link not found', status: 404 }
        // Don't cache 404 responses
        return emptyResponse
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response, but got ${contentType}`)
    }

    const data = await response.json()
    apiCache.set(cacheKey, data, ttlMs)
    return data
  } catch (error) {
    // If fetch fails and we have stale data, return it
    if (stale) {
      return stale
    }
    throw error
  }
}

// Invalidate cache when data changes
export function invalidateCache(pattern?: string) {
  if (pattern) {
    // Clear specific cache entries
    const stats = apiCache.getStats()
    stats.entries.forEach(({ key }) => {
      if (key.includes(pattern)) {
        apiCache.delete(key)
      }
    })
  } else {
    apiCache.clear()
  }
}

// Preload critical data
export async function preloadCriticalData() {
  const preloadPromises = [
    // Preload user info
    cachedFetch('/api/auth/me', { credentials: 'include' }, 60000)
      .catch(error => null),

    // Preload review link data
    cachedFetch('/api/review-link', { headers: { 'Content-Type': 'application/json' } }, 60000)
      .catch(error => null)
  ]

  try {
    await Promise.allSettled(preloadPromises)
    } catch (error) {
    }
}

// Prefetch data for likely next navigation
export function prefetchRouteData(route: string) {
  switch (route) {
    case 'appearance':
      cachedFetch('/api/review-link', {}, 60000).catch(() => {})
      break
    case 'review-link':
      cachedFetch('/api/review-link', {}, 60000).catch(() => {})
      break
    case 'customers':
      // Prefetch customer data if we add that endpoint
      break
  }
}