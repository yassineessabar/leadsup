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
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

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
        .eq('email_verified', true)

      // Fetch active campaigns
      const { count: activeCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')

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
    { name: 'LinkedIn', value: 45, color: '#0077B5' },
    { name: 'Email', value: 30, color: '#34D399' },
    { name: 'Website', value: 15, color: '#F59E0B' },
    { name: 'Referrals', value: 10, color: '#8B5CF6' }
  ]

  // Performance metrics
  const performanceMetrics = [
    { 
      title: 'Open Rate', 
      value: '24.8%', 
      change: '+3.2%', 
      trend: 'up',
      icon: Eye,
      color: 'emerald'
    },
    { 
      title: 'Click Rate', 
      value: '6.4%', 
      change: '+1.1%', 
      trend: 'up',
      icon: MousePointer,
      color: 'blue'
    },
    { 
      title: 'Response Rate', 
      value: '12.1%', 
      change: '-0.5%', 
      trend: 'down',
      icon: Activity,
      color: 'orange'
    },
    { 
      title: 'Conversion Rate', 
      value: '2.8%', 
      change: '+0.8%', 
      trend: 'up',
      icon: Target,
      color: 'purple'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="relative space-y-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Clean Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                </div>
                <p className="text-gray-600">Your prospecting overview</p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  className="border-gray-300 hover:bg-gray-50"
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

          {/* Clean Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Total Leads Card */}
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <CardDescription className="text-sm font-medium text-gray-600">
                      Total Leads
                    </CardDescription>
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        animatedStats.totalLeads.toLocaleString()
                      )}
                    </p>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +12.5%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">Last 30 days</p>
                </div>
              </CardContent>
            </Card>

            {/* Valid Leads Card */}
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <CardDescription className="text-sm font-medium text-gray-600">
                      Valid Leads
                    </CardDescription>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        stats.totalLeads > 0 ? `${((animatedStats.validLeads / stats.totalLeads) * 100).toFixed(1)}%` : '0%'
                      )}
                    </p>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +2.1%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">Verification rate</p>
                </div>
              </CardContent>
            </Card>

            {/* Active Campaigns Card */}
            <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <CardDescription className="text-sm font-medium text-gray-600">
                      Active Campaigns
                    </CardDescription>
                  </div>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {isLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : (
                        animatedStats.activeCampaigns
                      )}
                    </p>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +2
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">Running smoothly</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <Card 
                  key={metric.title}
                  className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <Badge 
                        variant="secondary"
                        className={`text-xs ${
                          metric.trend === 'up' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {metric.trend === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {metric.change}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900 mb-1">{metric.value}</p>
                      <p className="text-sm text-gray-600">{metric.title}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Clean Area Chart */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          Lead Processing Analytics
                        </CardTitle>
                        <p className="text-gray-600 text-sm">Performance over the last 30 days</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +24.3%
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
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
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
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
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    Deliverability Health
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6">
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