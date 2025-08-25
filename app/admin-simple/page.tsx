'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Mail, Users, TrendingUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SimpleAdminPanel() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>({
    accounts: [],
    logs: [],
    summary: { totalAccounts: 0, activeToday: 0, totalEmailsSentToday: 0, activeCampaigns: 0 }
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    try {
      // Get current user - simplified check
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!user) {
        // Just show a message instead of redirecting
        setUser(null)
        setLoading(false)
        return
      }

      setUser(user)
      
      // Try to fetch admin data, but don't fail if it doesn't work
      await fetchAdminData()
      
    } catch (error) {
      console.error('Admin init error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin/activity-summary')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } else {
        console.warn('Admin API not accessible, showing basic view')
      }
    } catch (error) {
      console.warn('Admin API error:', error)
    }
  }

  const handleRefresh = async () => {
    await fetchAdminData()
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
        </div>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
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
            <div className="text-2xl font-bold">{data.summary.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeToday} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Today</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalEmailsSentToday}</div>
            <p className="text-xs text-muted-foreground">
              Sent across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
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
          <TabsTrigger value="logs">Automation Logs</TabsTrigger>
          <TabsTrigger value="info">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity Summary</CardTitle>
              <CardDescription>
                Overview of all account activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Email</TableHead>
                      <TableHead>Campaigns</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Emails Today</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.accounts.map((account: any, index: number) => (
                      <TableRow key={account.user_id || index}>
                        <TableCell className="font-medium">{account.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.total_campaigns} total</Badge>
                        </TableCell>
                        <TableCell>{account.total_contacts}</TableCell>
                        <TableCell>
                          <Badge variant={account.emails_sent_today > 0 ? 'default' : 'outline'}>
                            {account.emails_sent_today}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {account.last_activity ? new Date(account.last_activity).toLocaleString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No account data available</p>
                  <p className="text-sm">This could mean:</p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Database migration hasn't been run</li>
                    <li>• Your account doesn't have admin permissions</li>
                    <li>• API endpoint is not accessible</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Automation Logs</CardTitle>
              <CardDescription>
                Track automation activities across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.logs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.slice(0, 20).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {JSON.stringify(log.action_details).substring(0, 100)}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No automation logs found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Current system status and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Authentication Status</h3>
                  <p className="text-sm text-gray-600">✅ Signed in as: {user.email}</p>
                  <p className="text-sm text-gray-600">🔑 User ID: {user.id}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Admin Panel Version</h3>
                  <p className="text-sm text-gray-600">Simplified Admin Panel v1.0</p>
                </div>

                <div>
                  <h3 className="font-medium">Database Status</h3>
                  <p className="text-sm text-gray-600">
                    {data.accounts.length > 0 ? '✅ Connected' : '⚠️ Limited access or not connected'}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Setup Instructions</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>1. Run the admin migration in Supabase SQL Editor</p>
                    <p>2. Set your account as admin with SQL:</p>
                    <code className="block bg-gray-100 p-2 rounded text-xs">
                      UPDATE profiles SET is_admin = true WHERE user_id = '{user.id}';
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}