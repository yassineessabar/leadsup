"use client"
import { BarChart3, MessageSquare, User, Plug, Mail, Link, LogOut, Send, Crown, Sparkles, Settings, Users, Menu, Palette, BarChart2, Lock, Zap, Inbox, UserCheck, Plus, ChevronRight, ChevronDown, SidebarOpen, SidebarClose, Globe, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import { UpgradeProDialog } from "@/components/upgrade-pro-dialog"
import { useState, useEffect, useCallback } from "react"

interface MenuItem {
  id: string
  label: string
  icon: any
  subItems?: MenuItem[]
  isPremium?: boolean
}

interface DashboardSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isOpen: boolean
  onToggle: () => void
  isMobile?: boolean
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onToggle,
  isMobile = false,
  isCollapsed,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const router = useRouter()
  const { logoUrl, loading: logoLoading } = useCompanyLogo()
  const [companyName, setCompanyName] = useState("LeadsUp")
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [userInfo, setUserInfo] = useState<{ email?: string; id?: string }>({})
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [campaignsExpanded, setCampaignsExpanded] = useState(true)

  const fetchUserData = useCallback(async (force = false) => {
    // Prevent duplicate API calls within 30 seconds unless forced
    const now = Date.now()
    if (!force && now - lastFetchTime < 30000) {
      return
    }

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-cache"
      })
      const result = await response.json()

      if (result.success && result.user) {
        const newCompanyName = result.user.company || "LeadsUp"
        setCompanyName(newCompanyName)

        setUserInfo({
          email: result.user.email,
          id: result.user.id
        })

        // Check if user has an active subscription (not free)
        const hasActiveSubscription = result.user.subscription_type &&
          result.user.subscription_type !== 'free' &&
          result.user.subscription_status === 'active'
        setIsPremium(hasActiveSubscription)
        setLastFetchTime(now)
      } else {
        setCompanyName("LeadsUp")
        setIsPremium(false)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setCompanyName("LeadsUp")
      setIsPremium(false)
    } finally {
      setLoading(false)
    }
  }, [lastFetchTime])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Listen for subscription changes and tab switches
  useEffect(() => {
    const handleTabSwitch = (e: CustomEvent) => {
      if (e.detail === 'billing' || e.detail === 'upgrade') {
        // Force refresh user data when visiting billing/upgrade tabs
        fetchUserData(true)
      } else if (typeof e.detail === 'string' && e.detail.startsWith('campaigns-')) {
        // Handle campaign sub-tab navigation
        setCampaignsExpanded(true) // Ensure campaigns is expanded
        onTabChange(e.detail)
      }
    }

    window.addEventListener('tab-switched', handleTabSwitch as EventListener)
    
    return () => {
      window.removeEventListener('tab-switched', handleTabSwitch as EventListener)
    }
  }, [fetchUserData]) // Removed onTabChange from dependencies to fix the error

  const mainMenuItems = [
    { 
      id: "campaigns", 
      label: "Campaigns", 
      icon: Zap,
      subItems: [
        { id: "campaigns-email", label: "Email", icon: Mail }
        // Hidden: LinkedIn and Multi-Channel
      ]
    },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "leads", label: "Leads", icon: Users },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "inbox", label: "Inbox", icon: Inbox },
  ]

  const toolsMenuItems = [
    { id: "domain", label: "Domain", icon: Globe }
  ]

  // Removed settings menu item - now accessed via company button

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("Logout failed:", await response.json())
      }
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  const handleUpgrade = () => {
    onTabChange?.("upgrade")
  }

  // New design for desktop, keeping mobile responsive
  if (!isMobile) {
    return (
      <aside className={cn(
        "flex flex-col rounded-3xl bg-white border border-gray-100/50 shadow-sm p-1.5 dark:bg-gray-900 h-full my-8 ml-1 transition-all duration-300",
        isCollapsed ? "max-w-[60px]" : "max-w-[240px]"
      )}>
        <div className="flex items-center px-2 py-3 mb-6 relative">
          <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="https://framerusercontent.com/images/yar0HFd2Ii54LrLgUJ1sPLmjoS0.svg" 
              alt="LeadsUp Logo" 
              className="h-8 w-8"
            />
          </div>
          {!isCollapsed && (
            <span className="font-light text-xl ml-3 truncate tracking-tight text-gray-900">LeadsUp</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "p-1 h-6 w-6 flex-shrink-0",
              isCollapsed ? "ml-2" : "ml-auto"
            )}
            onClick={onToggleCollapsed}
          >
            {isCollapsed ? (
              <SidebarOpen className="h-4 w-4" />
            ) : (
              <SidebarClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Create Campaign Button */}
        <div className="px-2 pb-6">
          <Button
            className={cn(
              "w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium transition-all duration-300 shadow-sm",
              isCollapsed ? "justify-center px-2" : "justify-center gap-2"
            )}
            onClick={() => {
              onTabChange("campaigns-email")
              // Trigger campaign creation after switching to campaigns tab
              setTimeout(() => {
                const event = new CustomEvent('create-campaign')
                window.dispatchEvent(event)
              }, 100)
            }}
            title={isCollapsed ? "Create Campaign" : undefined}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && <span className="text-base">Create Campaign</span>}
          </Button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto">
          {/* Main Navigation Items */}
          <div className="space-y-1">
            {mainMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id || (item.id === 'campaigns' && activeTab === 'campaigns-email')
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isParentActive = false // Simplified since we're not using dropdowns

              return (
                <div key={item.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full rounded-2xl h-11 text-base relative transition-all duration-300",
                      isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-3 py-2",
                      (isActive || isParentActive)
                        ? "bg-blue-50/80 text-blue-600 hover:bg-blue-100/80 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 font-medium"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 font-normal"
                    )}
                    onClick={() => {
                      if (item.id === 'campaigns') {
                        // Always navigate directly to email campaigns
                        onTabChange('campaigns-email')
                      } else {
                        onTabChange(hasSubItems ? item.subItems[0].id : item.id)
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </Button>

                </div>
              )
            })}
          </div>

          {/* Tools Section */}
          <div className="space-y-1">
            {!isCollapsed && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4">Tools</p>}
            {toolsMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isParentActive = hasSubItems && item.subItems.some(subItem => activeTab === subItem.id)
              const isPremiumFeature = item.isPremium && !isPremium

              // If it's a premium feature and user doesn't have access, wrap in upgrade dialog
              if (isPremiumFeature) {
                return (
                  <div key={item.id}>
                    <UpgradeProDialog>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full rounded-2xl h-11 text-base transition-all duration-300",
                          isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-3 py-2",
                          "text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800 cursor-pointer"
                        )}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <>
                            {item.label}
                            <Lock className="h-3 w-3 ml-auto text-gray-400" />
                          </>
                        )}
                      </Button>
                    </UpgradeProDialog>
                  </div>
                )
              }

              return (
                <div key={item.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full rounded-2xl h-11 text-base transition-all duration-300",
                      isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-3 py-2",
                      (isActive || isParentActive)
                        ? "bg-blue-50/80 text-blue-600 hover:bg-blue-100/80 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 font-medium"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 font-normal"
                    )}
                    onClick={() => onTabChange(hasSubItems ? item.subItems[0].id : item.id)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {!isCollapsed && item.label}
                  </Button>

                  {hasSubItems && (isParentActive || isActive) && !isCollapsed && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = activeTab === subItem.id

                        return (
                          <Button
                            key={subItem.id}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start gap-3 rounded-lg px-2.5 py-1 h-8 text-sm",
                              isSubActive
                                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800"
                                : "text-black hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                            )}
                            onClick={() => onTabChange(subItem.id)}
                          >
                            <SubIcon className="h-3.5 w-3.5" />
                            {subItem.label}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Settings removed - now accessed via company button */}
        </nav>

        <div className="mt-auto space-y-3 pb-6">
          {!isPremium && (
            <Button
              variant="outline"
              className={cn(
                "w-full rounded-2xl border-blue-200/50 bg-blue-50/50 h-12 text-base text-blue-600 hover:bg-blue-100/60 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800 transition-all duration-300 font-medium",
                isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-4 py-3"
              )}
              onClick={handleUpgrade}
              title={isCollapsed ? "Try Pro for free" : undefined}
            >
              <Crown className="h-4 w-4" />
              {!isCollapsed && "Try Pro for free"}
            </Button>
          )}

          <Button
            variant="outline"
            className={cn(
              "w-full rounded-2xl border-gray-200/50 bg-gray-50/50 h-12 text-base text-gray-700 hover:bg-gray-100/60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all duration-300 font-medium",
              isCollapsed ? "justify-center px-2" : "justify-start gap-3 px-4 py-3"
            )}
            onClick={() => onTabChange("settings")}
            title={isCollapsed ? `@${companyName.toLowerCase().replace(/\s+/g, '')}` : undefined}
          >
            <Avatar className="h-7 w-7 min-w-[1.75rem]">
              <AvatarImage src={logoUrl || "/placeholder.svg?height=24&width=24"} alt="Company Logo" />
              <AvatarFallback className="text-xs font-medium">{companyName ? companyName[0].toUpperCase() : 'C'}</AvatarFallback>
            </Avatar>
            {!isCollapsed && <span className="text-base truncate font-medium">@{companyName.toLowerCase().replace(/\s+/g, '')}</span>}
          </Button>
        </div>
      </aside>
    )
  }

  // Mobile sidebar remains the same
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100/50 shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-6 border-b border-gray-100/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="https://framerusercontent.com/images/yar0HFd2Ii54LrLgUJ1sPLmjoS0.svg" 
              alt="LeadsUp Logo" 
              className="h-8 w-8"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-light text-xl tracking-tight text-gray-900">LeadsUp</h1>
            <p className="text-xs text-gray-500 font-light">Lead Generation Platform</p>
          </div>
        </div>
      </div>

      {/* Create Campaign Button */}
      <div className="px-6 py-4 border-b border-gray-100/50">
        <Button
          className="w-full justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium shadow-sm transition-all duration-300"
          onClick={() => {
            onTabChange("campaigns-email")
            // Trigger campaign creation after switching to campaigns tab
            setTimeout(() => {
              const event = new CustomEvent('create-campaign')
              window.dispatchEvent(event)
            }, 100)
          }}
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <nav className="flex-1 p-6 space-y-6">
        {/* Main Navigation Items */}
        <ul className="space-y-2">
          {mainMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id || (item.id === 'campaigns' && activeTab === 'campaigns-email')
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isParentActive = false // Simplified since we're not using dropdowns

            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-11 px-4 transition-all duration-300 relative rounded-2xl",
                    (isActive || isParentActive)
                      ? "bg-blue-50/80 text-blue-600 hover:bg-blue-100/80 font-medium"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-normal",
                  )}
                  onClick={() => {
                    if (item.id === 'campaigns') {
                      // Always navigate directly to email campaigns
                      onTabChange('campaigns-email')
                    } else {
                      onTabChange(hasSubItems ? item.subItems[0].id : item.id)
                    }
                  }}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="truncate text-base">{item.label}</span>
                </Button>

              </li>
            )
          })}
        </ul>

        {/* Tools Section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">Tools</p>
          <ul className="space-y-2">
            {toolsMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isParentActive = hasSubItems && item.subItems.some(subItem => activeTab === subItem.id)
              const isPremiumFeature = item.isPremium && !isPremium

              // If it's a premium feature and user doesn't have access, wrap in upgrade dialog
              if (isPremiumFeature) {
                return (
                  <li key={item.id}>
                    <UpgradeProDialog>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-11 px-4 transition-all duration-300 rounded-2xl",
                          "text-gray-400 hover:bg-gray-50 cursor-pointer"
                        )}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="truncate text-base">{item.label}</span>
                        <Lock className="w-4 h-4 ml-auto text-gray-400" />
                      </Button>
                    </UpgradeProDialog>
                  </li>
                )
              }

              return (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-11 px-4 transition-all duration-300 rounded-2xl",
                      (isActive || isParentActive)
                        ? "bg-blue-50/80 text-blue-600 hover:bg-blue-100/80 font-medium"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-normal",
                    )}
                    onClick={() => onTabChange(hasSubItems ? item.subItems[0].id : item.id)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="truncate text-base">{item.label}</span>
                  </Button>

                  {hasSubItems && (isParentActive || isActive) && (
                    <ul className="ml-6 mt-2 space-y-1">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = activeTab === subItem.id

                        return (
                          <li key={subItem.id}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full justify-start h-8 px-3 transition-all duration-200",
                                isSubActive
                                  ? "bg-black text-white hover:bg-gray-800"
                                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                              )}
                              onClick={() => onTabChange(subItem.id)}
                            >
                              <SubIcon className="w-4 h-4 mr-2" />
                              <span className="truncate text-xs font-medium">{subItem.label}</span>
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Settings removed - now accessed via company button */}
      </nav>

      <div className="p-6 border-t border-gray-100/50 space-y-3">
        {!isPremium && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl h-12 px-4 py-3 text-base font-medium"
            onClick={handleUpgrade}
          >
            <Crown className="w-5 h-5 mr-3" />
            <span className="truncate">Try Pro for free</span>
            <img
              src="https://framerusercontent.com/images/gtnO9xfRQzAPZ18lfRKGZJVoB6U.png"
              alt="Loop Logo"
              className="w-5 h-5 ml-2 object-contain"
            />
          </Button>
        )}
      </div>

      <div className="p-6 border-t border-gray-100/50">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 rounded-2xl border-gray-200/50 bg-gray-50/50 px-4 py-3 h-12 text-base text-gray-700 hover:bg-gray-100/60 transition-all duration-300 font-medium"
          onClick={() => onTabChange("settings")}
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={logoUrl || "/placeholder.svg?height=24&width=24"} alt="Company Logo" />
            <AvatarFallback className="text-xs font-medium">{companyName ? companyName[0].toUpperCase() : 'C'}</AvatarFallback>
          </Avatar>
          <span className="truncate">@{companyName.toLowerCase().replace(/\s+/g, '')}</span>
        </Button>
      </div>
    </div>
  )
}
