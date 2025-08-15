import { useEffect, useRef, useCallback } from 'react'

interface PollingOptions {
  enabled: boolean
  interval: number
  maxInterval?: number
  backoffMultiplier?: number
  onError?: (error: Error) => void
}

export function useOptimizedPolling(
  pollFunction: () => Promise<any>,
  options: PollingOptions
) {
  const {
    enabled,
    interval,
    maxInterval = 30000,
    backoffMultiplier = 1.5,
    onError
  } = options

  const timeoutRef = useRef<NodeJS.Timeout>()
  const currentIntervalRef = useRef(interval)
  const consecutiveErrorsRef = useRef(0)

  const poll = useCallback(async () => {
    if (!enabled) return

    try {
      await pollFunction()
      // Reset interval and error count on success
      currentIntervalRef.current = interval
      consecutiveErrorsRef.current = 0
    } catch (error) {
      console.error('Polling error:', error)
      consecutiveErrorsRef.current++
      
      // Exponential backoff on errors
      currentIntervalRef.current = Math.min(
        currentIntervalRef.current * backoffMultiplier,
        maxInterval
      )
      
      onError?.(error as Error)
    }

    // Schedule next poll
    if (enabled) {
      timeoutRef.current = setTimeout(poll, currentIntervalRef.current)
    }
  }, [enabled, pollFunction, interval, maxInterval, backoffMultiplier, onError])

  useEffect(() => {
    if (enabled) {
      // Start polling immediately, then at intervals
      poll()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [poll, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}