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
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    contactedLeads: 0,
    activeCampaigns: 0,
    recentCampaigns: []
  })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
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

      setStats({
        totalLeads: result.data.totalLeads,
        contactedLeads: result.data.contactedLeads,
        activeCampaigns: result.data.activeCampaigns,
        recentCampaigns: recentCampaigns
      })
      
      console.log('✅ Dashboard stats loaded:', result.data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  // Sample data for the chart
  const chartData = [
    { date: '17/07', imported: 0, verified: 0, enriched: 0 },
    { date: '19/07', imported: 0, verified: 0, enriched: 0 },
    { date: '21/07', imported: 0, verified: 0, enriched: 0 },
    { date: '23/07', imported: 0, verified: 0, enriched: 0 },
    { date: '25/07', imported: 0, verified: 0, enriched: 0 },
    { date: '27/07', imported: 0, verified: 0, enriched: 0 },
    { date: '29/07', imported: 0, verified: 0, enriched: 0 },
    { date: '31/07', imported: 0, verified: 0, enriched: 0 },
    { date: '02/08', imported: 0, verified: 0, enriched: 0 },
    { date: '04/08', imported: 0, verified: 0, enriched: 0 },
    { date: '06/08', imported: 0, verified: 0, enriched: 0 },
    { date: '08/08', imported: 0, verified: 0, enriched: 0 },
    { date: '10/08', imported: 0, verified: 0, enriched: 0 },
    { date: '12/08', imported: 0, verified: 0, enriched: 0 },
    { date: '14/08', imported: 150, verified: 2, enriched: 0 },
    { date: '15/08', imported: 0, verified: 0, enriched: 0 }
  ]

  return (
    <div className="p-6 md:p-8 space-y-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600 text-lg">Your prospecting overview</p>
          </div>
          <div className="flex gap-3">
            <Link href="/contacts">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25">
                <Users className="w-4 h-4 mr-2" />
                Manage Leads
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50">
                <Mail className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full opacity-5 transform translate-x-16 -translate-y-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardDescription className="text-sm font-medium text-slate-600">Total Leads</CardDescription>
              <div className="p-2 rounded-xl bg-blue-50">
                <Users className="w-4 h-4 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.totalLeads}</p>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  +12.5%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full opacity-5 transform translate-x-16 -translate-y-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardDescription className="text-sm font-medium text-slate-600">Contacted Leads</CardDescription>
              <div className="p-2 rounded-xl bg-emerald-50">
                <Mail className="w-4 h-4 text-emerald-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.contactedLeads}</p>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  +2.1%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full opacity-5 transform translate-x-16 -translate-y-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardDescription className="text-sm font-medium text-slate-600">Active Campaigns</CardDescription>
              <div className="p-2 rounded-xl bg-purple-50">
                <Target className="w-4 h-4 text-purple-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl md:text-3xl font-bold text-slate-900">{stats.activeCampaigns}</p>
                <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-none">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  +2
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Chart */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">
                  Processed Leads - Last 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="imported" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        name="Imported"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="verified" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        name="Verified"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="enriched" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        name="Enriched"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Campaigns */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-slate-900">Recent Campaigns</CardTitle>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentCampaigns.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No campaigns yet</p>
                  ) : (
                    stats.recentCampaigns.map((campaign: any) => (
                      <div 
                        key={campaign.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200/60 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                            <Badge 
                              variant={campaign.status === 'active' ? 'default' : 'secondary'}
                              className={campaign.status === 'active' 
                                ? 'bg-green-100 text-green-700 border-green-200 border' 
                                : 'bg-blue-100 text-blue-700 border-blue-200 border'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>0 prospects</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>0 sent</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>0% responses</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Deliverability Score */}
            <Card className="bg-green-50 border-green-200 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  Deliverability Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-green-600"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="85, 100"
                        fill="transparent"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-900">85%</span>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <Badge className="bg-green-100 text-green-800 border-none">Excellent</Badge>
                  <p className="text-sm text-slate-700 font-medium">
                    Your deliverability is optimal, keep it up!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">IP Reputation</p>
                    <p className="font-semibold text-slate-800">Good</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Authentication</p>
                    <p className="font-semibold text-slate-800">Configured</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Coaching */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Brain className="w-5 h-5 text-blue-600" />
                  AI Coaching
                </CardTitle>
                <Link href="/coaching">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200/60 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">Your open rate is declining</h4>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">
                            high
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          Your average open rate is 18%, 12 points below the industry average (30%).
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Test shorter subject lines (under 50 characters)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Personalize subjects with company name</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200/60 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">Improve your deliverability</h4>
                          <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                            critical
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          Your deliverability score dropped to 72%. 28% of emails aren't reaching inboxes.
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Clean your list of invalid emails</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>Reduce sending volume temporarily</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/contacts" className="block">
                  <Button variant="ghost" className="w-full justify-start text-blue-700 hover:bg-blue-100">
                    <Users className="w-4 h-4 mr-2" />
                    Import CSV List
                  </Button>
                </Link>
                <Link href="/templates" className="block">
                  <Button variant="ghost" className="w-full justify-start text-blue-700 hover:bg-blue-100">
                    <Mail className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </Link>
                <Link href="/analytics" className="block">
                  <Button variant="ghost" className="w-full justify-start text-blue-700 hover:bg-blue-100">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Analyze Performance
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}