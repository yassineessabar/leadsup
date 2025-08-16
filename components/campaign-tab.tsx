"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, MoreHorizontal, Play, Mail, MessageSquare, Users, MousePointer, UserPlus, Trash2, Eye, UserCheck, Send, Reply, TrendingUp, TrendingDown, UserX, ChevronDown, ChevronRight } from "lucide-react"
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
  status: "Draft" | "Active" | "Paused" | "Completed"
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: any; isMultiple: boolean }>({ 
    open: false, 
    campaign: null, 
    isMultiple: false 
  })

  const triggerOptions = [
    { value: "New Client", label: "New Client", icon: UserPlus, description: "Trigger when a new client signs up" },
  ]

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
              totalPlanned: campaign.total_planned || Math.floor(Math.random() * 200) + 50,
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

  // Listen for create campaign event from sidebar
  useEffect(() => {
    const handleCreateCampaign = () => {
      setShowAdvancedPopup(true)
    }

    window.addEventListener('create-campaign', handleCreateCampaign)
    return () => window.removeEventListener('create-campaign', handleCreateCampaign)
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
            sent: Math.floor(Math.random() * 30), // Sample data for demo
            totalPlanned: Math.floor(Math.random() * 200) + 50 // Sample data for demo
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

  const handleCampaignStatusChange = async (campaignId: string | number, currentStatus: string, campaignName: string) => {
    // Determine the new status based on current status
    const newStatus = currentStatus === "Active" ? "Paused" : "Active"
    const action = newStatus === "Active" ? "activate" : "pause"
    
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

      const result = await response.json()

      if (result.success) {
        // Update the campaign in local state
        const updatedCampaign = campaigns.find(campaign => campaign.id === campaignId)
        setCampaigns(campaigns.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: newStatus as "Draft" | "Active" | "Paused" | "Completed" }
            : campaign
        ))
        
        toast({
          title: `Campaign ${action === "activate" ? "Activated" : "Paused"}`,
          description: `"${campaignName}" has been ${action}d successfully`,
        })

        // If campaign is being activated, open it in contact tab
        if (action === "activate" && updatedCampaign) {
          setSelectedCampaign({
            ...updatedCampaign,
            status: newStatus as "Draft" | "Active" | "Paused" | "Completed"
          })
          setCurrentView("dashboard")
        }
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${action} campaign`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} campaign`,
        variant: "destructive"
      })
    }
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
          sent: Math.floor(Math.random() * 30), // Sample data for demo
          totalPlanned: Math.floor(Math.random() * 200) + 50, // Sample data for demo
          outreachStrategy: campaignData.selectedOutreachStrategy || "email",
        }

        setCampaigns([newCampaign, ...campaigns])
        setShowAdvancedPopup(false)
        
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
        
        // Navigate to dashboard
        setSelectedCampaign(newCampaign)
        setCurrentView("dashboard")
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
    // Use SendGrid emails sent if available, otherwise fall back to campaign.sent
    const sent = campaign.sendgridMetrics?.emailsSent || campaign.sent || 0
    const totalPlanned = campaign.totalPlanned || 100 // Default to 100 if not specified
    
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
    const initialTab = subtab && ['contacts', 'sequence', 'sender', 'inbox', 'settings'].includes(subtab) 
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
              // Use real SendGrid metrics or fallback to mock data
              const openRate = Math.round(campaign.sendgridMetrics?.openRate ?? Math.floor(Math.random() * 40) + 20)
              const responseRate = Math.round(campaign.sendgridMetrics?.clickRate ?? Math.floor(Math.random() * 15) + 5) // Using click rate as "response" proxy
              
              return (
                <div
                  key={campaign.id}
                  className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer group"
                  onClick={() => {
                    setSelectedCampaign(campaign)
                    setCurrentView("analytics")
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
                          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCampaign(campaign)
                            setCurrentView("analytics")
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
                          : campaign.status === 'Paused'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : campaign.status === 'Completed'
                          ? 'bg-gray-50 text-gray-700 border border-gray-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {campaign.status || 'Draft'}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <p className="text-2xl font-light text-gray-900">{openRate}%</p>
                        <p className="text-sm text-gray-500 mt-1">Open Rate</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-2xl">
                        <p className="text-2xl font-light text-gray-900">{responseRate}%</p>
                        <p className="text-sm text-gray-500 mt-1">Response</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-600 font-medium">Progress</span>
                        <span className="font-semibold text-gray-900">{progress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 mt-2">
                        <span>{progress.sent} sent</span>
                        <span>{progress.totalPlanned} total</span>
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
                      
                      {campaign.status === 'Active' && (
                        <Button
                          variant="outline"
                          className="border-red-300 hover:bg-red-50 text-red-600 font-medium transition-all duration-300 rounded-2xl px-4"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCampaignStatusChange(campaign.id, 'Active', campaign.name)
                          }}
                        >
                          Stop
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

    </div>
  )
}