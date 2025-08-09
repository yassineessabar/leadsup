import { useState, useEffect, useCallback } from 'react'

interface CompanyLogoState {
  logoUrl: string | null
  loading: boolean
  error: string | null
}

export function useCompanyLogo() {
  const [logoState, setLogoState] = useState<CompanyLogoState>({
    logoUrl: null,
    loading: true,
    error: null,
  })

  const fetchLogo = useCallback(async () => {
    setLogoState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // First try to get logo from review link settings
      try {
        const reviewLinkResponse = await fetch('/api/review-link')
        if (reviewLinkResponse.ok) {
          const reviewLinkData = await reviewLinkResponse.json()
          if (reviewLinkData.success && reviewLinkData.data?.company_logo_url) {
            setLogoState({
              logoUrl: reviewLinkData.data.company_logo_url,
              loading: false,
              error: null,
            })
            return
          }
        }
      } catch (reviewLinkError) {
        // Continue to profile fallback
      }

      // Fallback to account profile avatar
      try {
        const profileResponse = await fetch('/api/account/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData.success && profileData.data?.avatar_url) {
            setLogoState({
              logoUrl: profileData.data.avatar_url,
              loading: false,
              error: null,
            })
            return
          }
        }
      } catch (profileError) {
        // Continue to no logo found
      }

      // No logo found
      setLogoState({
        logoUrl: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error fetching company logo:', error)
      setLogoState({
        logoUrl: null,
        loading: false,
        error: 'Failed to load logo',
      })
    }
  }, [])

  const updateLogo = useCallback(async (newLogoUrl: string, source: 'review-link' | 'profile' = 'review-link') => {
    try {
      // Update local state immediately for instant visual feedback
      setLogoState(prev => ({
        ...prev,
        logoUrl: newLogoUrl,
      }))

      // Update both sources to keep them in sync
      const updatePromises = []

      // Update review link logo
      updatePromises.push(
        fetch('/api/review-link', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_logo_url: newLogoUrl }),
        })
      )

      // Update profile avatar
      updatePromises.push(
        fetch('/api/account/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: newLogoUrl }),
        })
      )

      await Promise.all(updatePromises)

      // Dispatch a custom event to notify all useCompanyLogo instances
      window.dispatchEvent(new CustomEvent('company-logo-updated', {
        detail: { logoUrl: newLogoUrl }
      }))

      return { success: true }
    } catch (error) {
      console.error('Error updating logo:', error)
      // Revert local state on error by refetching
      setLogoState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Refetch without creating dependency loop
        const reviewLinkResponse = await fetch('/api/review-link')
        if (reviewLinkResponse.ok) {
          const reviewLinkData = await reviewLinkResponse.json()
          if (reviewLinkData.success && reviewLinkData.data?.company_logo_url) {
            setLogoState({
              logoUrl: reviewLinkData.data.company_logo_url,
              loading: false,
              error: null,
            })
            return { success: false, error: 'Failed to update logo' }
          }
        }

        setLogoState({
          logoUrl: null,
          loading: false,
          error: 'Failed to update logo',
        })
      } catch (fetchError) {
        setLogoState({
          logoUrl: null,
          loading: false,
          error: 'Failed to update logo',
        })
      }

      return { success: false, error: 'Failed to update logo' }
    }
  }, [])

  const refreshLogo = useCallback(() => {
    fetchLogo()
  }, [])

  useEffect(() => {
    fetchLogo()

    // Listen for logo updates from other instances
    const handleLogoUpdate = (event: CustomEvent) => {
      setLogoState(prev => ({
        ...prev,
        logoUrl: event.detail.logoUrl,
      }))
    }

    window.addEventListener('company-logo-updated', handleLogoUpdate as EventListener)

    return () => {
      window.removeEventListener('company-logo-updated', handleLogoUpdate as EventListener)
    }
  }, [])

  return {
    logoUrl: logoState.logoUrl,
    loading: logoState.loading,
    error: logoState.error,
    updateLogo,
    refreshLogo,
  }
}