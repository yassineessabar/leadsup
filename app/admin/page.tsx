'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Mail, Users, TrendingUp, LogOut } from 'lucide-react'
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

interface GitHubWorkflowRun {
  id: string
  status: string
  conclusion: string
  title: string
  branch: string
  event: string
  createdAt: string
  updatedAt: string
  duration: number | null
  emailResults: {
    success: boolean
    sent: number
    skipped: number
    errors: number
    total: number
    rawResponse: any
  } | null
  error?: string
}

interface GitHubAutomationData {
  workflow: {
    name: string
    description: string
    status: string
  }
  runs: GitHubWorkflowRun[]
  summary: {
    totalRuns: number
    recentRuns: number
    successfulRuns: number
    failedRuns: number
  }
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<AccountActivity[]>([])
  const [senderHealth, setSenderHealth] = useState<SenderHealth[]>([])
  const [githubAutomation, setGithubAutomation] = useState<GitHubAutomationData | null>(null)
  const [summary, setSummary] = useState({
    totalAccounts: 0,
    activeToday: 0,
    totalEmailsSentToday: 0,
    activeCampaigns: 0,
    totalCampaigns: 0
  })
  const [refreshing, setRefreshing] = useState(false)
  const [workflowManaging, setWorkflowManaging] = useState(false)
  const [managementMessage, setManagementMessage] = useState<string | null>(null)

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
        await Promise.all([
          fetchActivityData(),
          fetchGitHubAutomationData()
        ])
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

  const fetchGitHubAutomationData = async () => {
    try {
      console.log('Admin Panel: Fetching GitHub automation data...')
      const response = await fetch('/api/admin/github-automation')
      
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub automation data')
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('Admin Panel: Received', result.data.runs?.length || 0, 'workflow runs from GitHub')
        setGithubAutomation(result.data)
      }
    } catch (error) {
      console.error('Error fetching GitHub automation data:', error)
      setGithubAutomation(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchActivityData(),
      fetchGitHubAutomationData()
    ])
    setRefreshing(false)
  }

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect to login page
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if signOut fails
      window.location.href = '/auth/login'
    }
  }

  const handleWorkflowManagement = async (action: 'delete_all_runs' | 'pause_workflow' | 'resume_workflow') => {
    if (action === 'delete_all_runs') {
      const confirmed = window.confirm(
        'Are you sure you want to delete ALL workflow run history? This action cannot be undone and will permanently remove all 210+ workflow runs from GitHub.'
      )
      if (!confirmed) return
    } else if (action === 'pause_workflow') {
      const confirmed = window.confirm(
        'Are you sure you want to pause the Email Automation Processor? This will stop the scheduled automation from running until you resume it.'
      )
      if (!confirmed) return
    }

    try {
      setWorkflowManaging(true)
      setManagementMessage(null)
      
      console.log('Admin Panel: Managing workflow with action:', action)
      const response = await fetch('/api/admin/github-workflow-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('Admin Panel: Failed to parse JSON response:', jsonError)
        setManagementMessage(`❌ Server response error (${response.status})`)
        return
      }
      
      // Handle HTTP error status codes
      if (!response.ok && response.status >= 400) {
        let errorMessage = result?.error || `HTTP ${response.status} error`
        if (result?.suggestion) {
          errorMessage += ` (${result.suggestion})`
        }
        setManagementMessage(`❌ ${errorMessage}`)
        console.log('Admin Panel: HTTP error response - Status:', response.status, 'Result:', result ? JSON.stringify(result) : 'Empty response')
        return
      }
      
      // Ensure result is an object
      if (!result || typeof result !== 'object') {
        console.log('Admin Panel: Invalid result object - Type:', typeof result, 'Value:', result)
        setManagementMessage('❌ Invalid response from server')
        return
      }
      
      if (result.success === true) {
        setManagementMessage(`✅ ${result.message || 'Action completed successfully'}`)
        console.log('Admin Panel: Workflow management success:', result)
        
        // Immediately update the workflow status based on the action performed
        if (githubAutomation) {
          const updatedGithubAutomation = { ...githubAutomation }
          if (action === 'pause_workflow') {
            updatedGithubAutomation.workflow.status = 'disabled_manually'
          } else if (action === 'resume_workflow') {
            updatedGithubAutomation.workflow.status = 'active'
          }
          setGithubAutomation(updatedGithubAutomation)
        }
        
        // Also refresh GitHub automation data after successful action (for other data)
        await fetchGitHubAutomationData()
      } else {
        let errorMessage = result.error || 'Failed to execute action'
        if (result.suggestion) {
          errorMessage += ` - Use GitHub web interface instead`
        }
        setManagementMessage(`❌ ${errorMessage}`)
        console.log('Admin Panel: Workflow management error - Success:', result?.success, 'Message:', result?.error || 'No error message')
      }
    } catch (error) {
      console.log('Admin Panel: Workflow management request failed:', error?.message || 'Unknown error')
      setManagementMessage('❌ Failed to connect to workflow management API')
    } finally {
      setWorkflowManaging(false)
      
      // Clear message after 10 seconds
      setTimeout(() => {
        setManagementMessage(null)
      }, 10000)
    }
  }

  const getHealthScoreColor = (score: string) => {
    const numScore = parseInt(score)
    if (numScore >= 80) return 'text-green-600'
    if (numScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
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
          <TabsTrigger value="github">GitHub Automation</TabsTrigger>
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


        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Email Automation</CardTitle>
              <CardDescription>
                Monitor scheduled email processing automation from GitHub Actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {githubAutomation ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Total Runs</div>
                      <div className="text-2xl font-bold text-blue-900">{githubAutomation.summary.totalRuns}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Successful</div>
                      <div className="text-2xl font-bold text-green-900">{githubAutomation.summary.successfulRuns}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-600">Failed</div>
                      <div className="text-2xl font-bold text-red-900">{githubAutomation.summary.failedRuns}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">Showing Runs</div>
                      <div className="text-2xl font-bold text-gray-900">{githubAutomation.runs.length}</div>
                    </div>
                  </div>

                  {/* Workflow Management Actions */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Workflow Management</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge 
                          variant={githubAutomation.workflow.status === 'active' ? 'default' : 'secondary'}
                          className={`cursor-pointer ${
                            githubAutomation.workflow.status === 'active' 
                              ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                              : githubAutomation.workflow.status === 'disabled_manually'
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                          }`}
                          onClick={() => {
                            // Allow manual status toggle if API management fails
                            if (githubAutomation) {
                              const updatedGithubAutomation = { ...githubAutomation }
                              updatedGithubAutomation.workflow.status = 
                                githubAutomation.workflow.status === 'active' ? 'disabled_manually' : 'active'
                              setGithubAutomation(updatedGithubAutomation)
                              setManagementMessage('ℹ️ Status manually updated (use GitHub web interface to actually change workflow)')
                            }
                          }}
                          title="Click to manually toggle status display"
                        >
                          {githubAutomation.workflow.status === 'active' 
                            ? '✅ Enabled' 
                            : githubAutomation.workflow.status === 'disabled_manually'
                            ? '⏸️ Disabled'
                            : `❓ ${githubAutomation.workflow.status}`}
                        </Badge>
                      </div>
                    </div>
                    
                    {managementMessage && (
                      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm text-blue-800">{managementMessage}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleWorkflowManagement('pause_workflow')}
                        disabled={workflowManaging}
                        variant="outline"
                        className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      >
                        {workflowManaging ? '⏳ Processing...' : '⏸️ Pause Automation'}
                      </Button>
                      
                      <Button
                        onClick={() => handleWorkflowManagement('resume_workflow')}
                        disabled={workflowManaging}
                        variant="outline"
                        className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                      >
                        {workflowManaging ? '⏳ Processing...' : '▶️ Resume Automation'}
                      </Button>
                      
                      <Button
                        onClick={() => handleWorkflowManagement('delete_all_runs')}
                        disabled={workflowManaging}
                        variant="outline"
                        className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                      >
                        {workflowManaging ? '⏳ Deleting...' : '🗑️ Delete All Run History'}
                      </Button>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500">
                      <p><strong>Pause:</strong> Stops scheduled automation (can be resumed)</p>
                      <p><strong>Resume:</strong> Re-enables scheduled automation</p>
                      <p><strong>Delete History:</strong> Permanently removes all {githubAutomation.summary.totalRuns} workflow runs from GitHub</p>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 font-medium mb-2">Alternative: GitHub Web Interface</p>
                        <div className="space-y-1 text-blue-700">
                          <p>• <a href="https://github.com/yassineessabar/leadsup/actions/workflows/email-automation.yml" target="_blank" rel="noopener noreferrer" className="underline font-medium">Manage Email Automation Processor</a></p>
                          <p>• <a href="https://github.com/yassineessabar/leadsup/actions" target="_blank" rel="noopener noreferrer" className="underline">View all workflow runs</a></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All Workflow Runs */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">All Email Processing Runs ({githubAutomation.runs.length} total)</h3>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Email Results</TableHead>
                          <TableHead>Trigger</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {githubAutomation.runs.map((run, index) => (
                          <TableRow key={`github-run-${run.id}-${index}`}>
                            <TableCell className="text-sm">
                              {new Date(run.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  run.conclusion === 'success' ? 'default' : 
                                  run.conclusion === 'failure' ? 'destructive' : 
                                  'secondary'
                                }
                              >
                                {run.conclusion || run.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {run.duration ? `${run.duration}s` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {run.emailResults ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    ✅ {run.emailResults.success ? 'Success' : 'Failed'}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    📈 {run.emailResults.sent} sent, {run.emailResults.skipped} skipped, {run.emailResults.errors} errors
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Total: {run.emailResults.total}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No data</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{run.event}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading GitHub automation data...</p>
                  <p className="text-sm mt-2">
                    This shows recent runs of the Email Automation Processor workflow
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}