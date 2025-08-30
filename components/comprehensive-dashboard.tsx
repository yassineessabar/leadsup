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
import { useI18n } from '@/hooks/use-i18n'
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
  const { t, ready } = useI18n()
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
      
      console.log('🔍 Checking for real email activity in inbox...')
      
      // First, check if user has any real emails in their inbox
      const inboxResponse = await fetch('/api/inbox/stats', {
        credentials: 'include'
      })
      
      if (!inboxResponse.ok) {
        console.warn('Failed to fetch inbox stats, skipping email metrics')
        setSendGridMetrics(null)
        setMetricsLoading(false)
        return
      }
      
      const inboxData = await inboxResponse.json()
      const hasRealEmails = inboxData.success && 
        inboxData.data?.summary?.total_messages > 0
      
      console.log('📊 Inbox stats:', {
        hasRealEmails,
        totalMessages: inboxData.data?.summary?.total_messages || 0,
        unreadMessages: inboxData.data?.summary?.unread_messages || 0
      })
      
      // Skip fake email check - always try to fetch SendGrid metrics
      console.log('📡 Proceeding to fetch SendGrid metrics...')
      
      // Always try to fetch SendGrid metrics, even if inbox appears empty
      // The inbox might be empty but SendGrid could still have sent emails
      console.log('📡 Attempting to fetch SendGrid metrics...')
      
      if (!hasRealEmails) {
        console.log('⚠️ No emails in inbox, but checking SendGrid API anyway...')
      } else {
        console.log('✅ Real emails found in inbox - fetching SendGrid metrics...')
      }
      
      // Build query parameters for last 30 days
      const params = new URLSearchParams({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        _t: Date.now(), // Cache buster
        debug: 'true' // Force debug mode
      })
      
      const response = await fetch(`/api/analytics/account?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.warn("Failed to fetch account metrics:", response.statusText)
        setSendGridMetrics(null)
        return
      }
      
      const result = await response.json()
      console.log('🔍 Full Analytics API response:', result)
      console.log('🔍 Analytics source used:', result.data?.source)
      console.log('🔍 Analytics debug info:', result.data?.debug)
      
      if (result.success && result.data?.metrics) {
        const metrics = result.data.metrics
        
        console.log('📊 Metrics data received:', metrics)
        
        // Only set metrics if there's actual email activity that matches inbox data
        if (metrics.emailsSent > 0) {
          console.log('✅ Real SendGrid metrics loaded:', {
            source: result.data.source,
            period: result.data.period,
            emailsSent: metrics.emailsSent,
            openRate: metrics.openRate,
            clickRate: metrics.clickRate,
            deliveryRate: metrics.deliveryRate
          })
          setSendGridMetrics(metrics)
        } else {
          console.log('⚠️ SendGrid reports no emails sent - showing no metrics')
          setSendGridMetrics(null)
        }
      } else {
        console.log('⚠️ No SendGrid metrics available:', result)
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

  // Response and meeting chart data - showing engagement metrics
  const responseAndMeetingData = [
    { date: '01/08', emailsSent: 0, responses: 0, meetings: 0 },
    { date: '03/08', emailsSent: 125, responses: 8, meetings: 3 },
    { date: '05/08', emailsSent: 280, responses: 22, meetings: 8 },
    { date: '07/08', emailsSent: 450, responses: 38, meetings: 15 },
    { date: '09/08', emailsSent: 620, responses: 55, meetings: 22 },
    { date: '11/08', emailsSent: 785, responses: 71, meetings: 28 },
    { date: '13/08', emailsSent: 950, responses: 89, meetings: 35 },
    { date: '15/08', emailsSent: 1120, responses: 108, meetings: 42 }
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

  // Wait for translations to be ready
  if (!ready) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
      <div className="relative space-y-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Minimal Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight mb-2">{t('dashboard.title')}</h1>
                <p className="text-gray-500 dark:text-gray-400 font-light">{t('dashboard.subtitle')}</p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-xl"
                  onClick={() => {
                    window.location.href = '/?tab=leads'
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t('dashboard.manageLeads')}
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300 rounded-xl"
                  onClick={() => {
                    const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                    window.dispatchEvent(event)
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('dashboard.newCampaign')}
                </Button>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Leads Card */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('dashboardStats.totalLeads')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboardStats.last30Days')}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900 dark:text-gray-100">
                    {isLoading ? (
                      <span className="text-gray-400 dark:text-gray-600">...</span>
                    ) : (
                      animatedStats.totalLeads.toLocaleString()
                    )}
                  </p>
                  <span className="text-sm text-gray-400 dark:text-gray-600 font-medium">
                    {t('dashboardStats.last30Days')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contacted Leads Card */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('dashboardStats.contactedLeads')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboardStats.outreachActivity')}</p>
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
                  <span className="text-sm text-gray-400 dark:text-gray-600 font-medium">
                    {t('dashboardStats.last30Days')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Active Campaigns Card */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('dashboardStats.activeCampaigns')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboardStats.runningSmoothly')}</p>
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
                  <span className="text-sm text-gray-400 dark:text-gray-600 font-medium">
                    {t('dashboardStats.activeNow')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Response Rate Card */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('dashboardStats.responseRate')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboardStats.engagementMetric')}</p>
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
                  <span className="text-sm text-gray-400 dark:text-gray-600 font-medium">
                    {t('dashboardStats.allTime')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Performance Metrics - Matching main dashboard card design */}
          {sendGridMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {performanceMetrics.map((metric, index) => {
                const Icon = metric.icon
                return (
                  <Card 
                    key={metric.title}
                    className="bg-white dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-3xl overflow-hidden"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className={`w-12 h-12 ${metric.bgColor} rounded-2xl flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{metric.title}</h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboardStats.last30Days')}</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-light text-gray-900 dark:text-gray-100">
                          {metric.value}
                        </p>
                        <span className="text-sm text-gray-400 dark:text-gray-600 font-medium">
                          {metric.change}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : metricsLoading ? (
            <div className="mb-8">
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3"></div>
                <div className="text-slate-500 dark:text-slate-400">Loading email metrics...</div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">{t('dashboardAnalytics.noEmailPerformanceData')}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    {t('dashboardAnalytics.campaignAnalyticsWillAppear')}
                  </p>
                  <Button 
                    className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl px-4 py-2 text-sm"
                    onClick={() => {
                      const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                      window.dispatchEvent(event)
                    }}
                  >
                    {t('dashboardAnalytics.createYourFirstCampaign')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Dashboard Layout - Full Width Focus */}
          <div className="space-y-8">
            
            {/* Response and Meeting Chart - HIDDEN per user request */}
            {false && sendGridMetrics && (
              <Card className="relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-3xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500 to-blue-600 rounded-full opacity-5 transform translate-x-20 -translate-y-20"></div>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-medium text-slate-900">Response & Meeting Tracker</h2>
                        <p className="text-slate-500 text-base font-normal mt-2">Email engagement and meeting conversion over 30 days</p>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-600 border-green-200 px-4 py-2 text-sm font-semibold">
                      Live Data
                    </Badge>
                  </div>
                
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={responseAndMeetingData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280" 
                          fontSize={14}
                          fontWeight={500}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={14}
                          fontWeight={500}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            padding: '16px'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="emailsSent"
                          stroke="#6b7280"
                          strokeWidth={3}
                          dot={{ fill: '#6b7280', strokeWidth: 2, r: 5 }}
                          name="Emails Sent"
                        />
                        <Line
                          type="monotone"
                          dataKey="responses"
                          stroke="#10b981"
                          strokeWidth={4}
                          dot={{ fill: '#10b981', strokeWidth: 3, r: 6 }}
                          name="Responses"
                        />
                        <Line
                          type="monotone"
                          dataKey="meetings"
                          stroke="#3b82f6"
                          strokeWidth={4}
                          dot={{ fill: '#3b82f6', strokeWidth: 3, r: 6 }}
                          name="Meetings Booked"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secondary Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* AI Insights - 2/3 Width */}
              <div className="lg:col-span-2">
                <Card className="relative overflow-hidden border-slate-200/60 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-3xl h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-100 dark:from-gray-700 to-slate-200 dark:to-gray-600 rounded-full opacity-30 transform translate-x-16 -translate-y-16"></div>
                  <CardContent className="p-8 h-full">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                          <Brain className="w-6 h-6 text-slate-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-medium text-slate-900 dark:text-gray-100">{t('dashboardAnalytics.aiPoweredInsights')}</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">{t('dashboardAnalytics.smartRecommendations')}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 font-normal px-4"
                      >
                        {t('dashboardAnalytics.viewAll')}
                      </Button>
                    </div>
                    
                    <div className="grid gap-6">
                      <div className="p-6 rounded-2xl border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-base font-medium text-slate-900">{t('dashboardAnalytics.optimizeSubjectLines')}</h4>
                              <Badge className="bg-slate-100 text-slate-700 border-none text-xs font-normal px-2 py-1">
                                {t('dashboardAnalytics.highImpact')}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                              {t('dashboardAnalytics.openRateImprovement')}
                            </p>
                            <ul className="text-sm text-slate-600 space-y-2">
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                                <span>{t('dashboardAnalytics.keepUnder50Characters')}</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                                <span>{t('dashboardAnalytics.addCompanyNamePersonalization')}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-base font-medium text-slate-900 dark:text-gray-100">{t('dashboardAnalytics.perfectTiming')}</h4>
                              <Badge className="bg-slate-100 text-slate-700 border-none text-xs font-normal px-2 py-1">
                                {t('dashboardAnalytics.mediumImpact')}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                              {t('dashboardAnalytics.bestEngagementTiming')}
                            </p>
                            <div className="text-sm text-slate-600 dark:text-gray-400">
                              <span className="inline-flex items-center gap-2">
                                <Star className="w-4 h-4 text-slate-500 dark:text-gray-500" />
                                {t('dashboardAnalytics.optimalTime')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Stats & Actions */}
              <div className="space-y-8">
                
                {/* Deliverability Health - Only show if user has email activity */}
                {sendGridMetrics ? (
                  <Card className="relative overflow-hidden border-slate-200/60 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-3xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full opacity-30 transform translate-x-12 -translate-y-12"></div>
                    <CardContent className="p-8">
                      <div className="text-center space-y-6">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto">
                          <ShieldCheck className="w-6 h-6 text-slate-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-medium text-slate-900 dark:text-gray-100">{t('dashboardAnalytics.deliverability')}</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">{t('dashboardAnalytics.emailHealthScore')}</p>
                        </div>
                        <div>
                          <div className="text-4xl font-light text-green-600 mb-3">{sendGridMetrics.deliveryRate.toFixed(0)}%</div>
                          <Badge className="bg-slate-100 text-slate-700 border-none text-sm font-normal px-3 py-1">
                            {sendGridMetrics.deliveryRate >= 95 ? 'Excellent' : sendGridMetrics.deliveryRate >= 85 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div className="text-center p-3 rounded-xl bg-slate-50/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Bounces</p>
                            <p className="text-sm font-medium text-slate-900">{sendGridMetrics.emailsBounced}</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-slate-50/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Delivered</p>
                            <p className="text-sm font-medium text-slate-900">{sendGridMetrics.emailsDelivered}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="relative overflow-hidden border-slate-200/60 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-3xl">
                    <CardContent className="p-8">
                      <div className="text-center space-y-6">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto">
                          <ShieldCheck className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-medium text-slate-900 dark:text-gray-100">{t('dashboardAnalytics.deliverability')}</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">{t('dashboardAnalytics.emailHealthScore')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">
                            {t('dashboardAnalytics.connectEmailAccountToSeeScore')}
                          </p>
                          <Button 
                            className="bg-slate-900 dark:bg-gray-100 hover:bg-slate-800 dark:hover:bg-gray-200 text-white dark:text-black rounded-xl px-4 py-2 text-sm"
                            onClick={() => {
                              const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                              window.dispatchEvent(event)
                            }}
                          >
                            {t('dashboardAnalytics.connectEmailAccount')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Start */}
                <Card className="relative overflow-hidden border-slate-200/60 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 rounded-3xl">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 dark:from-gray-700 to-slate-200 dark:to-gray-600 rounded-full opacity-30 transform translate-x-12 -translate-y-12"></div>
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto">
                        <Zap className="w-6 h-6 text-slate-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-900 dark:text-gray-100">{t('dashboardAnalytics.quickStart')}</h3>
                        <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">{t('dashboardAnalytics.getThingsDone')}</p>
                      </div>
                      <div className="space-y-3">
                        <button 
                          className="w-full rounded-xl h-12 text-sm border-none flex items-center justify-center gap-2 transition-colors"
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            border: 'none'
                          }}
                          onClick={() => {
                            window.location.href = '?tab=domain'
                          }}
                        >
                          <Shield className="w-4 h-4" style={{ color: '#ffffff' }} />
                          {t('dashboardAnalytics.addDomains')}
                        </button>
                        
                        <button 
                          className="w-full rounded-xl h-12 text-sm flex items-center justify-center gap-2 transition-colors"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            border: '1px solid #d1d5db'
                          }}
                          onClick={() => {
                            const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                            window.dispatchEvent(event)
                          }}
                        >
                          <Mail className="w-4 h-4" style={{ color: '#374151' }} />
                          {t('dashboardAnalytics.createCampaign')}
                        </button>
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