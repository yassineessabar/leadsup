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
        cache: 'no-cache' // Changed from force-cache to no-cache to avoid issues
      })

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Expected JSON response from auth endpoint')
        }
        
        const data = await response.json()
        if (data.success && data.user) {
          setUser(data.user)
          // Update cache
          authCache = { user: data.user, timestamp: Date.now() }
        } else {
          setUser(null)
          authCache = { user: null, timestamp: Date.now() }
        }
      } else {
        setUser(null)
        authCache = { user: null, timestamp: Date.now() }
      }
    } catch (error) {
      console.error('🔍 AuthProvider: Fetch error:', error)
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