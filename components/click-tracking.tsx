"use client"

import { useEffect, useRef } from 'react'

interface ClickTrackingProps {
  // Optional props to override URL parsing
  customerId?: string
  page?: string
}

export function ClickTracking({ customerId, page }: ClickTrackingProps = {}) {
  const hasTracked = useRef(false)
  const sessionId = useRef<string>()

  useEffect(() => {
    // Generate or get session ID
    if (!sessionId.current) {
      sessionId.current = getOrCreateSessionId()
    }

    // Only track once per page load
    if (hasTracked.current) return

    const trackClick = async () => {
      try {
        // Get customer ID from URL parameters or props (optional now)
        const cid = customerId || getCustomerIdFromUrl()

        // Get current page info
        const currentPage = page || window.location.pathname + window.location.search
        const userAgent = navigator.userAgent
        const referrer = document.referrer || ''

        // Track the click (customer_id is now optional)
        const response = await fetch('/api/track-click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: cid || null, // Allow null customer_id for anonymous visits
            page: currentPage,
            user_agent: userAgent,
            referrer: referrer,
            session_id: sessionId.current
          })
        })

        if (response.ok) {
          const result = await response.json()
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    // Track immediately when component mounts
    trackClick()
    hasTracked.current = true
  }, [customerId, page])

  return null // This component renders nothing
}

// Helper function to extract customer ID from URL
function getCustomerIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  const urlParams = new URLSearchParams(window.location.search)

  // Try different parameter names
  return urlParams.get('cid') ||
         urlParams.get('customer_id') ||
         urlParams.get('c') ||
         null
}

// Helper function to create or get session ID
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId()

  const storageKey = 'click_tracking_session'
  let sessionId = sessionStorage.getItem(storageKey)

  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(storageKey, sessionId)
  }

  return sessionId
}

// Generate a unique session ID
function generateSessionId(): string {
  // Use a more deterministic approach that works in SSR
  if (typeof window !== 'undefined') {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
  // Fallback for SSR - will be replaced on client
  return Date.now().toString(36) + 'ssr'
}

// Hook for programmatic click tracking
export function useClickTracking() {
  const track = async (customerId: string | null, page?: string, additionalData?: any) => {
    try {
      const currentPage = page || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const referrer = typeof document !== 'undefined' ? document.referrer || '' : ''
      const sessionId = getOrCreateSessionId()

      const response = await fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId || null,
          page: currentPage,
          user_agent: userAgent,
          referrer: referrer,
          session_id: sessionId,
          ...additionalData
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.data
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Track API Error:', response.status, errorData)
        console.error('Request payload:', {
          customer_id: customerId || null,
          page: currentPage,
          user_agent: userAgent,
          referrer: referrer,
          session_id: sessionId,
          ...additionalData
        })
        throw new Error('HTTP ' + response.status + ': ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  // Track star rating selection - non-blocking
  const trackStarSelection = async (customerId: string | null, starRating: number, page?: string, additionalData?: any) => {
    try {
      return await track(customerId, page, {
        event_type: 'star_selection',
        star_rating: starRating,
        ...additionalData
      })
    } catch (error) {
      // Make tracking non-blocking - log error but don't throw
      console.error('Error:', error)
      return null
    }
  }

  // Track platform redirect - non-blocking
  const trackPlatformRedirect = async (customerId: string | null, platform: string, redirectUrl: string, page?: string) => {
    try {
      return await track(customerId, page, {
        event_type: 'platform_redirect',
        redirect_platform: platform,
        redirect_url: redirectUrl
      })
    } catch (error) {
      // Make tracking non-blocking - log error but don't throw
      console.error('Error:', error)
      return null
    }
  }

  // Track review completion - non-blocking
  const trackReviewCompletion = async (customerId: string | null, completed: boolean, starRating?: number, page?: string) => {
    try {
      return await track(customerId, page, {
        event_type: 'review_submission',
        review_completed: completed,
        star_rating: starRating
      })
    } catch (error) {
      // Make tracking non-blocking - log error but don't throw
      console.error('Error:', error)
      return null
    }
  }

  const getClickHistory = async (customerId: string, limit?: number) => {
    try {
      const params = new URLSearchParams({ customer_id: customerId })
      if (limit) params.set('limit', limit.toString())

      const response = await fetch('/api/track-click?' + params.toString())

      if (response.ok) {
        const result = await response.json()
        return result.data
      } else {
        throw new Error('HTTP ' + response.status)
      }
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  return {
    track,
    trackStarSelection,
    trackPlatformRedirect,
    trackReviewCompletion,
    getClickHistory
  }
}