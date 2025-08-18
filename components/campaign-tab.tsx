"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, MoreHorizontal, Play, Mail, MessageSquare, Users, MousePointer, UserPlus, Trash2, Eye, UserCheck, Send, Reply, TrendingUp, TrendingDown, UserX, ChevronDown, ChevronRight, RefreshCw, Flame, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import CampaignDashboard from "./campaign-dashboard"
import AddCampaignPopup from "./add-campaign-popup"
import { DomainSetupButton } from "./domain-setup-button"
import { CampaignAnalytics } from "./campaign-analytics"

interface Campaign {
  id: string | number
  name: string
  type: "Email"
  trigger: "New Client"
  status: "Draft" | "Active" | "Paused" | "Completed" | "Warming"
  sent: number | null
  outreachStrategy?: "email" | "linkedin" | "email-linkedin"
  totalPlanned?: number // Total number of contacts/emails planned to be sent
  // SendGrid metrics
  sendgridMetrics?: {
    openRate: number
    clickRate: number
    deliveryRate: number
    emailsSent: number
    emailsDelivered: number
  }
}

interface CampaignsListProps {
  activeSubTab?: string
}

export default function CampaignsList({ activeSubTab }: CampaignsListProps) {
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createStep, setCreateStep] = useState(1) // 1: Name, 2: Type & Trigger
  const [newCampaignName, setNewCampaignName] = useState("My Campaign")
  const [newCampaignType, setNewCampaignType] = useState<"Email">("Email")
  const [newCampaignTrigger, setNewCampaignTrigger] = useState("New Client")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentView, setCurrentView] = useState<"list" | "dashboard" | "analytics">("list")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [dashboardInitialTab, setDashboardInitialTab] = useState<string>("contacts")

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string | number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [syncingCampaigns, setSyncingCampaigns] = useState<Set<string | number>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: any; isMultiple: boolean }>({ 
    open: false, 
    campaign: null, 
    isMultiple: false 
  })
  const [showWarmupWarning, setShowWarmupWarning] = useState(false)
  const [lowHealthSenders, setLowHealthSenders] = useState<Array<{ email: string; score: number }>>([])
  const [pendingResumeStatus, setPendingResumeStatus] = useState<string | null>(null)
  const [pendingResumeCampaign, setPendingResumeCampaign] = useState<{ id: string | number; name: string } | null>(null)
  const [campaignHealthScores, setCampaignHealthScores] = useState<Record<string | number, Array<{ email: string; score: number }>>>({})

  const triggerOptions = [
    { value: "New Client", label: "New Client", icon: UserPlus, description: "Trigger when a new client signs up" },
  ]

  // Fetch health scores for a specific campaign
  const fetchCampaignHealthScores = async (campaignId: string | number) => {
    try {
      const healthResponse = await fetch(`/api/sender-accounts/health-score?campaignId=${campaignId}`, {
        credentials: "include"
      })
      
      if (healthResponse.ok) {
        const healthResult = await healthResponse.json()
        if (healthResult.success && healthResult.data) {
          const healthScores = healthResult.data
          const senderHealthArray = Object.entries(healthScores)
            .map(([email, healthData]: [string, any]) => ({ email, score: healthData.score }))
          
          setCampaignHealthScores(prev => ({
            ...prev,
            [campaignId]: senderHealthArray
          }))
          
          return senderHealthArray
        }
      }
    } catch (error) {
      console.warn(`Error fetching health scores for campaign ${campaignId}:`, error)
    }
    return []
  }


  // Sync campaign with SendGrid API
  const syncCampaignWithSendGrid = async (campaignId: string | number, userId: string) => {
    setSyncingCampaigns(prev => new Set(prev).add(campaignId))
    
    try {
      console.log(`🔄 Syncing campaign ${campaignId} with SendGrid...`)
      
      const response = await fetch('/api/sendgrid/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          campaignId: campaignId.toString(), 
          userId 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific case where no stats are found (normal for new campaigns)
        if (result.error && result.error.includes('No stats found')) {
          toast({
            title: "ℹ️ No SendGrid Data",
            description: "This campaign hasn't sent any emails through SendGrid yet.",
            variant: "default"
          })
          return // Exit gracefully, this is not an error
        }
        throw new Error(result.error || 'Failed to sync with SendGrid')
      }

      if (result.success && result.data && result.data.rates) {
        // Update the campaign with real SendGrid metrics
        const rates = result.data.rates
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => 
            campaign.id === campaignId 
              ? { 
                  ...campaign, 
                  sendgridMetrics: {
                    openRate: rates.openRate,
                    clickRate: rates.clickRate,
                    deliveryRate: rates.deliveryRate,
                    emailsSent: rates.emailsSent,
                    emailsDelivered: rates.emailsDelivered
                  }
                }
              : campaign
          )
        )

        toast({
          title: "✅ Sync Complete",
          description: `Campaign metrics updated from SendGrid (${rates.openRate}% open rate, ${rates.clickRate}% click rate)`
        })
      } else {
        // No metrics found - this is normal for campaigns that haven't sent emails
        toast({
          title: "ℹ️ No Metrics Found",
          description: "This campaign has no SendGrid activity to sync.",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      toast({
        title: "❌ Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync with SendGrid",
        variant: "destructive"
      })
    } finally {
      setSyncingCampaigns(prev => {
        const newSet = new Set(prev)
        newSet.delete(campaignId)
        return newSet
      })
    }
  }

  // Fetch campaigns from API with SendGrid metrics
  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaigns", {
        credentials: "include"
      })
      const result = await response.json()
      
      if (result.success) {
        // Map the campaigns and fetch SendGrid metrics for each
        const campaignsWithMetrics = await Promise.all(
          result.data.map(async (campaign: any) => {
            let sendgridMetrics = undefined
            
            try {
              // Fetch SendGrid metrics for this campaign
              const metricsResponse = await fetch(`/api/analytics/campaign?campaign_id=${campaign.id}&start_date=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&end_date=${new Date().toISOString().split('T')[0]}`, {
                credentials: "include"
              })
              
              if (metricsResponse.ok) {
                const metricsResult = await metricsResponse.json()
                if (metricsResult.success && metricsResult.data?.metrics) {
                  const metrics = metricsResult.data.metrics
                  sendgridMetrics = {
                    openRate: metrics.openRate || 0,
                    clickRate: metrics.clickRate || 0,
                    deliveryRate: metrics.deliveryRate || 0,
                    emailsSent: metrics.emailsSent || 0,
                    emailsDelivered: metrics.emailsDelivered || 0
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch metrics for campaign ${campaign.id}:`, error)
            }
            
            return {
              ...campaign,
              outreachStrategy: campaign.outreach_strategy || campaign.outreachStrategy,
              totalPlanned: campaign.total_planned || 0, // Only use real data from database
              sendgridMetrics
            }
          })
        )
        
        setCampaigns(campaignsWithMetrics)
      } else {
        console.error("Failed to fetch campaigns:", result.error)
        toast({
          title: "Error",
          description: "Failed to load campaigns",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error)
      toast({
        title: "Error", 
        description: "Failed to load campaigns",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  // Check for campaign ID and subtab in URL params to auto-open campaign dashboard
  useEffect(() => {
    const campaignId = searchParams.get('campaignId')
    const subtab = searchParams.get('subtab')
    
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id.toString() === campaignId)
      if (campaign) {
        setSelectedCampaign(campaign)
        setCurrentView("dashboard")
      }
    }
  }, [searchParams, campaigns])

  // Check for autoOpen parameter to trigger popup for new users
  useEffect(() => {
    const autoOpen = searchParams.get('autoOpen')
    
    if (autoOpen === 'true') {
      console.log('🚀 Auto-opening campaign creation popup for new user')
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        setShowAdvancedPopup(true)
        // Remove the autoOpen parameter from URL to prevent re-triggering
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('autoOpen')
        window.history.replaceState({}, '', newUrl.toString())
      }, 200)
    }
  }, [searchParams])

  // Listen for create campaign event from sidebar
  useEffect(() => {
    const handleCreateCampaign = () => {
      setShowAdvancedPopup(true)
    }

    const handleOpenCampaignPopup = () => {
      setShowAdvancedPopup(true)
    }

    window.addEventListener('create-campaign', handleCreateCampaign)
    window.addEventListener('open-campaign-popup', handleOpenCampaignPopup)
    
    return () => {
      window.removeEventListener('create-campaign', handleCreateCampaign)
      window.removeEventListener('open-campaign-popup', handleOpenCampaignPopup)
    }
  }, [])

  const handleCreateCampaign = async () => {
    if (createStep === 1) {
      if (newCampaignName.trim()) {
        setCreateStep(2)
      }
    } else {
      try {
        const response = await fetch("/api/campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: newCampaignName,
            type: newCampaignType,
            trigger: newCampaignTrigger,
          }),
        })

        const result = await response.json()

        if (result.success) {
          const newCampaign: Campaign = {
            id: result.data.id,
            name: result.data.name,
            type: result.data.type,
            trigger: result.data.trigger_type,
            status: result.data.status,
            sent: 0, // No emails sent for new campaign
            totalPlanned: 0 // No contacts uploaded yet
          }

          setCampaigns([newCampaign, ...campaigns])
          setShowCreateModal(false)
          setCreateStep(1)
          setNewCampaignName("My Campaign")
          setNewCampaignType("Email")
          setNewCampaignTrigger("New Client")
          
          toast({
            title: "Campaign Created",
            description: `${newCampaignName} (${newCampaignType}) has been created successfully`,
          })
          
          // Notify sidebar that campaigns have changed
          const event = new CustomEvent('campaigns-changed')
          window.dispatchEvent(event)
          
          // Navigate to dashboard sequences tab
          setSelectedCampaign(newCampaign)
          setCurrentView("dashboard")
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create campaign",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error creating campaign:", error)
        toast({
          title: "Error",
          description: "Failed to create campaign",
          variant: "destructive"
        })
      }
    }
  }

  // Delete functionality removed for simplified UX

  const handleSelectCampaign = (campaignId: string | number, checked: boolean) => {
    const newSelected = new Set(selectedCampaignIds)
    if (checked) {
      newSelected.add(campaignId)
    } else {
      newSelected.delete(campaignId)
    }
    setSelectedCampaignIds(newSelected)
    
    // Update select all state
    setSelectAll(newSelected.size === filteredCampaigns.length && filteredCampaigns.length > 0)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredCampaigns.map(campaign => campaign.id))
      setSelectedCampaignIds(allIds)
    } else {
      setSelectedCampaignIds(new Set())
    }
    setSelectAll(checked)
  }

  const handleBulkDelete = () => {
    if (selectedCampaignIds.size === 0) return

    const selectedCampaigns = campaigns.filter(campaign => selectedCampaignIds.has(campaign.id))
    const campaignNames = selectedCampaigns.map(c => c.name).join(", ")
    
    setDeleteDialog({ 
      open: true, 
      campaign: { id: 'bulk', name: campaignNames },
      isMultiple: true
    })
  }

  const confirmBulkDelete = async () => {
    if (selectedCampaignIds.size === 0) return

    try {
      // Delete campaigns in parallel
      const deletePromises = Array.from(selectedCampaignIds).map(campaignId =>
        fetch(`/api/campaigns?id=${campaignId}`, { method: "DELETE", credentials: "include" })
      )

      const responses = await Promise.all(deletePromises)
      const results = await Promise.all(responses.map(r => r.json()))

      const successCount = results.filter(r => r.success).length
      const failedCount = results.length - successCount

      // Remove successfully deleted campaigns from state
      const successfulIds = results
        .map((result, index) => result.success ? Array.from(selectedCampaignIds)[index] : null)
        .filter(id => id !== null)

      setCampaigns(campaigns.filter(campaign => !successfulIds.includes(campaign.id)))
      setSelectedCampaignIds(new Set())
      setSelectAll(false)

      // Notify sidebar that campaigns have changed
      if (successCount > 0) {
        const event = new CustomEvent('campaigns-changed')
        window.dispatchEvent(event)
      }

      if (successCount > 0) {
        toast({
          title: "Campaigns Deleted",
          description: `${successCount} campaign(s) deleted successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        })
      }

      if (failedCount > 0) {
        toast({
          title: "Some Deletions Failed",
          description: `${failedCount} campaign(s) could not be deleted`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting campaigns:", error)
      toast({
        title: "Error",
        description: "Failed to delete campaigns",
        variant: "destructive"
      })
    } finally {
      setDeleteDialog({ open: false, campaign: null, isMultiple: false })
    }
  }

  const handleWarmupDecision = async (shouldContinueWarmup: boolean) => {
    if (!pendingResumeCampaign) {
      return
    }
    
    const targetStatus = shouldContinueWarmup ? "Warming" : "Active"
    
    try {
      await proceedWithStatusChange(
        pendingResumeCampaign.id, 
        targetStatus, 
        pendingResumeCampaign.name
      )
      
      // Success - close the popup and reset states
      setShowWarmupWarning(false)
      setPendingResumeStatus(null)
      setPendingResumeCampaign(null)
      
    } catch (error) {
      console.error('❌ ERROR in handleWarmupDecision:', error)
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive"
      })
    }
  }


  const proceedWithStatusChange = async (campaignId: string | number, newStatus: string, campaignName: string) => {
    const action = newStatus === "Active" ? "activate" : newStatus === "Warming" ? "warm up" : "pause"
    
    console.log(`🔄 proceedWithStatusChange START: ${action} for campaign ${campaignId} to status: ${newStatus}`)
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus
        }),
      })

      console.log(`📡 Response received: status=${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP error: ${response.status}, body: ${errorText}`)
        throw new Error(`Failed to update campaign status (HTTP ${response.status})`)
      }

      const result = await response.json()
      console.log(`📝 API Response:`, result)

      if (result.success) {
        // Update the campaign in local state
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => 
            campaign.id === campaignId 
              ? { ...campaign, status: newStatus as "Draft" | "Active" | "Paused" | "Completed" | "Warming" }
              : campaign
          )
        )
        
        console.log(`✅ Successfully updated campaign ${campaignId} to ${newStatus}`)
        
        // Don't show toast here - let the calling function handle it
        return result
        
      } else {
        console.error(`❌ API returned success=false:`, result)
        throw new Error(result.error || `Failed to ${action} campaign`)
      }
    } catch (error) {
      console.error(`❌ EXCEPTION in proceedWithStatusChange:`, error)
      throw error // Re-throw for handling in handleWarmupDecision
    }
  }


  const handleCampaignStatusChange = async (campaignId: string | number, currentStatus: string, campaignName: string) => {
    // Determine the new status based on current status
    const newStatus = currentStatus === "Active" ? "Paused" : "Active"
    const action = newStatus === "Active" ? "activate" : "pause"
    
    // Always show warmup popup when resuming from Paused status
    if (currentStatus === "Paused" && newStatus === "Active") {
      try {
        console.log('🔍 Fetching health scores for warmup popup for campaign:', campaignId)
        
        // First, fetch campaign senders to get their emails
        const sendersResponse = await fetch(`/api/campaigns/${campaignId}/senders`, {
          credentials: "include"
        })
        
        let senderEmails = []
        if (sendersResponse.ok) {
          const sendersResult = await sendersResponse.json()
          console.log('📧 Campaign senders result:', sendersResult)
          if (sendersResult.success && sendersResult.assignments) {
            senderEmails = sendersResult.assignments
              .map((a: any) => a.email)
              .filter(Boolean)
          }
        }
        
        console.log('📧 Sender emails for health check:', senderEmails)
        
        // Now fetch health scores for these specific senders
        let allSenders = []
        if (senderEmails.length > 0) {
          const healthResponse = await fetch(`/api/sender-accounts/health-score?emails=${senderEmails.join(',')}`, {
            credentials: "include"
          })
          
          if (healthResponse.ok) {
            const healthResult = await healthResponse.json()
            console.log('💚 Health scores result:', healthResult)
            if (healthResult.success && healthResult.data) {
              const healthScores = healthResult.data
              allSenders = Object.entries(healthScores)
                .map(([email, healthData]: [string, any]) => ({ email, score: healthData.score }))
            }
          }
        } else {
          console.log('⚠️ No senders assigned to campaign, showing empty warmup popup')
        }
        
        // Show warmup popup regardless of health scores
        console.log('📋 Showing warmup popup with senders:', allSenders)
        setLowHealthSenders(allSenders)
        setPendingResumeStatus(newStatus)
        setPendingResumeCampaign({ id: campaignId, name: campaignName })
        setShowWarmupWarning(true)
        return // Don't proceed with activation yet
        
      } catch (error) {
        console.warn('Error fetching health scores, showing warmup popup anyway:', error)
        // Show popup even if health score fetch fails
        setLowHealthSenders([])
        setPendingResumeStatus(newStatus)
        setPendingResumeCampaign({ id: campaignId, name: campaignName })
        setShowWarmupWarning(true)
        return
      }
    }
    
    // Proceed with status change
    await proceedWithStatusChange(campaignId, newStatus, campaignName)
  }

  const handleAdvancedCampaignComplete = async (campaignData: any) => {
    try {
      console.log('✅ Advanced campaign completed:', campaignData)
      
      // Campaign was already created in the popup, just use the existing campaign
      const existingCampaign = campaignData.campaign || campaignData.campaignResult?.data?.campaign
      
      if (existingCampaign) {
        console.log('📋 Using existing campaign from popup:', existingCampaign)
        const newCampaign: Campaign = {
          id: existingCampaign.id,
          name: existingCampaign.name || campaignData.formData?.campaignName,
          type: existingCampaign.type || "Email",
          trigger: existingCampaign.trigger_type || "Manual",
          status: existingCampaign.status || "Draft",
          sent: 0, // No emails sent for new campaign
          totalPlanned: 0, // No contacts uploaded yet
          outreachStrategy: campaignData.selectedOutreachStrategy || "email",
        }

        setCampaigns([newCampaign, ...campaigns])
        setShowAdvancedPopup(false)
        
        // Automatically open the new campaign in target tab to show pre-populated keywords
        setSelectedCampaign(newCampaign)
        setCurrentView("dashboard")
        setDashboardInitialTab("target") // Start at target tab to show keywords
        
        // Notify sidebar that campaigns have changed
        const event = new CustomEvent('campaigns-changed')
        window.dispatchEvent(event)
        
        // Navigate to appropriate campaign sub-tab based on outreach strategy
        let targetTab = 'campaigns-email' // default
        if (campaignData.selectedOutreachStrategy === 'linkedin') {
          targetTab = 'campaigns-linkedin'
        } else if (campaignData.selectedOutreachStrategy === 'email-linkedin') {
          targetTab = 'campaigns-multi-channel'
        }
        
        // Dispatch event to change tab to the appropriate sub-tab
        const tabEvent = new CustomEvent('tab-switched', { detail: targetTab })
        window.dispatchEvent(tabEvent)
        
        toast({
          title: "Campaign Created",
          description: `${newCampaign.name} (${campaignData.selectedOutreachStrategy === 'email' ? 'Email Only' : campaignData.selectedOutreachStrategy === 'linkedin' ? 'LinkedIn Only' : 'Multi-Channel'}) has been created successfully`,
        })
        
        // Already navigated above - removed duplicate
      } else {
        toast({
          title: "Error",
          description: "Campaign data is missing from popup result",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating advanced campaign:", error)
      toast({
        title: "Error",
        description: "Failed to create advanced campaign",
        variant: "destructive"
      })
    }
  }

  const handleBackInModal = () => {
    if (createStep === 2) {
      setCreateStep(1)
    } else {
      setShowCreateModal(false)
      setCreateStep(1)
    }
  }

  const getStatusBadge = (status: Campaign["status"]) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium transition-colors"
    switch (status) {
      case "Draft":
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-300`
      case "Active":
        return `${baseClasses} bg-green-100 text-green-800 border border-green-300`
      case "Paused":
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-300`
      case "Completed":
        return `${baseClasses} border border-[rgb(87,140,255)]`
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-300`
    }
  }

  const getTypeIcon = (type: Campaign["type"]) => {
    return type === "Email" ? (
      <Mail className="w-4 h-4" style={{ color: 'rgb(87, 140, 255)' }} />
    ) : (
      <MessageSquare className="w-4 h-4 text-green-600" />
    )
  }

  const getTriggerIcon = (trigger: Campaign["trigger"]) => {
    const option = triggerOptions.find((opt) => opt.value === trigger)
    if (!option) return <MousePointer className="w-4 h-4 text-gray-400" />
    const Icon = option.icon
    return <Icon className="w-4 h-4 text-gray-600" />
  }

  const getCampaignProgress = (campaign: Campaign) => {
    // Check if campaign has been started
    const hasBeenStarted = campaign.status === 'Active' || campaign.status === 'Completed' || campaign.status === 'Paused' || campaign.status === 'Warming'
    
    // For new/draft campaigns, show zero progress
    if (!hasBeenStarted) {
      return { percentage: 0, sent: 0, totalPlanned: campaign.totalPlanned || 0 }
    }
    
    // ULTRA STRICT: Only show data if campaign has contacts AND has started AND metrics match contacts
    // Check if campaign has any actual contacts uploaded
    const hasContacts = campaign.totalPlanned && campaign.totalPlanned > 0
    
    // Check if campaign has REAL metrics that match actual campaign activity
    const hasRealCampaignData = campaign.sendgridMetrics && 
      campaign.sendgridMetrics.emailsSent > 0 && 
      hasContacts && // Must have contacts to have real activity
      campaign.sent && campaign.sent > 0 && 
      campaign.sent === campaign.sendgridMetrics.emailsSent
    
    // STRICT: Only show sent emails if campaign has contacts and real metrics
    const sent = hasRealCampaignData ? campaign.sendgridMetrics.emailsSent : 0
    const totalPlanned = hasContacts ? campaign.totalPlanned : 0
    
    if (totalPlanned === 0) return { percentage: 0, sent, totalPlanned }
    
    const percentage = Math.min(Math.round((sent / totalPlanned) * 100), 100)
    return { percentage, sent, totalPlanned }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const matchesStatus = statusFilter === "all" || campaign.status?.toLowerCase() === statusFilter
    const matchesType = typeFilter === "all" || campaign.type?.toLowerCase() === typeFilter
    
    // Filter by active sub-tab
    let matchesSubTab = true
    if (activeSubTab === "campaigns-email") {
      matchesSubTab = campaign.outreachStrategy === "email" || !campaign.outreachStrategy
    } else if (activeSubTab === "campaigns-linkedin") {
      matchesSubTab = campaign.outreachStrategy === "linkedin"
    } else if (activeSubTab === "campaigns-multi-channel") {
      matchesSubTab = campaign.outreachStrategy === "email-linkedin"
    }
    
    
    return matchesSearch && matchesStatus && matchesType && matchesSubTab
  })

  if (currentView === "analytics" && selectedCampaign) {
    return (
      <CampaignAnalytics
        campaign={selectedCampaign}
        onBack={() => {
          setCurrentView("list")
          setDashboardInitialTab("contacts") // Reset to default
        }}
        onStatusUpdate={async (campaignId, newStatus) => {
          try {
            // Make API call to update status in database
            const response = await fetch(`/api/campaigns/${campaignId}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (response.ok && result.success) {
              // Update the campaign status in local state only after successful API call
              setCampaigns(campaigns.map(campaign => 
                campaign.id === campaignId 
                  ? { ...campaign, status: newStatus }
                  : campaign
              ))
              // Also update the selected campaign
              setSelectedCampaign(prev => prev ? { ...prev, status: newStatus } : prev)
              
              toast({
                title: "Campaign Updated",
                description: `Campaign status changed to ${newStatus}`,
                variant: "default"
              })
            } else {
              toast({
                title: "Update Failed",
                description: result.error || "Failed to update campaign status",
                variant: "destructive"
              })
            }
          } catch (error) {
            console.error('Error updating campaign status:', error);
            toast({
              title: "Update Failed",
              description: "Network error occurred while updating campaign",
              variant: "destructive"
            })
          }
        }}
      />
    )
  }

  if (currentView === "dashboard" && selectedCampaign) {
    // Check URL params for specific tab, otherwise use dashboardInitialTab state
    const subtab = searchParams.get('subtab')
    const initialTab = subtab && ['contacts', 'sequence', 'sender', 'inbox', 'settings', 'target'].includes(subtab) 
      ? subtab 
      : dashboardInitialTab
    
    return (
      <CampaignDashboard 
        campaign={{
          ...selectedCampaign,
          type: selectedCampaign.type
        }} 
        onBack={() => {
          setCurrentView("list")
          setDashboardInitialTab("contacts") // Reset to default
        }}
        onDelete={(campaignId) => {
          // Remove from local state and go back to list view
          setCampaigns(campaigns.filter(campaign => campaign.id !== campaignId))
          setCurrentView("list")
          setSelectedCampaign(null)
          
          // Notify sidebar that campaigns have changed
          const event = new CustomEvent('campaigns-changed')
          window.dispatchEvent(event)
        }}
        onStatusUpdate={async (campaignId, newStatus) => {
          try {
            // Make API call to update status in database
            const response = await fetch(`/api/campaigns/${campaignId}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (response.ok && result.success) {
              // Update the campaign status in local state only after successful API call
              setCampaigns(campaigns.map(campaign => 
                campaign.id === campaignId 
                  ? { ...campaign, status: newStatus }
                  : campaign
              ))
              // Also update the selected campaign
              setSelectedCampaign(prev => prev ? { ...prev, status: newStatus } : prev)
              
              toast({
                title: "Campaign Updated",
                description: `Campaign status changed to ${newStatus}`,
                variant: "default"
              })
            } else {
              toast({
                title: "Update Failed",
                description: result.error || "Failed to update campaign status",
                variant: "destructive"
              })
            }
          } catch (error) {
            console.error('Error updating campaign status:', error);
            toast({
              title: "Update Failed",
              description: "Network error occurred while updating campaign",
              variant: "destructive"
            })
          }
        }}
        onNameUpdate={async (campaignId, newName) => {
          try {
            console.log(`🔄 Updating campaign ${campaignId} name to: "${newName}"`)
            
            const response = await fetch(`/api/campaigns/${campaignId}/name`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: newName })
            })
            
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error || 'Failed to update campaign name')
            }
            
            if (result.success) {
              console.log(`✅ Campaign name updated successfully: "${result.data.previousName}" → "${result.data.name}"`)
              
              // Update the campaign name in local state
              setCampaigns(campaigns.map(campaign => 
                campaign.id === campaignId 
                  ? { ...campaign, name: newName }
                  : campaign
              ))
              // Also update the selected campaign
              setSelectedCampaign(prev => prev ? { ...prev, name: newName } : prev)
              
              toast({
                title: "Campaign Updated",
                description: `Campaign name changed to "${newName}"`
              })
            }
          } catch (error) {
            console.error('❌ Error updating campaign name:', error)
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to update campaign name",
              variant: "destructive"
            })
          }
        }}
        initialTab={initialTab}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-2">Campaigns</h1>
              <p className="text-gray-500 font-light">Manage and monitor your outreach campaigns</p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowAdvancedPopup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-gray-200 rounded-2xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10 bg-white border-gray-200 rounded-2xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-200">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600 font-medium">Loading campaigns...</span>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-8 font-light">Create your first campaign to start reaching out to prospects</p>
              <Button 
                onClick={() => setShowAdvancedPopup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-3 font-medium transition-all duration-300 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const progress = getCampaignProgress(campaign)
              
              // Only show real metrics for campaigns that have been started AND have real campaign data
              const hasBeenStarted = campaign.status === 'Active' || campaign.status === 'Completed' || campaign.status === 'Paused' || campaign.status === 'Warming'
              
              // ULTRA STRICT: Only show metrics if campaign has contacts AND real activity
              const hasContacts = campaign.totalPlanned && campaign.totalPlanned > 0
              
              // Check if this campaign has REAL metrics (not fake injected data)
              const hasRealCampaignData = campaign.sendgridMetrics && 
                campaign.sendgridMetrics.emailsSent > 0 && 
                hasContacts && // Must have contacts to have real activity
                campaign.sent && campaign.sent > 0 && 
                campaign.sent === campaign.sendgridMetrics.emailsSent
              
              // Use real SendGrid metrics only if campaign has actual activity
              const openRate = hasBeenStarted && hasRealCampaignData 
                ? Math.round(campaign.sendgridMetrics.openRate) 
                : 0
              const responseRate = hasBeenStarted && hasRealCampaignData 
                ? Math.round(campaign.sendgridMetrics.clickRate) 
                : 0
              
              return (
                <div
                  key={campaign.id}
                  className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer group"
                  onClick={() => {
                    setSelectedCampaign(campaign)
                    if (campaign.status === "Draft") {
                      setCurrentView("dashboard")
                      setDashboardInitialTab("target")
                    } else {
                      setCurrentView("analytics")
                    }
                  }}
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                          <Mail className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {campaign.name || 'Untitled Campaign'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{campaign.type} Campaign</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Get user ID - you may need to adjust this based on your auth system
                            const userId = 'd155d4c2-2f06-45b7-9c90-905e3648e8df' // This should come from your auth context
                            syncCampaignWithSendGrid(campaign.id, userId)
                          }}
                          disabled={syncingCampaigns.has(campaign.id)}
                          title="Sync with SendGrid"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingCampaigns.has(campaign.id) ? 'animate-spin text-blue-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCampaign(campaign)
                            if (campaign.status === "Draft") {
                              setCurrentView("dashboard")
                              setDashboardInitialTab("target")
                            } else {
                              setCurrentView("analytics")
                            }
                          }}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCampaign(campaign)
                            setDashboardInitialTab("settings")
                            setCurrentView("dashboard")
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-6">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        campaign.status === 'Active' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : campaign.status === 'Warming'
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200'
                          : campaign.status === 'Paused'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : campaign.status === 'Completed'
                          ? 'bg-gray-50 text-gray-700 border border-gray-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {campaign.status === 'Warming' && (
                          <Flame className="w-4 h-4 mr-1.5 text-orange-700 animate-pulse" />
                        )}
                        {campaign.status === 'Active' && (
                          <Play className="w-4 h-4 mr-1.5" />
                        )}
                        {campaign.status === 'Paused' && (
                          <Pause className="w-4 h-4 mr-1.5" />
                        )}
                        {campaign.status || 'Draft'}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <p className="text-2xl font-light text-gray-900">
                          {hasBeenStarted && hasRealCampaignData ? `${openRate}%` : 
                           hasBeenStarted ? '0%' : '—'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {hasBeenStarted ? 'Open Rate' : 'Not started'}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <p className="text-2xl font-light text-gray-900">
                          {hasBeenStarted && hasRealCampaignData ? `${responseRate}%` : 
                           hasBeenStarted ? '0%' : '—'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {hasBeenStarted ? 'Response' : 'Not started'}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-600 font-medium">
                          {hasBeenStarted ? 'Progress' : 'Ready to Start'}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {hasBeenStarted ? `${progress.percentage}%` : '—'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 mt-2">
                        <span>
                          {hasBeenStarted ? `${progress.sent} sent` : 'Not started'}
                        </span>
                        <span>
                          {progress.totalPlanned > 0 ? `${progress.totalPlanned} total` : 'No contacts'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {campaign.status === 'Active' ? (
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCampaignStatusChange(campaign.id, campaign.status, campaign.name)
                          }}
                        >
                          Pause
                        </Button>
                      ) : campaign.status === 'Warming' ? (
                        <Button
                          variant="outline"
                          className="flex-1 border-orange-300 hover:bg-orange-50 text-orange-700 font-medium transition-all duration-300 rounded-2xl"
                          disabled
                        >
                          <Flame className="w-4 h-4 mr-2 text-orange-700 animate-pulse" />
                          Warming Up...
                        </Button>
                      ) : campaign.status === 'Paused' ? (
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-300 rounded-2xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCampaignStatusChange(campaign.id, campaign.status, campaign.name)
                          }}
                        >
                          Resume
                        </Button>
                      ) : (
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium transition-all duration-300 rounded-2xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCampaignStatusChange(campaign.id, campaign.status, campaign.name)
                          }}
                        >
                          Start
                        </Button>
                      )}
                      
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl p-8">
              {/* Back Button */}
              <div className="flex items-center space-x-3 mb-8">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBackInModal}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <span className="text-gray-600">Back</span>
              </div>

              {/* Step 1: Campaign Name */}
              {createStep === 1 && (
                <div className="text-center space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Let's create a new campaign</h2>
                    <p className="text-gray-600">What would you like to name it?</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-left text-sm font-medium text-gray-700">Campaign Name</label>
                    <Input
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      className="text-lg py-3"
                      placeholder="Enter campaign name"
                    />
                  </div>

                  <div className="flex justify-center space-x-4 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </Button>
                    <Button style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'} onClick={handleCreateCampaign}>
                      Continue →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Campaign Type & Trigger */}
              {createStep === 2 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Configure your campaign</h2>
                    <p className="text-gray-600">Choose the type and trigger for "{newCampaignName}"</p>
                  </div>

                  {/* Campaign Type */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Campaign Type</label>
                    <RadioGroup
                      value={newCampaignType}
                      onValueChange={(value) => setNewCampaignType(value as "Email")}
                    >
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="Email" id="email" />
                          <Label htmlFor="email" className="flex items-center space-x-3 cursor-pointer">
                            <Mail className="w-5 h-5" style={{ color: 'rgb(87, 140, 255)' }} />
                            <div>
                              <div className="font-medium">Email Campaign</div>
                              <div className="text-sm text-gray-500">Send email sequences</div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Trigger Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Campaign Trigger</label>
                    <RadioGroup value={newCampaignTrigger} onValueChange={setNewCampaignTrigger}>
                      <div className="grid grid-cols-1 gap-3">
                        {triggerOptions.map((option) => {
                          const Icon = option.icon
                          return (
                            <div
                              key={option.value}
                              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <RadioGroupItem value={option.value} id={option.value} />
                              <Label
                                htmlFor={option.value}
                                className="flex items-center space-x-3 cursor-pointer flex-1"
                              >
                                <Icon className="w-5 h-5 text-gray-600" />
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-sm text-gray-500">{option.description}</div>
                                </div>
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex justify-center space-x-4 pt-4">
                    <Button variant="outline" onClick={() => setCreateStep(1)}>
                      Back
                    </Button>
                    <Button style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'} onClick={handleCreateCampaign}>
                      Create Campaign
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Advanced Campaign Popup */}
        <AddCampaignPopup 
          isOpen={showAdvancedPopup}
          onClose={() => setShowAdvancedPopup(false)}
          onComplete={handleAdvancedCampaignComplete}
        />

        {/* Warmup Warning Dialog - EXACT COPY FROM ANALYTICS */}
        <Dialog open={showWarmupWarning} onOpenChange={setShowWarmupWarning}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl border border-gray-100 p-0 overflow-hidden">
            <div className="p-6 pb-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Health Score Alert
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500">
                    Some senders still need warming up
                  </DialogDescription>
                </div>
              </div>
            </div>
            
            <div className="px-6 pb-4">
              <div className="bg-orange-50/50 rounded-xl p-3 mb-3">
                <p className="text-xs font-medium text-orange-900 mb-2">Accounts Still Below 90% Health</p>
                <div className="space-y-1.5">
                  {lowHealthSenders.map((sender, index) => {
                    const getScoreColor = (score: number) => {
                      if (score >= 80) return 'text-green-700 bg-green-100'
                      if (score >= 60) return 'text-yellow-700 bg-yellow-100'
                      return 'text-red-700 bg-red-100'
                    }
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <span className="text-sm text-gray-700 truncate flex-1 mr-2">{sender.email}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getScoreColor(sender.score)}`}>
                          {sender.score}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
                <p><span className="font-semibold">Continue Warmup:</span> Keep warming to improve health scores before going active.</p>
                <p className="mt-1">
                  <span className="font-semibold">
                    {pendingResumeStatus === "Completed" ? "Stop Anyway:" : "Resume Anyway:"}
                  </span>{" "}
                  {pendingResumeStatus === "Completed" 
                    ? "Stop the campaign now despite health scores." 
                    : "Go active now despite low health scores."
                  }
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 p-6 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleWarmupDecision(false)
                }}
                className="flex-1 h-10 rounded-xl text-sm"
              >
                {pendingResumeStatus === "Completed" ? "Stop Anyway" : "Resume Anyway"}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleWarmupDecision(true)
                }}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium"
              >
                <Flame className="w-4 h-4 mr-1.5" />
                Continue Warmup
              </Button>
            </div>
          </DialogContent>
        </Dialog>

    </div>
  )
}