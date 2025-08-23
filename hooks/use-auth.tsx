"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  company: string
  phone_number?: string
  profile_picture_url?: string
  bio?: string
  subscription_type: string
  subscription_status: string
  stripe_customer_id?: string
  trial_end_date?: string
  subscription_end_date?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Client-side cache for auth data
let authCache: { user: User | null; timestamp: number } | null = null
const CACHE_DURATION = 30 * 1000 // 30 seconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async (useCache = true) => {
    // Check cache first
    if (useCache && authCache && Date.now() - authCache.timestamp < CACHE_DURATION) {
      setUser(authCache.user)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('🔍 AuthProvider: Auth API returned non-JSON response:', contentType)
          throw new Error('Expected JSON response from auth endpoint')
        }
        
        const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          // Update cache
          authCache = { user: data.user, timestamp: Date.now() }
        } else {
          console.log('🔍 AuthProvider: Auth API returned unsuccessful response:', data)
          setUser(null)
          authCache = { user: null, timestamp: Date.now() }
        }
      } else if (response.status === 401) {
        // Unauthorized - user needs to login
        console.log('🔍 AuthProvider: User not authenticated (401)')
        setUser(null)
        authCache = { user: null, timestamp: Date.now() }
      } else {
        console.error('🔍 AuthProvider: Auth API error:', response.status, response.statusText)
        setUser(null)
        authCache = { user: null, timestamp: Date.now() }
      }
    } catch (error) {
      // Handle network errors, CORS issues, etc.
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🔍 AuthProvider: Network error - API might be unavailable. Check if dev server is running.', error)
        // Don't set loading to false immediately on network errors - keep trying
        setTimeout(() => fetchUser(false), 2000) // Retry after 2 seconds
        return
      } else {
        console.error('🔍 AuthProvider: Fetch error:', error)
      }
      setUser(null)
      authCache = { user: null, timestamp: Date.now() }
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    setLoading(true)
    await fetchUser(false) // Skip cache on manual refetch
  }

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setUser(null)
    }, 10000) // 10 second timeout

    fetchUser().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    refetch
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}