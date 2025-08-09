"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { SummaryTab } from "@/components/summary-tab"
import { ReviewsTab } from "@/components/reviews-tab"
import { ReviewManagementTab } from "@/components/review-management-tab"
import { CustomizationTab } from "@/components/customization-tab"
import { AccountTab } from "@/components/account-tab"
import { UpgradePage } from "@/components/upgrade-page"
import { IntegrationsTab } from "@/components/integrations-tab"
import { BillingSubscriptionPage } from "@/components/billing-subscription-page"
import { ReviewLinkTab } from "@/components/review-link-tab"
import CampaignsList from "@/components/campaign-tab"
import { LeadsTab } from "@/components/leads-tab"
import { ClickTrackingAnalytics } from "@/components/click-tracking-analytics"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("summary")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
      case "summary":
        return <SummaryTab />
      case "reviews":
        return <ReviewsTab />
      case "review-management":
        return <ReviewManagementTab />
      case "customization":
        return <CustomizationTab />
      case "account":
        return <AccountTab />
      case "upgrade":
        return <UpgradePage />
      case "integrations":
        return <IntegrationsTab />
      case "billing":
        return <BillingSubscriptionPage />
      case "review-link":
        return <ReviewLinkTab />
      case "automation":
        return (
          <div className="p-6 text-center text-gray-500">
            Automation features have been migrated to n8n integration.
          </div>
        )
      case "campaigns":
        return <CampaignsList />
      case "leads":
        return <LeadsTab />
      case "analytics":
        return <ClickTrackingAnalytics />
      default:
        return <SummaryTab />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          activeTab={activeTab}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}
