'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Mail, Users, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

interface AccountActivity {
  user_id: string
  user_email: string
  is_admin: boolean
  total_campaigns: number
  draft_campaigns: number
  active_campaigns: number
  scraping_in_progress: number
  scraping_completed: number
  total_contacts: number
  emails_sent_today: number
  sender_accounts_count: number
  last_activity: string | null
  sender_accounts_details: any[]
}

interface AutomationLog {
  id: string
  user_id: string
  campaign_id: string | null
  action_type: string
  action_details: any
  created_at: string
  campaigns?: {
    name: string
    status: string
  }
}

interface SenderHealth {
  email: string
  warmup_status: string
  stats: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    failed: number
  }
  metrics: {
    deliveryRate: string
    openRate: string
    bounceRate: string
    healthScore: string
  }
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<AccountActivity[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [senderHealth, setSenderHealth] = useState<SenderHealth[]>([])
  const [summary, setSummary] = useState({
    totalAccounts: 0,
    activeToday: 0,
    totalEmailsSentToday: 0,
    activeCampaigns: 0,
    totalCampaigns: 0
  })
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    try {
      console.log('🔍 Initializing admin panel...')
      
      // Use the same method as dashboard - fetch /api/auth/me
      const response = await fetch('/api/auth/me')
      
      if (!response.ok) {
        console.log('❌ Auth API failed:', response.status)
        setUser(null)
        setLoading(false)
        return
      }

      const authData = await response.json()
      console.log('✅ Auth API response:', authData)

      if (!authData.user) {
        console.log('❌ No user in auth response')
        setUser(null)
        setLoading(false)
        return
      }

      console.log('✅ User found via API:', authData.user.email)
      setUser(authData.user)
      
      // Try to fetch admin data, but don't fail if it doesn't work
      try {
        await fetchActivityData()
      } catch (error) {
        console.warn('Admin data fetch failed, showing basic view:', error)
      }
      
    } catch (error) {
      console.error('❌ Admin initialization error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/activity-summary')
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity data')
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('Admin Panel: Received', result.data.accounts?.length || 0, 'accounts from API')
        setAccounts(result.data.accounts || [])
        setLogs(result.data.recentLogs || [])
        setSenderHealth(result.data.senderHealthScores || [])
        setSummary(result.data.summary || {
          totalAccounts: 0,
          activeToday: 0,
          totalEmailsSentToday: 0,
          activeCampaigns: 0,
          totalCampaigns: 0
        })
      }
    } catch (error) {
      console.error('Error fetching activity data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchActivityData()
    setRefreshing(false)
  }

  const getHealthScoreColor = (score: string) => {
    const numScore = parseInt(score)
    if (numScore >= 80) return 'text-green-600'
    if (numScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'email_sent':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'email_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'scraping_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'scraping_started':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>You need to be signed in to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth/login'}
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-600">Signed in as: {user.email}</p>
          <p className="text-sm text-gray-500">User ID: {user.id}</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeToday} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEmailsSentToday}</div>
            <p className="text-xs text-muted-foreground">
              Sent across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeCampaigns} active of {summary.totalCampaigns} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operational</div>
            <p className="text-xs text-muted-foreground">
              All systems running
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Account Activity</TabsTrigger>
          <TabsTrigger value="sender-health">Sender Health</TabsTrigger>
          <TabsTrigger value="logs">Automation Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity Summary ({accounts.length} accounts)</CardTitle>
              <CardDescription>
                Overview of all account activities including scraping and email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Scraping</TableHead>
                    <TableHead>Emails Today</TableHead>
                    <TableHead>Sender Accounts</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account, index) => (
                    <TableRow key={`account-${account.user_id}-${index}`}>
                      <TableCell className="font-medium">{account.user_email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="outline">{account.total_campaigns} total</Badge>
                          {account.active_campaigns > 0 && (
                            <Badge variant="default">{account.active_campaigns} active</Badge>
                          )}
                          {account.draft_campaigns > 0 && (
                            <Badge variant="secondary">{account.draft_campaigns} draft</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{account.total_contacts}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {account.scraping_in_progress > 0 && (
                            <Badge variant="default" className="bg-yellow-500">
                              {account.scraping_in_progress} running
                            </Badge>
                          )}
                          {account.scraping_completed > 0 && (
                            <Badge variant="outline" className="text-green-600">
                              {account.scraping_completed} completed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.emails_sent_today > 0 ? 'default' : 'outline'}>
                          {account.emails_sent_today}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.sender_accounts_count}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(account.last_activity)}
                      </TableCell>
                      <TableCell>
                        {account.is_admin && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sender-health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sender Account Health</CardTitle>
              <CardDescription>
                Monitor email sender reputation and delivery metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender Email</TableHead>
                    <TableHead>Warmup Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Bounced</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Delivery Rate</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Health Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senderHealth.map((sender, index) => (
                    <TableRow key={`sender-${sender.email}-${index}`}>
                      <TableCell className="font-medium">{sender.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            sender.warmup_status === 'completed' ? 'default' : 
                            sender.warmup_status === 'in_progress' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {sender.warmup_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sender.stats.sent}</TableCell>
                      <TableCell>{sender.stats.delivered}</TableCell>
                      <TableCell>{sender.stats.opened}</TableCell>
                      <TableCell>
                        {sender.stats.bounced > 0 && (
                          <Badge variant="destructive">{sender.stats.bounced}</Badge>
                        )}
                        {sender.stats.bounced === 0 && '0'}
                      </TableCell>
                      <TableCell>
                        {sender.stats.failed > 0 && (
                          <Badge variant="destructive">{sender.stats.failed}</Badge>
                        )}
                        {sender.stats.failed === 0 && '0'}
                      </TableCell>
                      <TableCell>{sender.metrics.deliveryRate}%</TableCell>
                      <TableCell>{sender.metrics.openRate}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={parseInt(sender.metrics.healthScore)} className="w-20" />
                          <span className={`font-bold ${getHealthScoreColor(sender.metrics.healthScore)}`}>
                            {sender.metrics.healthScore}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Automation Logs</CardTitle>
              <CardDescription>
                Track all automation activities across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={`log-${log.id}-${index}`}>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionTypeIcon(log.action_type)}
                          <span className="text-sm">{log.action_type.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.campaigns?.name && (
                          <Badge variant="outline">{log.campaigns.name}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">
                        {JSON.stringify(log.action_details)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {log.user_id.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}