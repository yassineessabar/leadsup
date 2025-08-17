'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Mail, 
  Target, 
  TrendingUp, 
  Shield, 
  ArrowUp, 
  ArrowDown,
  Brain,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MoreHorizontal,
  ArrowRight,
  Sparkles,
  Eye,
  MousePointer,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
// Remove direct import of SendGrid service since it's server-side only
// import { SendGridAnalyticsService, type SendGridMetrics } from "@/lib/sendgrid-analytics"

// Define metrics interface locally
interface SendGridMetrics {
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsBlocked: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
  unsubscribes: number
  spamReports: number
  deliveryRate: number
  bounceRate: number
  openRate: number
  clickRate: number
  unsubscribeRate: number
}

export function ComprehensiveDashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    contactedLeads: 0,
    activeCampaigns: 0,
    responseRate: '0%',
    recentCampaigns: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [animatedStats, setAnimatedStats] = useState({
    totalLeads: 0,
    contactedLeads: 0,
    activeCampaigns: 0
  })
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  
  // SendGrid metrics state
  const [sendGridMetrics, setSendGridMetrics] = useState<SendGridMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    fetchDashboardStats()
    fetchSendGridMetrics()
  }, [])

  const fetchSendGridMetrics = async () => {
    try {
      setMetricsLoading(true)
      
      console.log('🔍 Checking if user has any email activity...')
      
      // First, check if user has any active campaigns or email accounts
      const campaignsResponse = await fetch('/api/campaigns', {
        credentials: 'include'
      })
      
      if (!campaignsResponse.ok) {
        console.warn("Failed to fetch campaigns for metrics validation")
        setSendGridMetrics(null)
        return
      }
      
      const campaignsData = await campaignsResponse.json()
      const hasActiveCampaigns = campaignsData.success && campaignsData.data && campaignsData.data.length > 0
      
      if (!hasActiveCampaigns) {
        console.log('⚠️ No campaigns found - skipping SendGrid metrics fetch')
        setSendGridMetrics(null)
        return
      }
      
      // Build query parameters for last 30 days
      const params = new URLSearchParams({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      })
      
      const response = await fetch(`/api/analytics/account?${params.toString()}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn("Failed to fetch account metrics:", response.statusText)
        setSendGridMetrics(null)
        return
      }
      
      const result = await response.json()
      if (result.success && result.data?.metrics) {
        const metrics = result.data.metrics
        
        // Only set metrics if there's actual email activity
        if (metrics.emailsSent > 0) {
          setSendGridMetrics(metrics)
          console.log('✅ Real SendGrid metrics loaded:', {
            source: result.data.source,
            period: result.data.period,
            emailsSent: metrics.emailsSent,
            openRate: metrics.openRate,
            clickRate: metrics.clickRate,
            deliveryRate: metrics.deliveryRate
          })
        } else {
          console.log('⚠️ No email activity found - showing no metrics')
          setSendGridMetrics(null)
        }
      } else {
        console.warn('⚠️ No SendGrid metrics available:', result)
        setSendGridMetrics(null)
      }
    } catch (error) {
      console.error('Error fetching SendGrid metrics:', error)
      setSendGridMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      
      // Use dedicated dashboard stats API
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
        cache: 'no-cache'
      })
      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Dashboard stats failed:', result)
        return
      }
      
      // Fetch recent campaigns separately
      const campaignsResponse = await fetch('/api/campaigns', {
        credentials: 'include'
      })
      const campaignsData = await campaignsResponse.json()
      
      const recentCampaigns = campaignsData.success ? campaignsData.data.slice(0, 5) : []

      const newStats = {
        totalLeads: result.data.totalLeads,
        contactedLeads: result.data.contactedLeads,
        activeCampaigns: result.data.activeCampaigns,
        responseRate: result.data.responseRate,
        recentCampaigns: recentCampaigns
      }

      setStats(newStats)
      
      // Animate the numbers
      animateNumbers(newStats)
      
      console.log('✅ Comprehensive dashboard stats loaded:', result.data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Animate numbers counting up
  const animateNumbers = (targetStats: any) => {
    const duration = 1500
    const steps = 60
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)

      setAnimatedStats({
        totalLeads: Math.floor(targetStats.totalLeads * easeOutQuart),
        contactedLeads: Math.floor(targetStats.contactedLeads * easeOutQuart),
        activeCampaigns: Math.floor(targetStats.activeCampaigns * easeOutQuart)
      })

      if (currentStep >= steps) {
        clearInterval(interval)
        setAnimatedStats({
          totalLeads: targetStats.totalLeads,
          contactedLeads: targetStats.contactedLeads,
          activeCampaigns: targetStats.activeCampaigns
        })
      }
    }, stepDuration)
  }

  // Revenue impact chart data - showing business value
  const revenueImpactData = [
    { date: '01/08', emailsSent: 0, responses: 0, meetings: 0, deals: 0, revenue: 0 },
    { date: '03/08', emailsSent: 125, responses: 8, meetings: 3, deals: 1, revenue: 5000 },
    { date: '05/08', emailsSent: 280, responses: 22, meetings: 8, deals: 2, revenue: 15000 },
    { date: '07/08', emailsSent: 450, responses: 38, meetings: 15, deals: 4, revenue: 32000 },
    { date: '09/08', emailsSent: 620, responses: 55, meetings: 22, deals: 6, revenue: 58000 },
    { date: '11/08', emailsSent: 785, responses: 71, meetings: 28, deals: 8, revenue: 89000 },
    { date: '13/08', emailsSent: 950, responses: 89, meetings: 35, deals: 11, revenue: 125000 },
    { date: '15/08', emailsSent: 1120, responses: 108, meetings: 42, deals: 14, revenue: 168000 }
  ]

  // Pie chart data for lead sources
  const leadSourceData = [
    { name: 'LinkedIn', value: 45, color: '#6b7280' },
    { name: 'Email', value: 30, color: '#9ca3af' },
    { name: 'Website', value: 15, color: '#d1d5db' },
    { name: 'Referrals', value: 10, color: '#e5e7eb' }
  ]

  // Performance metrics with real SendGrid data - only show if we have actual email activity
  const performanceMetrics = sendGridMetrics ? [
    { 
      title: 'Open Rate', 
      value: `${sendGridMetrics.openRate.toFixed(1)}%`, 
      change: `${sendGridMetrics.uniqueOpens} unique opens`, 
      trend: 'up',
      icon: Eye,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      title: 'Click Rate', 
      value: `${sendGridMetrics.clickRate.toFixed(1)}%`, 
      change: `${sendGridMetrics.uniqueClicks} unique clicks`, 
      trend: 'up',
      icon: MousePointer,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    { 
      title: 'Delivery Rate', 
      value: `${sendGridMetrics.deliveryRate.toFixed(1)}%`, 
      change: sendGridMetrics.emailsBounced > 0 ? `${sendGridMetrics.emailsBounced} bounced` : 'No bounces', 
      trend: sendGridMetrics.deliveryRate > 95 ? 'up' : 'down',
      icon: Target,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    { 
      title: 'Emails Sent', 
      value: sendGridMetrics.emailsSent.toLocaleString(), 
      change: `${sendGridMetrics.emailsDelivered} delivered`, 
      trend: 'up',
      icon: Mail,
      color: 'violet',
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    }
  ] : []

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="relative space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Minimal Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Dashboard</h1>
                <p className="text-gray-500 font-light">Your campaign overview and performance metrics</p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300"
                  onClick={() => {
                    const event = new CustomEvent('tab-switched', { detail: 'leads' })
                    window.dispatchEvent(event)
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Leads
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300"
                  onClick={() => {
                    const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                    window.dispatchEvent(event)
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Leads Card */}
            <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Total Leads</h3>
                    <p className="text-gray-500 text-sm">Last 30 days</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    {isLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      animatedStats.totalLeads.toLocaleString()
                    )}
                  </p>
                  <span className="text-sm text-gray-400 font-medium">
                    +12.5%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contacted Leads Card */}
            <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Contacted Leads</h3>
                    <p className="text-gray-500 text-sm">Outreach activity</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    {isLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      animatedStats.contactedLeads
                    )}
                  </p>
                  <span className="text-sm text-gray-400 font-medium">
                    +2.1%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Active Campaigns Card */}
            <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Active Campaigns</h3>
                    <p className="text-gray-500 text-sm">Running smoothly</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    {isLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      animatedStats.activeCampaigns
                    )}
                  </p>
                  <span className="text-sm text-gray-400 font-medium">
                    +2
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Response Rate Card */}
            <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Response Rate</h3>
                    <p className="text-gray-500 text-sm">Engagement metric</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    {isLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      stats.responseRate
                    )}
                  </p>
                  <span className="text-sm text-gray-400 font-medium">
                    +1.2%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Performance Metrics - Only show if user has email activity */}
          {sendGridMetrics ? (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Email Performance</h3>
                  <p className="text-slate-500 text-sm">SendGrid analytics from real campaigns</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {performanceMetrics.map((metric, index) => {
                  const Icon = metric.icon
                  return (
                    <Card 
                      key={metric.title}
                      className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">{metric.title}</p>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <p className="text-xl font-semibold text-slate-900">{metric.value}</p>
                          <span className="text-xs text-slate-500">
                            {metric.change}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : metricsLoading ? (
            <div className="mb-8">
              <div className="flex items-center justify-center py-8">
                <div className="text-slate-500">Loading email metrics...</div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Email Activity Yet</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Email performance metrics will appear here once you start sending campaigns.
                  </p>
                  <Button 
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm"
                    onClick={() => {
                      const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                      window.dispatchEvent(event)
                    }}
                  >
                    Create Your First Campaign
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Dashboard Layout - Sleek & Minimal */}
          <div className="space-y-6">
            
            {/* Revenue Impact Chart - Clean Hero */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Revenue Impact</h2>
                      <p className="text-slate-500 text-sm">Last 30 days performance</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                    Live
                  </div>
                </div>
              
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueImpactData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="revenue"
                        orientation="right"
                        stroke="#94a3b8" 
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => {
                          if (name === 'Revenue ($)') {
                            return [`$${value.toLocaleString()}`, name]
                          }
                          return [value, name]
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="responses"
                        stroke="#64748b"
                        strokeWidth={2}
                        dot={false}
                        name="Responses"
                      />
                      <Line
                        type="monotone"
                        dataKey="meetings"
                        stroke="#475569"
                        strokeWidth={2}
                        dot={false}
                        name="Meetings"
                      />
                      <Line
                        type="monotone"
                        dataKey="deals"
                        stroke="#334155"
                        strokeWidth={2}
                        dot={false}
                        name="Deals"
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0f172a"
                        strokeWidth={3}
                        dot={false}
                        name="Revenue ($)"
                        yAxisId="revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Content Grid - Balanced Layout */}
            <div className="grid lg:grid-cols-5 gap-6">
              
              {/* AI Insights - Clean & Minimal */}
              <div className="lg:col-span-3">
                <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Brain className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
                          <p className="text-slate-500 text-sm">AI recommendations</p>
                        </div>
                      </div>
                      <button className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        View all
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl border border-slate-200/60 hover:bg-slate-50/50 transition-colors">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-slate-900">Subject Line Optimization</h4>
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                High Impact
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">
                              Improve open rates by 15% with shorter, personalized subject lines.
                            </p>
                            <ul className="text-sm text-slate-600 space-y-1">
                              <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                Keep under 50 characters
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                Add company name
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200/60 hover:bg-slate-50/50 transition-colors">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-slate-900">Send Time Optimization</h4>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                Medium Impact
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              Best engagement: Tuesday-Thursday, 10-11 AM
                            </p>
                            <div className="text-sm text-slate-500">
                              Optimal: 10:30 AM EST
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Minimal Stats */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Deliverability - Compact */}
                <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Deliverability</h3>
                          <p className="text-xs text-slate-500">Email health</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">85%</div>
                        <div className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                          Excellent
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-xl bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">IP Rep</div>
                        <div className="text-sm font-medium text-slate-900">Good</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">Auth</div>
                        <div className="text-sm font-medium text-slate-900">Active</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions - Minimal */}
                <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">Quick Actions</h3>
                        <p className="text-xs text-slate-500">Common tasks</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-sm font-medium"
                        onClick={() => {
                          const event = new CustomEvent('tab-switched', { detail: 'leads' })
                          window.dispatchEvent(event)
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Import Leads
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="w-full border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl h-10 text-sm font-medium"
                        onClick={() => {
                          const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                          window.dispatchEvent(event)
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        New Campaign
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Stats - New Minimal Section */}
                <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">This Week</h3>
                        <p className="text-xs text-slate-500">Key metrics</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Open Rate</span>
                        <span className="text-sm font-medium text-slate-900">68%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Click Rate</span>
                        <span className="text-sm font-medium text-slate-900">42%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Response Rate</span>
                        <span className="text-sm font-medium text-slate-900">24%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}