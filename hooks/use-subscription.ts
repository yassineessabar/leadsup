import { useState, useEffect } from 'react'

interface UserSubscription {
  subscription_type?: string
  subscription_status?: string
}

export function useSubscription() {
  const [userInfo, setUserInfo] = useState<UserSubscription>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Add AbortController for fetch timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, 30000) // Increased to 30 second timeout

        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: 'no-cache',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Set default values for unauthenticated users
          setUserInfo({
            subscription_type: 'free',
            subscription_status: 'inactive',
          })
          return
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Expected JSON response from subscription endpoint')
        }

        const data = await response.json()
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type || 'free',
            subscription_status: data.user.subscription_status || 'inactive',
          })
        } else {
          // Set default values
          setUserInfo({
            subscription_type: 'free',
            subscription_status: 'inactive',
          })
        }
      } catch (error) {
        // Handle AbortError specifically
        if (error instanceof Error && error.name === 'AbortError') {
          } else {
          console.error("useSubscription: Error fetching user info:", error)
        }
        // Set default values on any error
        setUserInfo({
          subscription_type: 'free',
          subscription_status: 'inactive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchUserInfo()
  }, [])

  const hasActiveSubscription = userInfo.subscription_type &&
    userInfo.subscription_type !== 'free' &&
    userInfo.subscription_status === 'active'

  return {
    userInfo,
    loading,
    hasActiveSubscription,
    isPremium: hasActiveSubscription
  }
}