"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from 'react-i18next'
import { LanguageSelectorCompact } from "@/components/language-selector"
import { Bell, Menu, X, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardHeaderProps {
  activeTab: string
  onSidebarToggle: () => void
  sidebarOpen: boolean
  isMobile: boolean
}

export function DashboardHeaderI18n({ activeTab, onSidebarToggle, sidebarOpen, isMobile }: DashboardHeaderProps) {
  const { t } = useTranslation()
  const [notifications] = useState(3)
  const router = useRouter()

  const getTabTitle = (tab: string) => {
    const tabTitles: { [key: string]: string } = {
      "summary": t('navigation.dashboard'),
      "reviews": t('navigation.reviews', 'Reviews'),
      "review-link": t('navigation.links', 'Links'),
      "customers": t('navigation.audience', 'Audience'),
      "get-reviews": t('navigation.automation', 'Automation'),
      "requests-sent": t('navigation.automationInbox', 'Automation - Inbox'),
      "review-management": t('navigation.reviewManagement', 'Review Management'),
      "customization": t('navigation.customization', 'Customization'),
      "account": t('settings.title'),
      "upgrade": t('navigation.upgrade'),
      "integrations": t('navigation.integrations'),
      "billing": t('billing.title'),
      "settings": t('navigation.settings'),
      "campaigns": t('navigation.campaigns'),
      "leads": t('navigation.leads'),
      "inbox": t('navigation.inbox'),
      "domains": t('navigation.domains'),
      "templates": t('navigation.templates'),
      "analytics": t('navigation.analytics'),
    }
    return tabTitles[tab] || t('navigation.dashboard')
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu button and title */}
          <div className="flex items-center">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="mr-3"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            <h1 className="text-xl font-semibold text-gray-900">
              {getTabTitle(activeTab)}
            </h1>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <LanguageSelectorCompact />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <User className="mr-2 h-4 w-4" />
                  {t('navigation.account')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  {t('navigation.settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}