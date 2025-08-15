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
// import { SupportChatbot } from "@/components/support-chatbot"

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
  }, [searchParams])

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
      case "integrations":
        return <IntegrationsTab />
      case "domain":
        return <DomainTab />
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
