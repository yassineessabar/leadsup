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
  RotateCcw,
  Github,
  Server,
  Zap,
  Database,
  Timer,
  ExternalLink,
  GitBranch,
  User,
  Thermometer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { deriveTimezoneFromLocation, getCurrentTimeInTimezone, getBusinessHoursStatus } from "@/lib/timezone-utils"

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
    timezone?: string;
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

interface GitHubWorkflowRun {
  id: number
  name: string
  display_title: string
  status: string
  conclusion: string
  created_at: string
  updated_at: string
  head_branch: string
  head_sha: string
  actor: {
    login: string
    avatar_url: string
  }
  jobs: Array<{
    job_id: number
    job_name: string
    job_status: string
    job_conclusion: string
    job_started_at: string
    job_completed_at: string
    job_duration: number | null
    runner_name: string
    automation_logs: Array<{
      step_name: string
      status: string
      conclusion: string
      started_at: string
      completed_at: string
      duration: number | null
      job_name: string
    }>
  }>
  total_jobs: number
  successful_jobs: number
  failed_jobs: number
  email_metrics: {
    processed: number
    sent: number
    skipped: number
    errors: number
  } | null
  workflow_duration: number | null
}

interface GitHubStats {
  total_runs: number
  successful_runs: number
  failed_runs: number
  in_progress_runs: number
  total_jobs: number
  avg_duration: number
  total_emails_processed: number
  total_emails_sent: number
  total_emails_skipped: number
  total_errors: number
}

export function AutomationLogs() {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [stats, setStats] = useState<LogStats>({ sent: 0, skipped: 0, errors: 0, campaigns: 0, contacts: 0, senders: 0, avgHealthScore: 0 })
  const [githubRuns, setGithubRuns] = useState<GitHubWorkflowRun[]>([])
  const [githubStats, setGithubStats] = useState<GitHubStats>({ 
    total_runs: 0, successful_runs: 0, failed_runs: 0, in_progress_runs: 0, 
    total_jobs: 0, avg_duration: 0, total_emails_processed: 0, 
    total_emails_sent: 0, total_emails_skipped: 0, total_errors: 0 
  })
  const [loading, setLoading] = useState(true)
  const [githubLoading, setGithubLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [runningTest, setRunningTest] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(true) // Toggle for Test/Live mode
  const [includeUnhealthy, setIncludeUnhealthy] = useState(false) // Toggle for including unhealthy senders
  const [clearingLogs, setClearingLogs] = useState(false)
  const [resettingSequences, setResettingSequences] = useState(false)
  const [activeTab, setActiveTab] = useState("application") // application | emails | github
  const [emailTypeFilter, setEmailTypeFilter] = useState("all") // all | warmup | sequence
  const [emailDetails, setEmailDetails] = useState<any[]>([])
  const [emailStats, setEmailStats] = useState<any>({})
  const [emailLoading, setEmailLoading] = useState(true)
  
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

  const fetchGithubLogs = useCallback(async () => {
    setGithubLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(statusFilter !== "all" && { status: statusFilter })
      })

      const response = await fetch(`/api/automation/github-logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setGithubRuns(data.data.runs)
        setGithubStats(data.data.stats)
      } else {
        console.error("GitHub logs error:", data.error)
      }
    } catch (error) {
      console.error("Error fetching GitHub logs:", error)
    } finally {
      setGithubLoading(false)
    }
  }, [page, statusFilter])

  const fetchEmailDetails = useCallback(async () => {
    setEmailLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(emailTypeFilter !== "all" && { type: emailTypeFilter })
      })

      const response = await fetch(`/api/automation/email-details?${params}`)
      const data = await response.json()

      if (data.success) {
        setEmailDetails(data.data.emails)
        setEmailStats(data.data.stats)
      } else {
        console.error("Email details error:", data.error)
      }
    } catch (error) {
      console.error("Error fetching email details:", error)
    } finally {
      setEmailLoading(false)
    }
  }, [page, emailTypeFilter])

  useEffect(() => {
    fetchLogs()
    fetchGithubLogs()
    fetchEmailDetails()
  }, [fetchLogs, fetchGithubLogs, fetchEmailDetails])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing && !githubLoading && !emailLoading) {
        setRefreshing(true)
        fetchLogs()
        fetchGithubLogs()
        fetchEmailDetails()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLogs, fetchGithubLogs, fetchEmailDetails, loading, refreshing, githubLoading, emailLoading])

  const runAutomationTest = async () => {
    setRunningTest(true)
    try {
      const response = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testMode: !isLiveMode,
          forceUnhealthySenders: includeUnhealthy
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Automation Run Complete",
          description: `${isLiveMode ? 'Real emails sent' : 'Test mode - simulated'}${includeUnhealthy ? ' (including unhealthy senders)' : ''} - Processed: ${data.stats.processed}, Sent: ${data.stats.sent}, Skipped: ${data.stats.skipped}`,
        })
        
        // Refresh logs to show automation results
        setTimeout(() => fetchLogs(), 1000)
      } else {
        toast({
          title: "Automation Failed",
          description: data.error || "Failed to run automation",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error running automation:", error)
      toast({
        title: "Automation Failed", 
        description: "Failed to run automation",
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-light text-gray-900">Automation Logs</h2>
            <p className="text-sm text-gray-600 mt-1">Monitor email automation activity and performance</p>
          </div>
          
            <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              fetchLogs()
              fetchGithubLogs()
              fetchEmailDetails()
            }}
            disabled={refreshing || githubLoading || emailLoading}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing || githubLoading || emailLoading ? 'animate-spin' : ''}`} />
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
            className={`rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 ${
              includeUnhealthy ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : ''
            }`}
          >
            {runningTest ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {includeUnhealthy ? 'Run All Accounts' : 'Run Now'}
              </>
            )}
          </Button>
        </div>
        
        {/* Control Toggles Row */}
        <div className="flex items-center justify-between bg-gray-50/50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-6">
            {/* Test/Live Mode Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${!isLiveMode ? 'text-blue-600' : 'text-gray-500'}`}>
                TEST
              </span>
              <Switch
                checked={isLiveMode}
                onCheckedChange={setIsLiveMode}
                className="data-[state=checked]:bg-green-600"
              />
              <span className={`text-xs font-medium ${isLiveMode ? 'text-green-600' : 'text-gray-500'}`}>
                LIVE
              </span>
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                isLiveMode 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {isLiveMode ? '🟢 Real' : '🔵 Test'}
              </div>
            </div>

            {/* Include Unhealthy Senders Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${!includeUnhealthy ? 'text-gray-500' : 'text-orange-600'}`}>
                Healthy
              </span>
              <Switch
                checked={includeUnhealthy}
                onCheckedChange={setIncludeUnhealthy}
                className="data-[state=checked]:bg-orange-600"
              />
              <span className={`text-xs font-medium ${includeUnhealthy ? 'text-orange-600' : 'text-gray-500'}`}>
                All
              </span>
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                includeUnhealthy 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {includeUnhealthy ? '⚠️ All' : '✅ Healthy'}
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Mode: {isLiveMode ? 'Live' : 'Test'} • Accounts: {includeUnhealthy ? 'All (including unhealthy)' : 'Healthy only'}
          </div>
        </div>
      </div>

      {/* Tabs for Application vs GitHub Logs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-2xl mb-6">
          <TabsTrigger value="application" className="rounded-xl">
            <Database className="w-4 h-4 mr-2" />
            Application Logs
          </TabsTrigger>
          <TabsTrigger value="emails" className="rounded-xl">
            <Mail className="w-4 h-4 mr-2" />
            Email Details
          </TabsTrigger>
          <TabsTrigger value="github" className="rounded-xl">
            <Github className="w-4 h-4 mr-2" />
            GitHub Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="application" className="space-y-6">
          {/* Application Stats Cards */}
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

          {/* Second Row of Application Stats */}
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
                  {typeof stats.avgHealthScore === 'number' && stats.avgHealthScore >= 0 ? `${stats.avgHealthScore}%` : 'N/A'}
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

          {/* Application Filters */}
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

          {/* Application Logs Table */}
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
                        {log.details?.sender || log.campaignSenderInfo ? (
                          <div className="space-y-1">
                            {/* Current Sender Used */}
                            {log.details?.sender && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 text-xs">
                                    {log.details.sender}
                                  </span>
                                  {log.details?.messageId && (
                                    <span className="text-xs text-gray-400">
                                      ID: {log.details.messageId.slice(-8)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Sender Pool Info */}
                            {log.campaignSenderInfo && (
                              <div className="text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-600">
                                    Pool: {log.campaignSenderInfo.senderCount} account{log.campaignSenderInfo.senderCount !== 1 ? 's' : ''}
                                  </span>
                                  <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    log.campaignSenderInfo.avgHealthScore >= 80 ? 'bg-green-100 text-green-700' : 
                                    log.campaignSenderInfo.avgHealthScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {log.campaignSenderInfo.avgHealthScore}%
                                  </div>
                                </div>
                                
                                {/* Active Senders with Individual Health Scores */}
                                <div className="space-y-0.5">
                                  {log.campaignSenderInfo.senders.slice(0, 3).map((sender, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          sender.isActive ? 'bg-green-400' : 'bg-gray-300'
                                        }`}></div>
                                        <span className="text-xs text-gray-600 truncate max-w-20">
                                          {sender.email.split('@')[0]}
                                        </span>
                                      </div>
                                      {sender.healthScore !== 'N/A' && (
                                        <span className={`text-xs px-1 rounded ${
                                          sender.healthScore >= 80 ? 'bg-green-50 text-green-600' :
                                          sender.healthScore >= 60 ? 'bg-yellow-50 text-yellow-600' :
                                          'bg-red-50 text-red-600'
                                        }`}>
                                          {sender.healthScore}%
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {log.campaignSenderInfo.senders.length > 3 && (
                                    <div className="text-xs text-gray-400 text-center">
                                      +{log.campaignSenderInfo.senders.length - 3} more accounts
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            No sender info
                          </div>
                        )}
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
                        {(() => {
                          // Get timezone from log, contact, or derive from location
                          const timezone = log.timezone || log.contact?.timezone || 
                            (log.contact && deriveTimezoneFromLocation(log.details?.contact?.location || log.contact?.location))
                          
                          if (timezone) {
                            const status = getBusinessHoursStatus(timezone)
                            return (
                              <div className="space-y-1">
                                {/* Primary Timezone */}
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 text-xs">
                                    {timezone}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {status.currentTime}
                                  </span>
                                </div>
                                
                                {/* Business Hours Status */}
                                <div className="flex items-center gap-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    status.isBusinessHours ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className={`text-xs ${
                                    status.isBusinessHours ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {status.text}
                                  </span>
                                </div>
                                
                                {/* Skip Reason if Outside Hours */}
                                {log.skip_reason === 'outside_hours' && (
                                  <div className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                                    Skipped: Outside business hours
                                  </div>
                                )}
                                
                                {/* Show if timezone was derived */}
                                {!log.timezone && !log.contact?.timezone && (
                                  <div className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                    🌍 Derived from location
                                  </div>
                                )}
                              </div>
                            )
                          } else {
                            return (
                              <div className="space-y-1">
                                <span className="text-xs text-gray-500">No timezone</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                  <span className="text-xs text-gray-500">Using UTC default</span>
                                </div>
                              </div>
                            )
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          {/* Current Sequence Status */}
                          {log.sequence_step && (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                log.log_type === 'email_sent' ? 'bg-green-500' :
                                log.log_type === 'email_skipped' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}></div>
                              <span className="font-medium text-xs">
                                Step {log.sequence_step}/6
                              </span>
                            </div>
                          )}
                          
                          {/* Email Template Info */}
                          {log.email_subject && (
                            <div className="text-xs text-gray-600 truncate max-w-32">
                              📧 {log.email_subject}
                            </div>
                          )}
                          
                          {/* Next Action Timeline */}
                          {log.details?.nextEmailIn ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-blue-600 font-medium">
                                  Next: {log.details.nextEmailIn}
                                </span>
                              </div>
                              {/* Calculated Next Send Date */}
                              {(() => {
                                try {
                                  const logDate = new Date(log.created_at)
                                  const nextDays = parseInt(log.details.nextEmailIn.match(/\d+/)?.[0] || '0')
                                  if (nextDays > 0) {
                                    const nextDate = new Date(logDate)
                                    nextDate.setDate(nextDate.getDate() + nextDays)
                                    return (
                                      <div className="text-xs text-gray-500">
                                        📅 {nextDate.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    )
                                  }
                                } catch {}
                                return null
                              })()}
                            </div>
                          ) : log.log_type === 'email_sent' && !log.details?.testMode ? (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <span className="text-xs text-green-600">Delivered</span>
                            </div>
                          ) : log.log_type === 'email_skipped' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                <span className="text-xs text-yellow-600">Skipped</span>
                              </div>
                              {log.skip_reason && (
                                <div className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                                  {log.skip_reason.replace(/_/g, ' ')}
                                </div>
                              )}
                            </div>
                          ) : log.details?.testMode ? (
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              <span className="text-xs text-blue-600">Test Mode</span>
                            </div>
                          ) : log.details?.simulation || log.message?.includes('[SIMULATED]') ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                <span className="text-xs text-orange-600">Simulated</span>
                              </div>
                              <div className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                                No actual email sent
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No next action</span>
                          )}
                          
                          {/* Progress Indicator */}
                          {log.sequence_step && (
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${(log.sequence_step / 6) * 100}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
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

              {/* Application Pagination */}
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
        </TabsContent>

        <TabsContent value="github" className="space-y-6">
          {/* GitHub Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Runs</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.total_runs.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Github className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Successful</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.successful_runs.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.failed_runs.toLocaleString()}</p>
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
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.in_progress_runs.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Timer className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {githubStats.avg_duration > 0 ? `${Math.round(githubStats.avg_duration / 1000)}s` : 'N/A'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GitHub Email Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emails Processed</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.total_emails_processed.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emails Sent</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.total_emails_sent.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Skipped</p>
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.total_emails_skipped.toLocaleString()}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">{githubStats.total_errors.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GitHub Workflow Runs Table */}
          <Card className="border-gray-100">
            <CardContent className="p-0">
              <div className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-medium">Workflow</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Jobs</TableHead>
                      <TableHead className="font-medium">Email Metrics</TableHead>
                      <TableHead className="font-medium">Branch</TableHead>
                      <TableHead className="font-medium">Actor</TableHead>
                      <TableHead className="font-medium">Duration</TableHead>
                      <TableHead className="font-medium">Started</TableHead>
                      <TableHead className="font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {githubLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
                            <span className="text-gray-500">Loading GitHub workflows...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : githubRuns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No GitHub workflow runs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      githubRuns.map((run) => (
                        <TableRow key={run.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Github className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-sm">{run.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 max-w-xs truncate">
                                {run.display_title}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {run.status === 'completed' ? (
                                run.conclusion === 'success' ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )
                              ) : (
                                <Timer className="w-4 h-4 text-blue-500 animate-pulse" />
                              )}
                              <Badge 
                                variant={run.conclusion === 'success' ? 'default' : 
                                        run.conclusion === 'failure' ? 'destructive' : 'secondary'}
                                className="capitalize text-xs"
                              >
                                {run.conclusion || run.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Server className="w-3 h-3 text-gray-500" />
                                <span className="text-sm font-medium">
                                  {run.total_jobs} job{run.total_jobs !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-green-600">✓ {run.successful_jobs}</span>
                                {run.failed_jobs > 0 && (
                                  <span className="text-red-600">✗ {run.failed_jobs}</span>
                                )}
                              </div>
                              {/* Show job details */}
                              {run.jobs.slice(0, 2).map((job, idx) => (
                                <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    job.job_conclusion === 'success' ? 'bg-green-500' :
                                    job.job_conclusion === 'failure' ? 'bg-red-500' :
                                    'bg-blue-500'
                                  }`}></div>
                                  <span className="truncate max-w-24">{job.job_name}</span>
                                  {job.job_duration && (
                                    <span className="text-gray-400">({Math.round(job.job_duration / 1000)}s)</span>
                                  )}
                                </div>
                              ))}
                              {run.jobs.length > 2 && (
                                <div className="text-xs text-gray-400">+{run.jobs.length - 2} more</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {run.email_metrics ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3 text-blue-500" />
                                  <span className="font-medium">{run.email_metrics.processed} processed</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-xs">
                                  <span className="text-green-600">✓ {run.email_metrics.sent}</span>
                                  <span className="text-yellow-600">⚠ {run.email_metrics.skipped}</span>
                                  <span className="text-red-600">✗ {run.email_metrics.errors}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                <Thermometer className="w-3 h-3 inline mr-1" />
                                Warmup/System
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <GitBranch className="w-3 h-3 text-gray-500" />
                              <span className="font-mono text-xs">{run.head_branch}</span>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {run.head_sha.substring(0, 7)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img 
                                src={run.actor.avatar_url} 
                                alt={run.actor.login}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-sm">{run.actor.login}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {run.workflow_duration ? (
                                `${Math.round(run.workflow_duration / 1000)}s`
                              ) : (
                                '-'
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {formatTimestamp(run.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'yassineessabar/leadsup'}/actions/runs/${run.id}`, '_blank')}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          {/* Email Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Emails</p>
                    <p className="text-2xl font-semibold text-gray-900">{emailStats.total_emails || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sequence Emails</p>
                    <p className="text-2xl font-semibold text-gray-900">{emailStats.sequence_emails || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Warmup Emails</p>
                    <p className="text-2xl font-semibold text-gray-900">{emailStats.warmup_emails || 0}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-orange-600" />
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
                      {emailStats.total_emails > 0 
                        ? `${Math.round((emailStats.sent_emails / emailStats.total_emails) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Type Filter */}
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-gray-200"
                  />
                </div>

                <Select value={emailTypeFilter} onValueChange={setEmailTypeFilter}>
                  <SelectTrigger className="w-40 h-10 rounded-xl border-gray-200">
                    <SelectValue placeholder="Email Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Emails</SelectItem>
                    <SelectItem value="sequence">Sequence Only</SelectItem>
                    <SelectItem value="warmup">Warmup Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Details Table */}
          <Card className="border-gray-100">
            <CardContent className="p-0">
              <div className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-medium">Type</TableHead>
                      <TableHead className="font-medium">Timestamp</TableHead>
                      <TableHead className="font-medium">Sender</TableHead>
                      <TableHead className="font-medium">Recipient</TableHead>
                      <TableHead className="font-medium">Subject</TableHead>
                      <TableHead className="font-medium">Campaign</TableHead>
                      <TableHead className="font-medium">Step/Phase</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
                            <span className="text-gray-500">Loading email details...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : emailDetails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No email details found
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailDetails.map((email) => (
                        <TableRow key={email.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {email.type === 'warmup' ? (
                                <Thermometer className="w-4 h-4 text-orange-500" />
                              ) : (
                                <Zap className="w-4 h-4 text-green-500" />
                              )}
                              <Badge 
                                variant={email.type === 'warmup' ? 'secondary' : 'default'}
                                className="capitalize text-xs"
                              >
                                {email.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatTimestamp(email.timestamp)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              <div className="font-medium">{email.sender_email}</div>
                              {email.details.simulation && (
                                <div className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                  Simulated
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{email.recipient_name}</div>
                              <div className="text-xs text-gray-500">{email.recipient_email}</div>
                              {email.recipient_company && (
                                <div className="text-xs text-blue-600">{email.recipient_company}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm font-medium truncate">{email.subject}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {email.campaign_name}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {email.type === 'warmup' ? (
                                <div className="space-y-1">
                                  <div className="text-orange-600 font-medium">{email.sequence_step}</div>
                                  {email.details.warmup_phase && (
                                    <div className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                                      {email.details.warmup_phase}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-green-600 font-medium">{email.sequence_step}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={email.status === 'sent' ? 'default' : 'destructive'}
                              className="capitalize text-xs"
                            >
                              {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-xs text-gray-500">
                              {email.message_id && (
                                <div>ID: {email.message_id.slice(-8)}</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}