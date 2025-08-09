// Simple in-memory cache for auth data
interface CacheEntry {
  data: any
  timestamp: number
  expires: number
}

class AuthCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 30 * 1000 // 30 seconds cache

  set(key: string, data: any, ttl?: number): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + (ttl || this.TTL)
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }
}

export const authCache = new AuthCache()

// Cleanup expired entries every 60 seconds
if (typeof window === 'undefined') {
  setInterval(() => authCache.cleanup(), 60 * 1000)
}