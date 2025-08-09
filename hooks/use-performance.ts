import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  apiCalls: number
  cacheHits: number
}

// Performance monitoring hook
export function usePerformance(componentName: string) {
  const startTime = useRef(Date.now())
  const metrics = useRef<Partial<PerformanceMetrics>>({})

  useEffect(() => {
    // Component mounted
    const mountTime = Date.now()
    metrics.current.loadTime = mountTime - startTime.current

    return () => {
      // Component unmounted
      const unmountTime = Date.now()
      const totalTime = unmountTime - startTime.current
      }
  }, [componentName])

  const trackApiCall = (url: string, duration: number, fromCache: boolean) => {
    metrics.current.apiCalls = (metrics.current.apiCalls || 0) + 1
    if (fromCache) {
      metrics.current.cacheHits = (metrics.current.cacheHits || 0) + 1
    }

  }

  const getMetrics = () => ({ ...metrics.current })

  return { trackApiCall, getMetrics }
}

// Simple performance timer
export function useTimer(label: string) {
  const start = useRef(Date.now())

  const stop = () => {
    const duration = Date.now() - start.current
    return duration
  }

  const restart = () => {
    start.current = Date.now()
  }

  return { stop, restart }
}