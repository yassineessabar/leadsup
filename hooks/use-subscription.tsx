"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./use-auth"

interface SubscriptionContextType {
  userInfo: any
  hasActiveSubscription: boolean
  loading: boolean
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  userInfo: null,
  hasActiveSubscription: false,
  loading: true,
})

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setUserInfo(user)
      setLoading(false)
    } else {
      setUserInfo(null)
      setLoading(false)
    }
  }, [user])

  const hasActiveSubscription = userInfo?.subscription_status === "active" && userInfo?.subscription_type !== "free"

  return (
    <SubscriptionContext.Provider value={{ userInfo, hasActiveSubscription, loading }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}