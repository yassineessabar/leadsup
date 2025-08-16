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
    validLeads: 0,
    activeCampaigns: 0,
    recentCampaigns: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [animatedStats, setAnimatedStats] = useState({
    totalLeads: 0,
    validLeads: 0,
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
      
      console.log('🔍 Fetching account-level SendGrid metrics...')
      
      // Build query parameters for last 30 days
      const params = new URLSearchParams({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        user_id: 'd155d4c2-2f06-45b7-9c90-905e3648e8df' // This should come from your auth system
      })
      
      const response = await fetch(`/api/analytics/account?${params.toString()}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn("Failed to fetch account metrics:", response.statusText)
        return
      }
      
      const result = await response.json()
      if (result.success && result.data?.metrics) {
        const metrics = result.data.metrics
        setSendGridMetrics(metrics)
        
        console.log('✅ Account-level SendGrid metrics loaded:', {
          source: result.data.source,
          period: result.data.period,
          emailsSent: metrics.emailsSent,
          openRate: metrics.openRate,
          clickRate: metrics.clickRate,
          deliveryRate: metrics.deliveryRate
        })
      } else {
        console.warn('⚠️ No SendGrid metrics available:', result)
      }
    } catch (error) {
      console.error('Error fetching SendGrid metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch total leads
      const { count: totalLeads } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch valid leads (with verified emails)
      const { count: validLeads } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('email_status', 'Unknown')
        .neq('email_status', '')
        .not('email_status', 'is', null)

      // Fetch active campaigns
      const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'Active')

      // Fetch recent campaigns
      const { data: recentCampaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const newStats = {
        totalLeads: totalLeads || 0,
        validLeads: validLeads || 0,
        activeCampaigns: activeCampaigns || 0,
        recentCampaigns: recentCampaigns || []
      }

      setStats(newStats)
      
      // Animate the numbers
      animateNumbers(newStats)
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
        validLeads: Math.floor(targetStats.validLeads * easeOutQuart),
        activeCampaigns: Math.floor(targetStats.activeCampaigns * easeOutQuart)
      })

      if (currentStep >= steps) {
        clearInterval(interval)
        setAnimatedStats({
          totalLeads: targetStats.totalLeads,
          validLeads: targetStats.validLeads,
          activeCampaigns: targetStats.activeCampaigns
        })
      }
    }, stepDuration)
  }

  // Enhanced chart data with more realistic progression
  const chartData = [
    { date: '01/08', imported: 0, verified: 0, enriched: 0, opens: 0, clicks: 0 },
    { date: '03/08', imported: 25, verified: 18, enriched: 12, opens: 8, clicks: 2 },
    { date: '05/08', imported: 45, verified: 32, enriched: 28, opens: 15, clicks: 4 },
    { date: '07/08', imported: 78, verified: 65, enriched: 52, opens: 28, clicks: 8 },
    { date: '09/08', imported: 102, verified: 89, enriched: 76, opens: 42, clicks: 12 },
    { date: '11/08', imported: 134, verified: 118, enriched: 98, opens: 58, clicks: 18 },
    { date: '13/08', imported: 156, verified: 142, enriched: 125, opens: 72, clicks: 24 },
    { date: '15/08', imported: 189, verified: 168, enriched: 151, opens: 89, clicks: 32 }
  ]

  // Pie chart data for lead sources
  const leadSourceData = [
    { name: 'LinkedIn', value: 45, color: '#6b7280' },
    { name: 'Email', value: 30, color: '#9ca3af' },
    { name: 'Website', value: 15, color: '#d1d5db' },
    { name: 'Referrals', value: 10, color: '#e5e7eb' }
  ]

  // Performance metrics with real SendGrid data
  const performanceMetrics = [
    { 
      title: 'Open Rate', 
      value: metricsLoading ? '...' : `${(sendGridMetrics?.openRate || 0).toFixed(1)}%`, 
      change: sendGridMetrics?.uniqueOpens ? `${sendGridMetrics.uniqueOpens} unique` : 'No data', 
      trend: 'up',
      icon: Eye,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      title: 'Click Rate', 
      value: metricsLoading ? '...' : `${(sendGridMetrics?.clickRate || 0).toFixed(1)}%`, 
      change: sendGridMetrics?.uniqueClicks ? `${sendGridMetrics.uniqueClicks} unique` : 'No data', 
      trend: 'up',
      icon: MousePointer,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    { 
      title: 'Delivery Rate', 
      value: metricsLoading ? '...' : `${(sendGridMetrics?.deliveryRate || 0).toFixed(1)}%`, 
      change: sendGridMetrics?.emailsBounced ? `${sendGridMetrics.emailsBounced} bounced` : 'No bounces', 
      trend: sendGridMetrics && sendGridMetrics.deliveryRate > 95 ? 'up' : 'down',
      icon: Target,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    { 
      title: 'Emails Sent', 
      value: metricsLoading ? '...' : `${(sendGridMetrics?.emailsSent || 0).toLocaleString()}`, 
      change: sendGridMetrics?.emailsDelivered ? `${sendGridMetrics.emailsDelivered} delivered` : 'No data', 
      trend: 'up',
      icon: Mail,
      color: 'violet',
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    }
  ]

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

            {/* Valid Leads Card */}
            <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Valid Leads</h3>
                    <p className="text-gray-500 text-sm">Verification rate</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-light text-gray-900">
                    {isLoading ? (
                      <span className="text-gray-400">...</span>
                    ) : (
                      animatedStats.validLeads
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
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <Card 
                  key={metric.title}
                  className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 ${metric.bgColor} rounded-2xl flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{metric.title}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-light text-gray-900">{metric.value}</p>
                      <span className="text-xs text-gray-400 font-medium">
                        {metric.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Analytics Chart */}
              <Card className="bg-white border border-gray-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Activity className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-gray-900">Lead Processing Analytics</h2>
                      <p className="text-gray-500 text-sm mt-1">Performance over the last 30 days</p>
                    </div>
                  </div>
                
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280" 
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="imported"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          name="Imported Leads"
                        />
                        <Line
                          type="monotone"
                          dataKey="verified"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          name="Verified Leads"
                        />
                        <Line
                          type="monotone"
                          dataKey="enriched"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          name="Enriched Leads"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              
              {/* Deliverability Score */}
              <Card className="bg-white border border-gray-100/50 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Deliverability Health</h3>
                      <p className="text-gray-500 text-sm mt-1">Email reputation score</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray="85, 100"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900">85%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Excellent
                    </Badge>
                    <p className="text-sm text-gray-600">
                      Your deliverability is performing well
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">IP Reputation</p>
                      <p className="font-semibold text-gray-900">Good</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Authentication</p>
                      <p className="font-semibold text-gray-900">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Brain className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">AI Insights</CardTitle>
                        <p className="text-gray-600 text-sm">Smart recommendations</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">Optimize Subject Lines</h4>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                            High Impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Your open rate could improve by 15% with shorter, more personalized subject lines.
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Keep under 50 characters</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Add company name for personalization</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">Perfect Timing</h4>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            Medium Impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Send emails on Tuesday-Thursday, 10-11 AM for best engagement.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-10 hover:bg-gray-50"
                    onClick={() => {
                      const event = new CustomEvent('tab-switched', { detail: 'leads' })
                      window.dispatchEvent(event)
                    }}
                  >
                    <Users className="w-4 h-4 mr-3 text-gray-600" />
                    Import CSV List
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-10 hover:bg-gray-50"
                    onClick={() => {
                      const event = new CustomEvent('tab-switched', { detail: 'campaigns-email' })
                      window.dispatchEvent(event)
                    }}
                  >
                    <Mail className="w-4 h-4 mr-3 text-gray-600" />
                    Create Template
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-10 hover:bg-gray-50"
                  >
                    <BarChart3 className="w-4 h-4 mr-3 text-gray-600" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}