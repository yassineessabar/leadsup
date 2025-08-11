"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, MoreHorizontal, Play, Mail, MessageSquare, Users, MousePointer, UserPlus, Trash2, Eye, UserCheck, Send, Reply, TrendingUp, TrendingDown, UserX, ChevronDown } from "lucide-react"
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

interface Campaign {
  id: string | number
  name: string
  type: "Email"
  trigger: "New Client"
  status: "Draft" | "Active" | "Paused" | "Completed"
  sent: number | null
  outreachStrategy?: "email" | "linkedin" | "email-linkedin"
  totalPlanned?: number // Total number of contacts/emails planned to be sent
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
  const [currentView, setCurrentView] = useState<"list" | "dashboard">("list")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string | number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    campaign: { id: string | number; name: string } | null
    isMultiple: boolean
  }>({ open: false, campaign: null, isMultiple: false })

  const triggerOptions = [
    { value: "New Client", label: "New Client", icon: UserPlus, description: "Trigger when a new client signs up" },
  ]

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaigns", {
        credentials: "include"
      })
      const result = await response.json()
      
      if (result.success) {
        // Map the campaigns to include outreach strategy from API data
        const mappedCampaigns = result.data.map((campaign: any) => ({
          ...campaign,
          outreachStrategy: campaign.outreach_strategy || campaign.outreachStrategy,
          totalPlanned: campaign.total_planned || Math.floor(Math.random() * 200) + 50 // Sample data for demo
        }))
        setCampaigns(mappedCampaigns)
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

  const handleDeleteCampaign = (campaignId: string | number, campaignName: string) => {
    setDeleteDialog({ 
      open: true, 
      campaign: { id: campaignId, name: campaignName },
      isMultiple: false
    })
  }

  const confirmDeleteCampaign = async () => {
    if (!deleteDialog.campaign) return

    try {
      const response = await fetch(`/api/campaigns?id=${deleteDialog.campaign.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const result = await response.json()

      if (result.success) {
        // Remove the campaign from the local state
        setCampaigns(campaigns.filter(campaign => campaign.id !== deleteDialog.campaign!.id))
        
        // If we're currently viewing this campaign, go back to list view
        if (currentView === "dashboard" && selectedCampaign?.id === deleteDialog.campaign!.id) {
          setCurrentView("list")
          setSelectedCampaign(null)
        }
        
        // Notify sidebar that campaigns have changed
        const event = new CustomEvent('campaigns-changed')
        window.dispatchEvent(event)
        
        toast({
          title: "Campaign Deleted",
          description: result.message || `Campaign "${deleteDialog.campaign.name}" has been deleted successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete campaign",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      })
    } finally {
      setDeleteDialog({ open: false, campaign: null, isMultiple: false })
    }
  }

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
    const sent = campaign.sent || 0
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

  if (currentView === "dashboard" && selectedCampaign) {
    // Check URL params for specific tab, otherwise default to contacts
    const subtab = searchParams.get('subtab')
    const initialTab = subtab && ['contacts', 'sequence', 'sender', 'inbox', 'settings'].includes(subtab) 
      ? subtab 
      : "contacts"
    
    return (
      <CampaignDashboard 
        campaign={{
          ...selectedCampaign,
          type: selectedCampaign.type
        }} 
        onBack={() => setCurrentView("list")}
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <SelectValue placeholder="All statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              {selectedCampaignIds.size > 0 && (
                <Button 
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedCampaignIds.size})
                </Button>
              )}
              <div className="relative">
                <Button style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'} onClick={() => setShowAdvancedPopup(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border">
          {(!activeSubTab || activeSubTab === "campaigns-email") && (
            <>
              <div className="grid gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600" style={{ gridTemplateColumns: '120px 1fr 120px 100px 100px 100px 100px 100px' }}>
                <div>Status</div>
                <div>Name</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Progress
                </div>
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Openings
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  Link clicked
                </div>
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Replies
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Bounced
                </div>
              </div>
            </>
          )}

          {activeSubTab === "campaigns-linkedin" && (
            <>
              <div className="grid grid-cols-7 gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                <div>Status</div>
                <div>Name</div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visit profile
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invit. sent
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Accepted
                </div>
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Sent
                </div>
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Replies
                </div>
              </div>
            </>
          )}

          {activeSubTab === "campaigns-multi-channel" && (
            <>
              <div className="grid grid-cols-6 gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                <div>Status</div>
                <div>Name</div>
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Email sent
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Opened
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Invitation accepted
                </div>
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Replied
                </div>
              </div>
            </>
          )}


          {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mr-2" style={{ borderColor: 'rgb(87, 140, 255)', borderTopColor: 'transparent' }}></div>
                  Loading campaigns...
                </div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No campaigns found. Create your first campaign to get started.
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    setSelectedCampaign(campaign)
                    setCurrentView("dashboard")
                  }}
                >
                  {/* Email Campaign Layout */}
                  {(!activeSubTab || activeSubTab === "campaigns-email") && (
                    <div className="grid gap-4 p-4" style={{ gridTemplateColumns: '120px 1fr 120px 100px 100px 100px 100px 100px' }}>
                      <div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 border border-gray-300 w-fit">
                          {campaign.status || 'Draft'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{campaign.name || 'Untitled Campaign'}</div>
                      </div>
                      <div>
                        {(() => {
                          const progress = getCampaignProgress(campaign)
                          const progressColor = progress.percentage >= 75 ? 'text-green-600' : 
                                              progress.percentage >= 50 ? 'text-[rgb(87,140,255)]' : 
                                              progress.percentage >= 25 ? 'text-orange-500' : 
                                              'text-gray-400'
                          return (
                            <div>
                              <div className={`font-semibold ${progressColor}`}>{progress.percentage}%</div>
                              <div className="text-xs text-gray-500">{progress.sent}/{progress.totalPlanned}</div>
                              {/* Progress bar */}
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className={`h-1.5 rounded-full transition-all ${
                                    progress.percentage >= 75 ? 'bg-green-600' : 
                                    progress.percentage >= 50 ? 'bg-[rgb(87,140,255)]' : 
                                    progress.percentage >= 25 ? 'bg-orange-500' : 
                                    'bg-gray-400'
                                  }`}
                                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                      <div>
                        <div className="text-[#3B82F6] font-semibold">{campaign.sent ?? 0}</div>
                        <div className="text-xs text-gray-500">Sent</div>
                      </div>
                      <div>
                        <div className="text-orange-500 font-semibold">0%</div>
                        <div className="text-xs text-gray-500">Opens</div>
                      </div>
                      <div>
                        <div className="text-cyan-500 font-semibold">0%</div>
                        <div className="text-xs text-gray-500">Clicks</div>
                      </div>
                      <div>
                        <div className="text-green-500 font-semibold">0%</div>
                        <div className="text-xs text-gray-500">Replies</div>
                      </div>
                      <div>
                        <div className="text-red-500 font-semibold">0%</div>
                        <div className="text-xs text-gray-500">Bounces</div>
                      </div>
                    </div>
                  )}

                  {/* LinkedIn Campaign Layout */}
                  {activeSubTab === "campaigns-linkedin" && (
                    <div className="grid grid-cols-7 gap-4 p-4">
                      <div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 border border-gray-300 w-fit">
                          {campaign.status || 'Draft'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{campaign.name || 'Untitled Campaign'}</div>
                      </div>
                      <div>
                        <div className="text-orange-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Visit profile</div>
                      </div>
                      <div>
                        <div className="text-orange-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Invit. sent</div>
                      </div>
                      <div>
                        <div className="text-cyan-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Accepted</div>
                      </div>
                      <div>
                        <div className="text-[#3B82F6] font-semibold">0</div>
                        <div className="text-xs text-gray-500">Sent</div>
                      </div>
                      <div>
                        <div className="text-green-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Replies</div>
                      </div>
                    </div>
                  )}

                  {/* Multi-Channel Campaign Layout */}
                  {activeSubTab === "campaigns-multi-channel" && (
                    <div className="grid grid-cols-6 gap-4 p-4">
                      <div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium transition-colors bg-gray-100 text-gray-700 border border-gray-300 w-fit">
                          {campaign.status || 'Draft'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{campaign.name || 'Untitled Campaign'}</div>
                      </div>
                      <div>
                        <div className="text-[#3B82F6] font-semibold">0</div>
                        <div className="text-xs text-gray-500">Email sent</div>
                      </div>
                      <div>
                        <div className="text-orange-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Email Opened</div>
                      </div>
                      <div>
                        <div className="text-cyan-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Invitation accepted</div>
                      </div>
                      <div>
                        <div className="text-green-500 font-semibold">0</div>
                        <div className="text-xs text-gray-500">Replied</div>
                      </div>
                    </div>
                  )}

                </div>
              ))
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

        {/* Chat Widget */}
        <div className="fixed bottom-6 right-6">
          <Button
            className="rounded-full w-14 h-14 shadow-lg"
            style={{ backgroundColor: 'rgb(87, 140, 255)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
            onClick={() => toast({ title: "Chat", description: "Chat support coming soon!" })}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              1
            </div>
          </Button>
        </div>

        {/* Advanced Campaign Popup */}
        <AddCampaignPopup 
          isOpen={showAdvancedPopup}
          onClose={() => setShowAdvancedPopup(false)}
          onComplete={handleAdvancedCampaignComplete}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, campaign: null, isMultiple: false })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Campaign{deleteDialog.isMultiple ? 's' : ''}</DialogTitle>
              <DialogDescription>
                {deleteDialog.isMultiple ? (
                  <>
                    Are you sure you want to delete {selectedCampaignIds.size} campaign(s): <br />
                    <strong>{deleteDialog.campaign?.name}</strong>?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the campaign <strong>"{deleteDialog.campaign?.name}"</strong>?
                  </>
                )}
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, campaign: null, isMultiple: false })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteDialog.isMultiple ? confirmBulkDelete : confirmDeleteCampaign}
              >
                Delete Campaign{deleteDialog.isMultiple ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}