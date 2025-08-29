'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Flame, 
  Mail, 
  TrendingUp, 
  Eye,
  MousePointer,
  MessageSquare,
  Calendar,
  Activity,
  Pause,
  Play,
  Settings,
  CheckCircle2,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface WarmingSender {
  sender_email: string
  phase: number
  day_in_phase: number
  total_days: number
  daily_target: number
  emails_sent_today: number
  opens_today: number
  replies_today: number
  current_health_score: number
  target_health_score: number
  status: string
  progress_percentage: number
}

interface WarmingCampaign {
  id: string
  name: string
  status: string
  senders: WarmingSender[]
}

interface WarmingProgress {
  campaigns: WarmingCampaign[]
  summary: {
    totalCampaigns: number
    totalSenders: number
    activeWarmups: number
    totalEmailsSentToday: number
    totalOpensToday: number
    totalRepliesToday: number
    averageHealthScore: number
    openRate: number
    replyRate: number
  }
}

export default function WarmingDashboard() {
  const [warmingData, setWarmingData] = useState<WarmingProgress | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchWarmingProgress()
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchWarmingProgress, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchWarmingProgress = async () => {
    try {
      const response = await fetch('/api/warming/progress', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setWarmingData(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching warming progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSenderAction = async (campaignId: string, senderEmail: string, action: string, value?: any) => {
    setUpdating(`${campaignId}-${senderEmail}`)
    
    try {
      const response = await fetch('/api/warming/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignId,
          senderEmail,
          action,
          value
        })
      })
      
      if (response.ok) {
        await fetchWarmingProgress() // Refresh data
      }
    } catch (error) {
      console.error('Error updating warming settings:', error)
    } finally {
      setUpdating(null)
    }
  }

  const getPhaseInfo = (phase: number) => {
    switch (phase) {
      case 1:
        return { name: 'Foundation', color: 'bg-blue-100 text-blue-800', days: '1-7 days' }
      case 2:
        return { name: 'Engagement', color: 'bg-orange-100 text-orange-800', days: '8-21 days' }
      case 3:
        return { name: 'Scale Up', color: 'bg-green-100 text-green-800', days: '22-35 days' }
      default:
        return { name: 'Unknown', color: 'bg-gray-100 text-gray-800', days: '' }
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-500'
    return 'text-red-600'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!warmingData || warmingData.campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <Flame className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Active Auto Warm-ups</h2>
            <p className="text-gray-600 mb-6">
              Auto warm-up will activate automatically when you launch campaigns with low health score senders.
            </p>
            <Button 
              onClick={() => window.location.href = '/?tab=campaigns-email'}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Flame className="w-4 h-4 mr-2" />
              Go to Campaigns
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500" />
              Auto Warm-up Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Monitor your automated warm-up progress and sender health improvements</p>
          </div>
          <Button 
            onClick={fetchWarmingProgress}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Warmups</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {warmingData.summary.activeWarmups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Health Score</p>
                  <p className={`text-2xl font-bold ${getHealthScoreColor(warmingData.summary.averageHealthScore)}`}>
                    {warmingData.summary.averageHealthScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Emails Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {warmingData.summary.totalEmailsSentToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {warmingData.summary.openRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Cards */}
        <div className="space-y-6">
          {warmingData.campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{campaign.name}</CardTitle>
                    <CardDescription>
                      {campaign.senders.length} sender(s) warming up
                    </CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Sender Progress */}
                <div className="space-y-4">
                  {campaign.senders.map((sender) => {
                    const phaseInfo = getPhaseInfo(sender.phase)
                    const isUpdating = updating === `${campaign.id}-${sender.sender_email}`
                    
                    return (
                      <Card key={sender.sender_email} className="border border-gray-100">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <Mail className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{sender.sender_email}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className={phaseInfo.color}>
                                    Phase {sender.phase}: {phaseInfo.name}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    Day {sender.day_in_phase} • {phaseInfo.days}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(sender.status)}
                              {sender.status === 'active' && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Auto
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Health Score Progress</span>
                              <span>{sender.progress_percentage}%</span>
                            </div>
                            <Progress value={sender.progress_percentage} className="h-2" />
                          </div>

                          {/* Daily Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Target</p>
                              <p className="text-lg font-semibold text-gray-900">{sender.daily_target}</p>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600 uppercase tracking-wide">Sent</p>
                              <p className="text-lg font-semibold text-blue-900">{sender.emails_sent_today}</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-green-600 uppercase tracking-wide">Opens</p>
                              <p className="text-lg font-semibold text-green-900">{sender.opens_today}</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-purple-600 uppercase tracking-wide">Replies</p>
                              <p className="text-lg font-semibold text-purple-900">{sender.replies_today}</p>
                            </div>
                          </div>

                          {/* Health Score */}
                          <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Health Score</span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-lg font-bold ${getHealthScoreColor(sender.current_health_score)}`}>
                                  {sender.current_health_score}%
                                </span>
                                <span className="text-sm text-gray-500">
                                  / {sender.target_health_score}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}