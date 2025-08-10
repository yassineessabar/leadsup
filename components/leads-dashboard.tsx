"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share, ChevronDown, Info, MoreHorizontal, BarChart3, User, Pause, Play } from 'lucide-react'

interface Campaign {
  id: string | number
  name: string
  type: "Email" | "SMS"
  status: "Draft" | "Active" | "Paused" | "Completed"
  sent: number | null
  click: number | null
  replied: number | null
  opportunities: string | null
}

interface CampaignAnalytics {
  campaign: {
    id: string
    name: string
    type: string
    status: string
    created_at: string
  }
  metrics: {
    sequenceStarted: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }
}

export function LeadsDashboard() {
  const [activeTab, setActiveTab] = useState("campaign")
  const [showTooltip, setShowTooltip] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  
  // Aggregated metrics from all campaigns
  const [metricsData, setMetricsData] = useState([
    {
      title: "Total sent",
      value: "0",
      color: "bg-orange-500",
      icon: Info
    },
    {
      title: "Open rate",
      value: "0%",
      color: "bg-blue-500",
      icon: Info
    },
    {
      title: "Click rate",
      value: "0%",
      color: "bg-gray-800",
      icon: Info
    },
    {
      title: "Reply rate",
      value: "0%",
      color: "bg-[rgb(87,140,255)]",
      icon: Info
    },
    {
      title: "Opportunities",
      value: "0",
      subValue: "$0",
      color: "bg-green-500",
      icon: Info
    }
  ])

  // Fetch campaigns and their analytics
  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/campaigns")
      const result = await response.json()

      if (result.success && result.data) {
        setCampaigns(result.data)
        
        // Load analytics separately and lazily for better performance
        setTimeout(() => {
          fetchCampaignAnalytics(result.data)
        }, 100)
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignAnalytics = async (campaigns: Campaign[]) => {
    try {
      // Fetch analytics for each campaign in batches to avoid overwhelming the server
      const batchSize = 5
      const analyticsResults: (CampaignAnalytics | null)[] = []

      for (let i = 0; i < campaigns.length; i += batchSize) {
        const batch = campaigns.slice(i, i + batchSize)
        const batchPromises = batch.map(async (campaign: Campaign) => {
          try {
            const analyticsResponse = await fetch(`/api/campaigns/${campaign.id}/analytics`)
            const analyticsResult = await analyticsResponse.json()
            return analyticsResult.success ? analyticsResult.data : null
          } catch (error) {
            console.error(`Failed to fetch analytics for campaign ${campaign.id}:`, error)
            return null
          }
        })

        const batchResults = await Promise.all(batchPromises)
        analyticsResults.push(...batchResults)
      }

      const validAnalytics = analyticsResults.filter(Boolean) as CampaignAnalytics[]
      setCampaignAnalytics(validAnalytics)

      // Calculate aggregated metrics
      calculateAggregatedMetrics(validAnalytics)
    } catch (error) {
      console.error("Error fetching campaign analytics:", error)
    }
  }

  const calculateAggregatedMetrics = (analytics: CampaignAnalytics[]) => {
    let totalSent = 0
    let totalOpened = 0
    let totalClicked = 0
    let totalReplies = 0 // This would need to be added to analytics API

    analytics.forEach(data => {
      totalSent += data.metrics.sent || 0
      totalOpened += data.metrics.opened || 0
      totalClicked += data.metrics.clicked || 0
    })

    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
    const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0

    setMetricsData([
      {
        title: "Total sent",
        value: totalSent > 1000 ? `${(totalSent / 1000).toFixed(1)}K` : totalSent.toString(),
        color: "bg-orange-500",
        icon: Info
      },
      {
        title: "Open rate",
        value: `${openRate}%`,
        color: "bg-blue-500",
        icon: Info
      },
      {
        title: "Click rate",
        value: `${clickRate}%`,
        color: "bg-gray-800",
        icon: Info
      },
      {
        title: "Reply rate",
        value: `${replyRate}%`,
        color: "bg-[rgb(87,140,255)]",
        icon: Info
      },
      {
        title: "Opportunities",
        value: "0",
        subValue: "$0",
        color: "bg-green-500",
        icon: Info
      }
    ])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" className="text-gray-700 border-gray-300">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-32 border-gray-300">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="4weeks">
            <SelectTrigger className="w-40 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4weeks">Last 4 weeks</SelectItem>
              <SelectItem value="2weeks">Last 2 weeks</SelectItem>
              <SelectItem value="1week">Last week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metrics Cards - Single Row Full Width */}
        <div className="grid grid-cols-5 gap-4 w-full">
          {metricsData.map((metric, index) => (
            <Card key={index} className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${metric.color}`}></div>
                    <span className="text-sm text-gray-600">{metric.title}</span>
                  </div>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  {metric.subValue && (
                    <span className="text-sm text-gray-500 ml-2">| {metric.subValue}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Area */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Sent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-600">Total opens</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Unique opens</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                <span className="text-sm text-gray-600">Total replies</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-sm text-gray-400">Total clicks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-sm text-gray-400">Unique clicks</span>
              </div>
            </div>

            {/* Chart Container */}
            <div className="relative h-80">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-sm text-gray-500 pr-4">
                <span>1000</span>
                <span>800</span>
                <span>600</span>
                <span>400</span>
                <span>200</span>
                <span>0</span>
              </div>

              {/* Chart area */}
              <div className="ml-12 h-full relative">
                {/* SVG Chart */}
                <svg className="w-full h-full" viewBox="0 0 800 300">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="1" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 0 60 L 800 60" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid)" />

                  {/* Area charts */}
                  {/* Sent area (blue) */}
                  <path
                    d="M 0 300 L 480 240 L 640 60 L 800 60 L 800 300 Z"
                    fill="#3b82f6"
                    fillOpacity="0.6"
                  />
                  
                  {/* Total opens area (orange) */}
                  <path
                    d="M 0 300 L 480 270 L 640 120 L 800 120 L 800 300 Z"
                    fill="#f97316"
                    fillOpacity="0.7"
                  />
                  
                  {/* Unique opens area (green) */}
                  <path
                    d="M 0 300 L 480 285 L 640 135 L 800 135 L 800 300 Z"
                    fill="#22c55e"
                    fillOpacity="0.8"
                  />
                </svg>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-gray-500 pt-4">
                  <span>08 Jul</span>
                  <span>16 Jul</span>
                  <span>24 Jul</span>
                  <span>01 Aug</span>
                  <span>Tuesday, 05 Aug</span>
                </div>

                {/* Tooltip */}
                {showTooltip && (
                  <div className="absolute top-8 right-8 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-48">
                    <div className="font-medium text-gray-900 mb-3">Tuesday, 05 Aug</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-gray-600">Sent:</span>
                        </div>
                        <span className="text-sm font-medium">797</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-sm text-gray-600">Total opens:</span>
                        </div>
                        <span className="text-sm font-medium">510</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-sm text-gray-600">Unique opens:</span>
                        </div>
                        <span className="text-sm font-medium">447</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          <span className="text-sm text-gray-600">Total replies:</span>
                        </div>
                        <span className="text-sm font-medium">1</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex space-x-8 border-b border-gray-200">
          <button
            className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === "campaign"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("campaign")}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Campaign Analytics</span>
          </button>
          <button
            className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === "account"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("account")}
          >
            <User className="w-4 h-4" />
            <span>Account Analytics</span>
          </button>
        </div>

        {/* Campaign Analytics Table */}
        {activeTab === "campaign" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Campaign analytics</h2>
            
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sequence started
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opened
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Replied
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opportunities
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            Loading campaigns...
                          </td>
                        </tr>
                      ) : campaignAnalytics.length > 0 ? (
                        campaignAnalytics.map((analytics) => (
                          <tr key={analytics.campaign.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {analytics.campaign.name}
                                </span>
                                <Badge className={`text-xs ${
                                  analytics.campaign.status === "Active" 
                                    ? "bg-green-100 text-green-800" 
                                    : analytics.campaign.status === "Draft"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {analytics.campaign.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {analytics.metrics.sequenceStarted || 0}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {analytics.metrics.opened || 0} | {analytics.metrics.openRate || 0}%
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {analytics.metrics.clicked || 0} | {analytics.metrics.clickRate || 0}%
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              0
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            No campaigns found. Create your first campaign to see analytics.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}