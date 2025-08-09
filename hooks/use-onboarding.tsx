"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingData {
  companyName?: string
  businessCategory?: {
    category: string
    description?: string
  }
  selectedPlatforms?: string[]
  platformLinks?: Record<string, string>
  companyProfile?: {
    displayName?: string
    bio?: string
    profileImage?: string | null
  }
  selectedTemplate?: string
}

interface OnboardingContextType {
  data: OnboardingData
  updateData: (newData: Partial<OnboardingData>) => void
  saveToStorage: () => void
  loadFromStorage: () => void
  clearData: () => void
  submitOnboarding: () => Promise<boolean>
  isSubmitting: boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage()
  }, [])

  const updateData = (newData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }))
  }

  const saveToStorage = () => {
    try {
      localStorage.setItem('onboarding_data', JSON.stringify(data))
      sessionStorage.setItem('onboarding_in_progress', 'true')
    } catch (error) {
      console.error('Failed to save onboarding data to storage:', error)
    }
  }

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('onboarding_data')
      if (stored) {
        setData(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load onboarding data from storage:', error)
    }
  }

  const clearData = () => {
    setData({})
    localStorage.removeItem('onboarding_data')
    sessionStorage.removeItem('onboarding_in_progress')
  }

  const submitOnboarding = async (): Promise<boolean> => {
    setIsSubmitting(true)

    try {
      // First try the complete save endpoint
      const response = await fetch('/api/save-onboarding-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        clearData() // Clear local storage after successful save
        sessionStorage.setItem('onboarding_completed', 'true')
        return true
      } else {
        // Fallback to simple endpoint if complete fails
        const simpleResponse = await fetch('/api/save-onboarding-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        })

        if (simpleResponse.ok) {
          clearData()
          sessionStorage.setItem('onboarding_completed', 'true')
          return true
        } else {
          console.error('❌ Failed to save onboarding data:', await simpleResponse.text())
          return false
        }
      }
    } catch (error) {
      console.error('❌ Error saving onboarding data:', error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      saveToStorage()
    }
  }, [data])

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        saveToStorage,
        loadFromStorage,
        clearData,
        submitOnboarding,
        isSubmitting,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}