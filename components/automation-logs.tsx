"use client"

import React, { useState, useEffect, useCallback } from "react"
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Filter, 
  Mail, 
  RefreshCw, 
  Search,
  XCircle,
  Download,
  ChevronDown,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Info,
  Play,
  Pause,
  Brain,
  Trash2,
  RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

interface CampaignSenderInfo {
  senderCount: number
  avgHealthScore: number
  senders: Array<{
    email: string
    healthScore: number
    isActive: boolean
  }>
}

interface AutomationLog {
  id: number
  run_id: string
  campaign_id: number | null
  contact_id: number | null
  sender_id: number | null
  log_type: string
  status: string
  message: string
  details: any
  sequence_step: number | null
  email_subject: string | null
  skip_reason: string | null
  execution_time_ms: number | null
  timezone: string | null
  created_at: string
  campaign?: { name: string }
  contact?: { 
    email: string; 
    first_name: string; 
    last_name: string;
  }
  sender?: { email: string }
  campaignSenderInfo?: CampaignSenderInfo | null
}

interface LogStats {
  sent: number
  skipped: number
  errors: number
  campaigns: number
  contacts: number
  senders: number
  avgHealthScore: number
}

export function AutomationLogs() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [stats, setStats] = useState<LogStats>({ sent: 0, skipped: 0, errors: 0, campaigns: 0, contacts: 0, senders: 0, avgHealthScore: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [runningTest, setRunningTest] = useState(false)
  const [clearingLogs, setClearingLogs] = useState(false)
  const [resettingSequences, setResettingSequences] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [logTypeFilter, setLogTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("24h")
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(logTypeFilter !== "all" && { type: logTypeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/automation/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setStats(data.data.stats)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast({
        title: "Error",
        description: "Failed to load automation logs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, logTypeFilter, statusFilter, searchTerm])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        setRefreshing(true)
        fetchLogs()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLogs, loading, refreshing])

  const runAutomationTest = async () => {
    setRunningTest(true)
    try {
      const response = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMode: true })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Test Run Complete",
          description: `Processed: ${data.stats.processed}, Sent: ${data.stats.sent}, Skipped: ${data.stats.skipped}`,
        })
        
        // Refresh logs to show test results
        setTimeout(() => fetchLogs(), 1000)
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Failed to run automation test",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error running test:", error)
      toast({
        title: "Test Failed",
        description: "Failed to run automation test",
        variant: "destructive"
      })
    } finally {
      setRunningTest(false)
    }
  }

  const clearAllLogs = async () => {
    // Confirmation dialog
    if (!confirm('Are you sure you want to clear ALL automation logs? This action cannot be undone.')) {
      return
    }

    setClearingLogs(true)
    try {
      const response = await fetch('/api/automation/clear-logs', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Logs Cleared",
          description: `Successfully cleared ${data.clearedCount} automation logs`,
        })
        
        // Refresh logs to show empty state
        setTimeout(() => fetchLogs(), 500)
      } else {
        toast({
          title: "Clear Failed",
          description: data.error || "Failed to clear automation logs",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error clearing logs:", error)
      toast({
        title: "Clear Failed",
        description: "Failed to clear automation logs",
        variant: "destructive"
      })
    } finally {
      setClearingLogs(false)
    }
  }

  const resetSequences = async () => {
    // Confirmation dialog
    if (!confirm('Are you sure you want to reset ALL contacts to sequence step 0? This will restart all email sequences.')) {
      return
    }

    setResettingSequences(true)
    try {
      const response = await fetch('/api/automation/reset-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Reset all campaigns
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Sequences Reset",
          description: `Successfully reset ${data.resetCount} contacts to sequence 0`,
        })
        
        // Refresh logs to show the reset action
        setTimeout(() => fetchLogs(), 1000)
      } else {
        toast({
          title: "Reset Failed",
          description: data.error || "Failed to reset sequences",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error resetting sequences:", error)
      toast({
        title: "Reset Failed",
        description: "Failed to reset sequences",
        variant: "destructive"
      })
    } finally {
      setResettingSequences(false)
    }
  }

  const getLogIcon = (logType: string, status: string) => {
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />
    if (status === 'skipped') return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    
    switch (logType) {
      case 'email_sent':
        return <Mail className="w-4 h-4 text-green-500" />
      case 'run_start':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'run_complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      success: "default",
      failed: "destructive",
      skipped: "secondary"
    }
    
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    // Parse the timestamp correctly - it might be missing timezone info
    const date = new Date(timestamp + (timestamp.includes('Z') || timestamp.includes('+') ? '' : 'Z'))
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Handle negative differences (future dates) or very small differences
    if (diff < 0 || diff < 1000) return "Just now"
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-gray-900">Automation Logs</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor email automation activity and performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              fetchLogs()
            }}
            disabled={refreshing}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetSequences}
            disabled={resettingSequences}
            className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            {resettingSequences ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Step 0
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAllLogs}
            disabled={clearingLogs}
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
          >
            {clearingLogs ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Logs
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={runAutomationTest}
            disabled={runningTest}
            className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {runningTest ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails Sent</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.sent.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Skipped</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.skipped.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.errors.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.sent > 0 
                    ? `${Math.round((stats.sent / (stats.sent + stats.errors)) * 100)}%`
                    : '0%'
                  }
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Second Row of Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Campaigns</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.campaigns.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Contacts</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.contacts.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Senders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.senders.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Health Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.avgHealthScore > 0 ? `${stats.avgHealthScore}%` : 'N/A'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.avgHealthScore >= 80 ? 'bg-green-100' : 
                stats.avgHealthScore >= 60 ? 'bg-yellow-100' : 
                'bg-red-100'
              }`}>
                <TrendingUp className={`w-5 h-5 ${
                  stats.avgHealthScore >= 80 ? 'text-green-600' : 
                  stats.avgHealthScore >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl border-gray-200"
              />
            </div>

            <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
              <SelectTrigger className="w-40 h-10 rounded-xl border-gray-200">
                <SelectValue placeholder="Log Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
                <SelectItem value="email_skipped">Email Skipped</SelectItem>
                <SelectItem value="email_failed">Email Failed</SelectItem>
                <SelectItem value="run_start">Run Start</SelectItem>
                <SelectItem value="run_complete">Run Complete</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-10 rounded-xl border-gray-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 h-10 rounded-xl border-gray-200">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-gray-100">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="font-medium">Time</TableHead>
                  <TableHead className="font-medium">Campaign</TableHead>
                  <TableHead className="font-medium">Campaign Senders</TableHead>
                  <TableHead className="font-medium">Contact</TableHead>
                  <TableHead className="font-medium">Timezone</TableHead>
                  <TableHead className="font-medium">Next Email</TableHead>
                  <TableHead className="font-medium">Message</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Brain className="w-5 h-5 animate-pulse text-blue-600" />
                        <span className="text-gray-500">Loading logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.log_type, log.status)}
                          <span className="text-sm font-medium capitalize">
                            {log.log_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.campaign?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.campaignSenderInfo ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">
                                {log.campaignSenderInfo.senderCount} sender{log.campaignSenderInfo.senderCount !== 1 ? 's' : ''}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.campaignSenderInfo.avgHealthScore >= 80 ? 'bg-green-100 text-green-700' : 
                                log.campaignSenderInfo.avgHealthScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-red-100 text-red-700'
                              }`}>
                                {log.campaignSenderInfo.avgHealthScore}% health
                              </div>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {log.campaignSenderInfo.senders.slice(0, 2).map(s => s.email).join(', ')}
                              {log.campaignSenderInfo.senders.length > 2 && ` +${log.campaignSenderInfo.senders.length - 2} more`}
                            </div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.contact ? (
                          <div>
                            <div className="font-medium">
                              {log.contact.first_name} {log.contact.last_name}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {log.contact.email}
                            </div>
                            {log.sequence_step && (
                              <div className="text-blue-600 text-xs mt-1">
                                Step {log.sequence_step}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.timezone || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        -
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm truncate">{log.message}</p>
                          {log.skip_reason && (
                            <p className="text-xs text-gray-500 mt-1">
                              Reason: {log.skip_reason.replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.execution_time_ms && (
                          <span className="text-xs text-gray-500">
                            {log.execution_time_ms}ms
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}