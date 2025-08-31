"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useSubscription } from "@/hooks/use-subscription"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { LeadsDashboard } from "@/components/leads-dashboard"
import { ComprehensiveDashboard } from "@/components/comprehensive-dashboard"
import { LeadsTab } from "@/components/leads-tab"
import { AccountTab } from "@/components/account-tab"
import { UpgradePage } from "@/components/upgrade-page"
import { BillingSubscriptionPage } from "@/components/billing-subscription-page"
import { SettingsPage } from "@/components/settings-page"
import { LanguagePreferencesPage } from "@/components/language-preferences-page"
import { PrivacyPolicyPage } from "@/components/privacy-policy-page"
import { HelpCenterPage } from "@/components/help-center-page"
import CampaignsList from "@/components/campaign-tab"
import InboxTab from "@/components/inbox-tab"
import { IntegrationsTab } from "@/components/integrations-tab"
import { DomainTab } from "@/components/domain-tab"
import { TemplatesTab } from "@/components/templates-tab"
import { CampaignAnalytics } from "@/components/campaign-analytics"
import { SupportChatbot } from "@/components/support-chatbot"

// Wrapper component to fetch campaign data and render analytics
function CampaignAnalyticsWrapper({ campaignId, campaignData, onBack, onCampaignUpdate }: { 
  campaignId: string | null, 
  campaignData?: any,
  onBack: () => void,
  onCampaignUpdate: (campaignId: string, updatedCampaign: any) => void
}) {
  const [campaign, setCampaign] = useState(campaignData || null)
  const [loading, setLoading] = useState(!campaignData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If campaign data is already provided, don't fetch again
    if (campaignData) {
      setCampaign(campaignData)
      setLoading(false)
      return
    }

    const fetchCampaign = async () => {
      console.log('📊 CampaignAnalyticsWrapper fetching campaign:', campaignId)
      
      if (!campaignId) {
        console.error('❌ No campaign ID provided to analytics wrapper')
        setError("No campaign ID provided")
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/campaigns/${campaignId}/save`, {
          credentials: 'include'
        })
        const result = await response.json()
        
        if (response.ok && result.success && result.data?.campaign) {
          setCampaign(result.data.campaign)
        } else {
          setError("Failed to load campaign data")
        }
      } catch (err) {
        console.error("Error fetching campaign:", err)
        setError("Failed to load campaign")
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [campaignId, campaignData])

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Campaign Analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error || "Campaign not found"}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    )
  }

  const handleStatusUpdate = async (campaignId: string | number, newStatus: string) => {
    console.log('📊 CampaignAnalyticsWrapper handleStatusUpdate called:', { campaignId, newStatus })
    try {
      const requestBody = JSON.stringify({ status: newStatus })
      console.log('📊 Sending request body:', requestBody)
      
      const response = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: requestBody,
      })

      console.log('📊 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('📊 API error response:', errorText)
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('📊 Status update API response:', result)
      if (result.success) {
        const updatedCampaign = { ...campaign, status: newStatus }
        setCampaign(updatedCampaign)
        console.log('📊 Local campaign state updated:', updatedCampaign)
        
        // Update the campaign cache via callback
        onCampaignUpdate(campaignId.toString(), updatedCampaign)
        console.log('💾 Campaign cache updated for ID:', campaignId.toString())
        
        // Dispatch event to notify campaign list of the update
        window.dispatchEvent(new CustomEvent('campaigns-updated', { 
          detail: { campaigns: [updatedCampaign] } 
        }))
        console.log('📡 Dispatched campaigns-updated event')
        
        console.log('✅ Campaign status updated locally and cache updated')
      } else {
        console.error('📊 API returned success=false:', result)
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
    }
  }

  return <CampaignAnalytics 
    campaign={campaign} 
    onBack={onBack} 
    onStatusUpdate={handleStatusUpdate}
  />
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth()
  const { userInfo, hasActiveSubscription } = useSubscription()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [campaignCache, setCampaignCache] = useState<Record<string, any>>({})

  // Enhanced setActiveTab that dispatches custom event for data refetching
  const handleTabChange = (newTab: string, skipEvent = false) => {
    setActiveTab(newTab)
    // Only dispatch event if not triggered by an event listener (prevents infinite loop)
    if (!skipEvent) {
      window.dispatchEvent(new CustomEvent('tab-switched', { detail: newTab }))
    }
  }
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Listen for campaign data updates from the campaigns tab
  useEffect(() => {
    const handleCampaignUpdate = (event: CustomEvent) => {
      const { campaigns } = event.detail
      if (campaigns && Array.isArray(campaigns)) {
        const newCache: Record<string, any> = {}
        campaigns.forEach((campaign: any) => {
          if (campaign.id) {
            newCache[campaign.id.toString()] = campaign
          }
        })
        setCampaignCache(newCache)
      }
    }

    window.addEventListener('campaigns-updated', handleCampaignUpdate as EventListener)
    return () => window.removeEventListener('campaigns-updated', handleCampaignUpdate as EventListener)
  }, [])

  // Check for tab parameter in URL
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      handleTabChange(tab)
    }
    
    // Check for force welcome popup (for testing or clearing localStorage)
    const forceWelcome = searchParams.get("forceWelcome")
    if (forceWelcome === "true" && user) {
      console.log('🎯 Force welcome triggered - clearing localStorage and showing popup')
      localStorage.removeItem(`welcome_shown_${user.id}`)
      // Remove the parameter and reload to trigger new user flow
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('forceWelcome')
      currentUrl.searchParams.set('from', 'signup')
      window.history.replaceState({}, '', currentUrl.toString())
      window.location.reload()
    }
  }, [searchParams, user])

  // Detect mobile screen size
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-minimize sidebar on mobile
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Auto-open Create Campaign popup for new users
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const checkIfNewUser = async () => {
      try {
        console.log('🔍 Checking if user is new...', { userId: user.id, isAuthenticated })
        
        // Check if we've already shown the welcome popup for this user
        const hasSeenWelcome = localStorage.getItem(`welcome_shown_${user.id}`)
        if (hasSeenWelcome) {
          console.log('⏭️ User has already seen welcome popup, skipping')
          return
        }

        // Check if user has any campaigns
        const response = await fetch('/api/campaigns', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          const campaigns = data.data || data.campaigns || data || []
          
          console.log('📊 User campaigns:', campaigns)
          
          // If user has no campaigns, they're new - show the campaign creation popup
          if (Array.isArray(campaigns) && campaigns.length === 0) {
            console.log('🎯 New user detected (no campaigns) - triggering welcome flow')
            
            // Check if they came from signup (shorter delay) or regular visit
            const fromSignup = searchParams.get('from') === 'signup' || 
                              sessionStorage.getItem('just_signed_up') === 'true'
            const delay = fromSignup ? 500 : 1000
            
            console.log(`⏱️ Using ${delay}ms delay, fromSignup: ${fromSignup}`)
            
            // Clear signup flag
            sessionStorage.removeItem('just_signed_up')
            
            // Small delay to let the dashboard load first
            setTimeout(() => {
              console.log('🔄 Switching to campaigns tab and setting autoOpen=true')
              
              // Switch to campaigns tab with auto-open parameter
              const currentUrl = new URL(window.location.href)
              currentUrl.searchParams.set('tab', 'campaigns-email')
              currentUrl.searchParams.set('autoOpen', 'true')
              window.history.pushState({}, '', currentUrl.toString())
              
              // Trigger tab change
              handleTabChange('campaigns-email')
              
              // Also dispatch event as fallback
              setTimeout(() => {
                console.log('📡 Dispatching open-campaign-popup event')
                window.dispatchEvent(new CustomEvent('open-campaign-popup'))
              }, 100)
              
              // Mark that we've shown the welcome popup
              localStorage.setItem(`welcome_shown_${user.id}`, 'true')
              console.log('✅ Welcome popup marked as shown for user')
            }, delay)
          } else {
            console.log('👤 User has campaigns, not showing welcome popup')
          }
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to fetch campaigns:', response.status, response.statusText)
          console.error('❌ Error details:', errorText)
          
          // If it's a 401, the user's session might be expired
          if (response.status === 401) {
            console.log('🔄 Session expired, user may need to re-authenticate')
          }
        }
      } catch (error) {
        console.error('💥 Error checking user campaigns:', error)
      }
    }

    checkIfNewUser()
  }, [isAuthenticated, user, searchParams, handleTabChange])

  // Handle redirect to login page if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  // Removed onboarding handlers

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <ComprehensiveDashboard />
      case "leads":
        return <LeadsTab />
      case "campaigns-email":
      case "campaigns-linkedin":
      case "campaigns-multi-channel":
        return <CampaignsList activeSubTab={activeTab} />
      case "inbox":
        return <InboxTab key={`inbox-${typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') : 'server'}`} />
      case "templates":
        return <TemplatesTab />
      case "integrations":
        return <IntegrationsTab />
      case "domain":
        return <DomainTab />
      case "analytics":
        const campaignId = searchParams.get("campaign")
        const cachedCampaign = campaignId ? campaignCache[campaignId] : null
        console.log('📊 Analytics tab - campaignId from URL:', campaignId)
        console.log('📊 Using cached campaign data:', !!cachedCampaign)
        return <CampaignAnalyticsWrapper 
          campaignId={campaignId} 
          campaignData={cachedCampaign}
          onBack={() => {
            console.log('🔙 Back button clicked from analytics')
            
            // Clear campaign-specific URL parameters
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('campaign')
              url.searchParams.set('tab', 'campaigns-email')
              window.history.pushState({}, '', url.toString())
              console.log('🔗 URL updated:', url.toString())
            }
            
            // Switch back to campaigns tab
            handleTabChange("campaigns-email")
            console.log('📄 Tab changed to campaigns-email')
            
            // Dispatch event to reset campaign view to list
            setTimeout(() => {
              console.log('📡 Dispatching reset-to-campaign-list event')
              window.dispatchEvent(new CustomEvent('reset-to-campaign-list'))
            }, 100)
          }}
          onCampaignUpdate={(campaignId, updatedCampaign) => {
            setCampaignCache(prev => ({
              ...prev,
              [campaignId]: updatedCampaign
            }))
          }}
        />
      case "billing":
        return <BillingSubscriptionPage onTabChange={handleTabChange} />
      case "settings":
        return <SettingsPage onSectionChange={handleTabChange} />
      case "language-preferences":
        return <LanguagePreferencesPage onBack={() => handleTabChange("settings")} />
      case "privacy":
        return <PrivacyPolicyPage onBack={() => handleTabChange("settings")} />
      case "help":
        return <HelpCenterPage onBack={() => handleTabChange("settings")} />
      case "account":
        return <AccountTab onTabChange={handleTabChange} />
      case "upgrade":
        return <UpgradePage onTabChange={handleTabChange} />
      default:
        return <LeadsDashboard />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading LeadsUp...</p>
        </div>
      </div>
    )
  }

  // Show loading or redirect for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 relative">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          handleTabChange(tab)
          // Update URL without page reload
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.set("tab", tab)
            window.history.pushState({}, "", url.toString())
          }
          // Auto-close sidebar on mobile after selection
          if (isMobile) {
            setSidebarOpen(false)
          }
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          activeTab={activeTab}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{renderContent()}</div>
        </main>
      </div>

      <SupportChatbot />
    </div>
  )
}
