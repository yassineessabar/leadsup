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
import { LandingPage } from "@/components/landing-page"
import CampaignsList from "@/components/campaign-tab"
import InboxTab from "@/components/inbox-tab"
import { IntegrationsTab } from "@/components/integrations-tab"
import { DomainTab } from "@/components/domain-tab"
import { TemplatesTab } from "@/components/templates-tab"
import { CampaignAnalytics } from "@/components/campaign-analytics"
// import { SupportChatbot } from "@/components/support-chatbot"

// Wrapper component to fetch campaign data and render analytics
function CampaignAnalyticsWrapper({ campaignId, onBack }: { campaignId: string | null, onBack: () => void }) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaign = async () => {
      console.log('📊 CampaignAnalyticsWrapper received campaignId:', campaignId)
      
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
  }, [campaignId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Loading Campaign Analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error || "Campaign not found"}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
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
        setCampaign(prev => prev ? { ...prev, status: newStatus } : prev)
        console.log('✅ Campaign status updated locally')
      } else {
        console.error('📊 API returned success=false:', result)
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
    }
  }

  return <CampaignAnalytics campaign={campaign} onBack={onBack} onStatusUpdate={handleStatusUpdate} />
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth()
  const { userInfo, hasActiveSubscription } = useSubscription()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")

  // Enhanced setActiveTab that dispatches custom event for data refetching
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    // Dispatch custom event to notify components about tab switch
    window.dispatchEvent(new CustomEvent('tab-switched', { detail: newTab }))
  }
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  // Show landing page if not authenticated
  if (!loading && !isAuthenticated) {
    return <LandingPage />
  }

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
        return <InboxTab />
      case "templates":
        return <TemplatesTab />
      case "integrations":
        return <IntegrationsTab />
      case "domain":
        return <DomainTab />
      case "analytics":
        const campaignId = searchParams.get("campaign")
        console.log('📊 Analytics tab - campaignId from URL:', campaignId)
        console.log('📊 Current URL search params:', Array.from(searchParams.entries()))
        return <CampaignAnalyticsWrapper campaignId={campaignId} onBack={() => handleTabChange("campaigns-email")} />
      case "billing":
        return <BillingSubscriptionPage />
      case "settings":
        return <SettingsPage onSectionChange={handleTabChange} />
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
      <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Loading LeadsUp...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  return (
    <div className="flex h-screen bg-[rgb(243,243,241)] relative">
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

      {/* Support Chatbot - Temporarily commented out */}
      {/* <SupportChatbot /> */}
    </div>
  )
}
