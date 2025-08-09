"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Star,
  Eye,
  MousePointer,
  ExternalLink,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  Info,
  Crown,
  Zap,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UpgradeProDialog } from "./upgrade-pro-dialog"

interface CustomerActivity {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  status: string
  created_at: string
  activity: {
    totalPageVisits: number
    lastPageVisit: string | null
    lastStarRating: number | null
    lastStarSelection: string | null
    redirectPlatforms: string[]
    lastPlatformRedirect: {
      platform: string
      timestamp: string
    } | null
    hasActivity: boolean
  }
  reviews: Array<{
    id: string
    platform: string
    rating: number
    text: string
    created_at: string
    replied: boolean
  }>
  totalReviews: number
}

export function ReviewsTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterActivity, setFilterActivity] = useState("all")
  const [filterRating, setFilterRating] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<CustomerActivity[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/reviews")
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
      } else {
        console.error("Error fetching data:", result.error)
        toast({
          title: "Error",
          description: "Failed to load customer activity data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load customer activity data",
        variant: "destructive"
      })
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterActivity, filterRating])

  const handleManualRefresh = async () => {
    await fetchData(true)
  }

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return "Never"

    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return format(date, "MMM d")
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'google':
        return 'bg-blue-100 text-blue-800'
      case 'trustpilot':
        return 'bg-green-100 text-green-800'
      case 'facebook':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFilteredData = () => {
    return data.filter(customer => {
      // Search filter
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)

      // Activity filter
      let matchesActivity = true
      if (filterActivity === "visited") {
        matchesActivity = customer.activity.totalPageVisits > 0
      } else if (filterActivity === "rated") {
        matchesActivity = customer.activity.lastStarRating !== null
      } else if (filterActivity === "clicked") {
        matchesActivity = customer.activity.redirectPlatforms.length > 0
      } else if (filterActivity === "no-activity") {
        matchesActivity = !customer.activity.hasActivity
      }

      // Rating filter
      let matchesRating = true
      if (filterRating !== "all") {
        matchesRating = customer.activity.lastStarRating?.toString() === filterRating
      }

      return matchesSearch && matchesActivity && matchesRating
    })
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">No rating</span>

    return (
      <div className="flex items-center space-x-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const filteredData = getFilteredData()

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Customer Name,Email,Phone,Type,Page Visits,Last Visit,Star Rating,Rating Date,Platform Clicks,Last Platform,Total Reviews\n" +
      filteredData
        .map((customer) =>
          `"${customer.name}","${customer.email || ''}","${customer.phone || ''}","${customer.type}",${customer.activity.totalPageVisits},"${customer.activity.lastPageVisit ? formatTimeAgo(customer.activity.lastPageVisit) : 'Never'}",${customer.activity.lastStarRating || ''},"${customer.activity.lastStarSelection ? formatTimeAgo(customer.activity.lastStarSelection) : ''}","${customer.activity.redirectPlatforms.join(', ')}","${customer.activity.lastPlatformRedirect?.platform || ''}",${customer.totalReviews}`
        )
        .join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `customer_activity_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Export Successful",
      description: `${filteredData.length} records exported successfully!`
    })
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Reviews
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <UpgradeProDialog>
            <Button
              variant="outline"
              className="rounded-full gap-2 bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100 shadow-sm"
            >
              <Crown className="h-4 w-4" />
              Try Pro for free
            </Button>
          </UpgradeProDialog>
          <Button
            variant="outline"
            className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="relative flex items-center justify-between rounded-xl bg-blue-600 p-6 text-white mb-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">Track detailed review analytics</h2>
          <p className="text-sm">Monitor customer interactions, ratings, and review submissions on Pro</p>
          <UpgradeProDialog>
            <Button className="mt-4 w-fit rounded-full bg-black px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700">
              <Zap className="mr-2 h-5 w-5" />
              Try it for free
            </Button>
          </UpgradeProDialog>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="p-6 rounded-xl shadow-sm bg-white dark:bg-gray-800">
        {/* Filter and Actions */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={filterActivity} onValueChange={setFilterActivity}>
            <SelectTrigger className="w-[150px] rounded-full">
              <SelectValue placeholder="Activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="visited">Visited Page</SelectItem>
              <SelectItem value="rated">Gave Rating</SelectItem>
              <SelectItem value="clicked">Clicked Platform</SelectItem>
              <SelectItem value="no-activity">No Activity</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[130px] rounded-full">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search customers..."
              className="pl-9 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold">{data.length}</p>
                </div>
                <MousePointer className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">With Activity</p>
                  <p className="text-2xl font-bold">{data.filter(d => d.activity.hasActivity).length}</p>
                </div>
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Gave Rating</p>
                  <p className="text-2xl font-bold">{data.filter(d => d.activity.lastStarRating).length}</p>
                </div>
                <Star className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Platform Clicks</p>
                  <p className="text-2xl font-bold">{data.filter(d => d.activity.redirectPlatforms.length > 0).length}</p>
                </div>
                <ExternalLink className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-6 gap-4 py-3 text-sm font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
          <span className="col-span-2">Customer</span>
          <span>Page Visits</span>
          <span>Star Rating</span>
          <span>Platform Clicks</span>
          <span>Last Activity</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reviews...</p>
            </div>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 dark:text-gray-400">
            <Star className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold">No customer activity found</p>
            <p className="text-sm mt-1">Customer interactions will appear here once they engage with your review links</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedData.map((customer) => (
              <div key={customer.id} className="grid grid-cols-6 gap-4 py-4 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                {/* Customer Info */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.email || customer.phone}
                    </div>
                  </div>
                </div>

                {/* Page Visits */}
                <div className="flex items-center">
                  {customer.activity.totalPageVisits > 0 ? (
                    <div>
                      <Badge variant="outline">
                        {customer.activity.totalPageVisits} visit{customer.activity.totalPageVisits !== 1 ? 's' : ''}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(customer.activity.lastPageVisit)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>

                {/* Star Rating */}
                <div className="flex items-center">
                  {customer.activity.lastStarRating ? (
                    <div>
                      {renderStars(customer.activity.lastStarRating)}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(customer.activity.lastStarSelection)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>

                {/* Platform Clicks */}
                <div className="flex items-center">
                  {customer.activity.redirectPlatforms.length > 0 ? (
                    <div className="space-y-1">
                      {customer.activity.redirectPlatforms.map((platform) => (
                        <Badge
                          key={platform}
                          className={`${getPlatformColor(platform)} mr-1`}
                        >
                          {platform}
                        </Badge>
                      ))}
                      {customer.activity.lastPlatformRedirect && (
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(customer.activity.lastPlatformRedirect.timestamp)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </div>

                {/* Last Activity */}
                <div className="flex items-center text-gray-600">
                  {customer.activity.hasActivity
                    ? formatTimeAgo(
                        customer.activity.lastPlatformRedirect?.timestamp ||
                        customer.activity.lastStarSelection ||
                        customer.activity.lastPageVisit
                      )
                    : "No activity"
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-transparent"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Items per page</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[70px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  )
}