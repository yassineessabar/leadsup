"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Eye,
  MousePointer,
  UserPlus,
  Settings,
  CalendarDays,
  ChevronDown,
  Filter,
  Sparkles,
  Info,
  X,
  Check,
  Plug,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { InsightsChart } from "./insights-chart"
import { cachedFetch } from "@/lib/cache"
import { UpgradeProDialog } from "./upgrade-pro-dialog"

interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalRequestsSent: number
  emailsSent: number
  smsSent: number
  uniquePageVisitors: number
  totalPageVisits: number
  customersWhoRated: number
  starSelections: any[]
  averageRating: number
  ratingDistribution: Record<string, number>
  platformClicks: any[]
  platformClicksByType: Record<string, number>
  customersWhoClickedPlatform: number
  totalReviews: number
  reviewsByPlatform: Record<string, number>
  repliedReviews: number
  conversionFunnel: {
    sent: number
    opened: number
    rated: number
    clickedPlatform: number
    leftReview: number
  }
  dailyStats: any[]
  internalFeedback: number
  externalRedirects: number
  enabledPlatforms: string[]
  responseRate: number
  ratingRate: number
  reviewRate: number
}

interface SummaryTabProps {
  onTabChange?: (tab: string) => void
}

export function SummaryTab({ onTabChange }: SummaryTabProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDateRange, setSelectedDateRange] = useState("Last 7 days")
  const [activeTab, setActiveTab] = useState("views-clicks")
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true)
  const [reviewLink, setReviewLink] = useState<string>("")
  const [userInfo, setUserInfo] = useState<{
    subscription_type?: string;
    subscription_status?: string;
  }>({})

  // Chart visibility toggles
  const [showViews, setShowViews] = useState(true)
  const [showUniqueViews, setShowUniqueViews] = useState(true)
  const [showClicks, setShowClicks] = useState(true)
  const [showUniqueClicks, setShowUniqueClicks] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const result = await cachedFetch(`/api/dashboard-stats?days=7`, { credentials: "include" }, 60000) // 1 minute cache
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      // Error fetching stats
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Fetch review link
    const fetchReviewLink = async () => {
      try {
        const response = await fetch('/api/review-link')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.review_url) {
            setReviewLink(result.data.review_url)
          }
        }
      } catch (error) {
        // Error fetching review link
      }
    }
    fetchReviewLink()

    // Fetch user subscription info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type,
            subscription_status: data.user.subscription_status,
          })
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }
    fetchUserInfo()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!stats) return null

  // Prepare chart data - ensure numbers are actual numbers, not strings
  const chartData = stats.dailyStats?.map(day => ({
    date: day.date,
    views: Number(day.visits) || 0,
    uniqueViews: Math.round((Number(day.visits) || 0) * 0.85), // Estimate unique views
    clicks: Number(day.platformClicks) || 0,
    uniqueClicks: Math.round((Number(day.platformClicks) || 0) * 0.75), // Estimate unique clicks
    clickRate: Number(day.visits) > 0 ? Math.round(((Number(day.platformClicks) || 0) / Number(day.visits)) * 100) : 0
  })) || [
    // Fallback sample data
    { date: '2025-07-18', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-19', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-20', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-21', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-22', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-23', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-24', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 }
  ]

  // Test with sample data to debug chart rendering
  const testChartData = [
    { date: '2025-07-19', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-20', views: 1, uniqueViews: 1, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-21', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-22', views: 1, uniqueViews: 1, clicks: 1, uniqueClicks: 1, clickRate: 100 },
    { date: '2025-07-23', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-24', views: 1, uniqueViews: 1, clicks: 0, uniqueClicks: 0, clickRate: 0 },
    { date: '2025-07-25', views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, clickRate: 0 }
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Insights Header */}
      <div className="flex items-center justify-between mb-4">
      <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Insights
          </Button>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1 rounded-lg bg-transparent">
                <CalendarDays className="h-4 w-4" /> {selectedDateRange} <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedDateRange("Last 7 days")}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedDateRange("Last 30 days")}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedDateRange("Lifetime")}>Lifetime</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="gap-1 rounded-lg bg-transparent"
            onClick={() => onTabChange?.("integrations")}
          >
            <Plug className="h-4 w-4" /> Integrations
          </Button>
        </div>
      </div>

      {/* Live Link Alert */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Your review link is live:{" "}
              <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
                {reviewLink}
              </a>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your performance metrics and user engagement</p>
          </div>
        </div>
        <Button
      variant="outline"
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
    >
      Open URL
    </Button>
      </div>

      {/* Lifetime Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div className="text-2xl font-bold">{stats.totalPageVisits || 0}</div>
            <span className="text-sm text-muted-foreground">
              {stats.uniquePageVisitors || 0} unique
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'rgb(87, 140, 255)' }} />
            <div className="text-2xl font-bold">{stats.totalPlatformClicks || 0}</div>
            <span className="text-sm text-muted-foreground">
              {stats.customersWhoClickedPlatform || 0} users
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Star Ratings</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div className="text-2xl font-bold">{stats.starSelections?.length || 0}</div>
            <span className="text-sm text-muted-foreground">
              {stats.averageRating ? `${stats.averageRating}★ avg` : 'No ratings'}
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <div className="text-2xl font-bold">
              {stats.totalPageVisits > 0 ? Math.round((stats.totalPlatformClicks / stats.totalPageVisits) * 100) : 0}%
            </div>
            <span className="text-sm text-muted-foreground">click rate</span>
          </CardContent>
        </Card>
      </div>

      {/* Activity Section */}
      <Card className="rounded-xl shadow-sm border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Activity</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="views-clicks">Views and clicks</TabsTrigger>
              <TabsTrigger value="click-rate">Click rate</TabsTrigger>
            </TabsList>
            <div className="flex items-center justify-between mb-4 text-sm">
              <div className="flex gap-4">
                <span>
                  Views: <span className="font-semibold">{stats.totalPageVisits || 0}</span>
                </span>
                <span>
                  Clicks: <span className="font-semibold">{stats.totalPlatformClicks || 0}</span>
                </span>
                <span>
                  Ratings: <span className="font-semibold">{stats.starSelections?.length || 0}</span>
                </span>
              </div>
              <span className="text-muted-foreground">Daily</span>
            </div>

            {/* Chart Area */}
            <div className="mt-6">
              <InsightsChart
                data={chartData}
                activeTab={activeTab}
                showViews={showViews}
                showUniqueViews={showUniqueViews}
                showClicks={showClicks}
                showUniqueClicks={showUniqueClicks}
              />
            </div>

            {/* Interactive Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <button
                onClick={() => setShowViews(!showViews)}
                className={`inline-flex items-center px-4 py-2 border rounded-full transition-colors ${
                  showViews
                    ? 'border-gray-300 bg-white hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="relative inline-flex items-center">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: '#2665d6'}}
                  />
                  <span
                    className="h-0.5 w-4 mr-2 border-solid border-2"
                    style={{borderColor: '#2665d6'}}
                  />
                </span>
                <p className="text-black text-sm mr-2">Views</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  showViews ? 'bg-black' : 'bg-gray-300'
                }`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              </button>

              <button
                onClick={() => setShowUniqueViews(!showUniqueViews)}
                className={`inline-flex items-center px-4 py-2 border rounded-full transition-colors ${
                  showUniqueViews
                    ? 'border-gray-300 bg-white hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="relative inline-flex items-center">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: '#02acc4'}}
                  />
                  <span
                    className="h-0.5 w-4 mr-2 border-dashed border-2"
                    style={{borderColor: '#02acc4'}}
                  />
                </span>
                <p className="text-black text-sm mr-2">Unique views</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  showUniqueViews ? 'bg-black' : 'bg-gray-300'
                }`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              </button>

              <button
                onClick={() => setShowClicks(!showClicks)}
                className={`inline-flex items-center px-4 py-2 border rounded-full transition-colors ${
                  showClicks
                    ? 'border-gray-300 bg-white hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="relative inline-flex items-center">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: '#D717E7'}}
                  />
                  <span
                    className="h-0.5 w-4 mr-2 border-solid border-2"
                    style={{borderColor: '#D717E7'}}
                  />
                </span>
                <p className="text-black text-sm mr-2">Clicks</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  showClicks ? 'bg-black' : 'bg-gray-300'
                }`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              </button>

              <button
                onClick={() => setShowUniqueClicks(!showUniqueClicks)}
                className={`inline-flex items-center px-4 py-2 border rounded-full transition-colors ${
                  showUniqueClicks
                    ? 'border-gray-300 bg-white hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="relative inline-flex items-center">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{backgroundColor: '#FC3E4B'}}
                  />
                  <span
                    className="h-0.5 w-4 mr-2 border-dashed border-2"
                    style={{borderColor: '#FC3E4B'}}
                  />
                </span>
                <p className="text-black text-sm mr-2">Unique clicks</p>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  showUniqueClicks ? 'bg-black' : 'bg-gray-300'
                }`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              </button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights Banner - Hide for Pro/Enterprise users */}
      {!((userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active') && (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 items-center justify-center rounded-[2rem] p-4 mt-4" style={{
          background: "radial-gradient(231.54% 129.26% at 2.85% 6.49%, rgba(243, 243, 241, 0) 0%, rgb(240, 240, 240) 45.75%), radial-gradient(234.17% 134.35% at 4.57% 5.48%, rgba(226, 223, 255, 0.6) 0.11%, rgba(230, 191, 233, 0.3) 12.65%, rgba(248, 205, 205, 0.4) 22.87%)",
          boxShadow: "rgb(224, 226, 217) 0px -1px 0px 0px inset"
        }}>
          <div className="font-semibold leading-tight flex gap-1 sm:items-center flex-1">
            <div className="shrink-0 sm:-translate-y-0.5 translate-y-0.5">
              <Sparkles className="h-4 w-4 text-[#D717E7]" />
            </div>
            Ask AI for personalized insights on your performance
          </div>
          <div className="sm:w-fit w-full">
            <UpgradeProDialog>
              <Button className="w-full bg-black text-white hover:bg-gray-900">
                <Sparkles className="h-4 w-4 mr-2" />
                Try Pro for free
              </Button>
            </UpgradeProDialog>
          </div>
        </div>
      )}

      {/* Upgrade Banner - Hide for Pro/Enterprise users */}
      {showUpgradeBanner && !((userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active') && (
        <Card className="rounded-xl shadow-sm border" style={{ background: 'linear-gradient(to right, rgba(87, 140, 255, 0.05), rgba(87, 140, 255, 0.1))' }}>
          <CardContent className="p-6 relative">
            <button
              className="absolute right-4 top-4 h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center"
              onClick={() => setShowUpgradeBanner(false)}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="max-w-2xl">
              <h2 className="text-xl font-bold mb-2">Unlock powerful insights</h2>
              <p className="text-muted-foreground mb-4">Find out how your Linktree is performing and chat with our AI assistant for personalized advice.</p>

              <ul className="space-y-2 mb-4 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  See your top performing links and products
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Learn about your audience's interests and demographics
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Get the full picture with a year's worth of data
                </li>
              </ul>

              <UpgradeProDialog>
                <Button className="bg-black text-white hover:bg-gray-900">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try it for free
                </Button>
              </UpgradeProDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}