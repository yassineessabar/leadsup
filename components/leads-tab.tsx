"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Target,
  Database, 
  FileText, 
  Linkedin, 
  ChevronDown, 
  Users2, 
  UserCheck, 
  Zap, 
  UserCog, 
  Download, 
  Trash2, 
  X,
  Edit,
  MapPin,
  Tag
} from 'lucide-react'

interface Prospect {
  id: number
  first_name?: string
  last_name?: string
  email_address?: string
  email_status?: string
  tags?: string
  linkedin_url?: string
  job_title?: string
  location?: string
  company_name?: string
  industry?: string
  notes?: string
  campaign_id?: number
  time_zone?: string
  opted_out?: boolean
  created_at?: string
  updated_at?: string
}

interface Campaign {
  id: number | string
  name: string
  type?: string
  status?: string
}

const emailStatusColors = {
  'Valid': 'bg-green-100 text-green-800',
  'Invalid': 'bg-red-100 text-red-800',
  'Risky': 'bg-yellow-100 text-yellow-800',
  'Unknown': 'bg-gray-100 text-gray-800',
  'Disposable': 'bg-orange-100 text-orange-800',
  'Not found': 'bg-gray-100 text-gray-600',
  'Skipped': 'text-blue-800',
  'Pending': 'text-[rgb(87,140,255)]'
}

export function LeadsTab() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProspects, setSelectedProspects] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProspects, setTotalProspects] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Partial<Prospect>>({})
  const [filterCount, setFilterCount] = useState(0)
  const { toast } = useToast()

  const pageSize = 20

  // Fetch prospects from API
  const fetchProspects = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())

      const response = await fetch(`/api/prospects?${params.toString()}`)
      const data = await response.json()
      
      if (data.prospects) {
        setProspects(data.prospects)
        setTotalProspects(data.total)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
      toast({
        title: "Error",
        description: "Failed to fetch prospects",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      console.log('🔄 Fetching campaigns...')
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      
      console.log('📊 Campaigns API response:', data)
      
      if (data.success && data.data) {
        console.log(`✅ Found ${data.data.length} campaigns:`, data.data.map(c => c.name))
        setCampaigns(data.data)
      } else {
        console.log('⚠️ No campaigns found or API error:', data.error)
        setCampaigns([])
      }
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error)
      setCampaigns([])
    }
  }

  useEffect(() => {
    fetchProspects()
  }, [currentPage])

  useEffect(() => {
    fetchCampaigns()
  }, []) // Run once on component mount

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchProspects()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleCampaignAssignment = async (campaignId: string) => {
    if (selectedProspects.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select prospects to assign to campaign",
        variant: "destructive"
      })
      return
    }

    try {
      const selectedCampaign = campaigns.find(c => c.id.toString() === campaignId)
      if (!selectedCampaign) {
        toast({
          title: "Error",
          description: "Campaign not found",
          variant: "destructive"
        })
        return
      }

      console.log(`Assigning ${selectedProspects.length} prospects to campaign "${selectedCampaign.name}" (ID: ${campaignId})`)

      // Update each selected prospect to assign them to the campaign
      const updatePromises = selectedProspects.map(async (prospectId) => {
        console.log(`🔄 Updating prospect ${prospectId} with campaign_id: ${campaignId} (type: ${typeof campaignId})`)
        
        // Campaign IDs are UUIDs (strings), not integers
        const requestBody = { campaign_id: campaignId }
        console.log(`📋 Request body:`, requestBody)
        
        const response = await fetch(`/api/prospects/${prospectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        const result = await response.json()
        console.log(`📊 Update result for prospect ${prospectId}:`, {
          success: response.ok,
          status: response.status,
          prospect_name: result.prospect ? `${result.prospect.first_name} ${result.prospect.last_name}` : 'Unknown',
          old_campaign_id: result.prospect?.campaign_id,
          error: result.error
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update prospect ${prospectId}: ${result.error || 'Unknown error'}`)
        }
        
        return result
      })

      const results = await Promise.all(updatePromises)
      console.log('✅ All assignments completed successfully. Updated prospects:', 
        results.map(r => ({
          id: r.prospect?.id,
          name: `${r.prospect?.first_name || ''} ${r.prospect?.last_name || ''}`.trim(),
          campaign_id: r.prospect?.campaign_id
        }))
      )

      // Verify assignments worked by checking a sample prospect
      if (results.length > 0) {
        const sampleProspectId = selectedProspects[0]
        console.log(`🔍 Verifying assignment for prospect ${sampleProspectId}...`)
        
        try {
          const verifyResponse = await fetch(`/api/prospects?campaign_id=${campaignId}&limit=5`)
          const verifyData = await verifyResponse.json()
          console.log(`✅ Verification: Found ${verifyData.prospects?.length || 0} prospects for campaign ${campaignId}`)
        } catch (verifyError) {
          console.error('❌ Verification failed:', verifyError)
        }
      }

      toast({
        title: "Campaign Assignment",
        description: `${selectedProspects.length} prospects assigned to campaign "${selectedCampaign.name}"`
      })

      setSelectedProspects([])
      fetchProspects() // Refresh the prospects list
    } catch (error) {
      console.error('Error assigning prospects to campaign:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign prospects to campaign",
        variant: "destructive"
      })
    }
  }

  const handleSelectProspect = (prospectId: number) => {
    setSelectedProspects(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProspects.length === prospects.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(prospects.map(prospect => prospect.id))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProspects.length} selected prospects?`)) return

    try {
      const deletePromises = selectedProspects.map(prospectId =>
        fetch(`/api/prospects/${prospectId}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)

      toast({
        title: "Prospects deleted",
        description: `${selectedProspects.length} prospects have been deleted successfully`
      })

      setSelectedProspects([])
      fetchProspects()
    } catch (error) {
      console.error('Error deleting prospects:', error)
      toast({
        title: "Error",
        description: "Failed to delete prospects",
        variant: "destructive"
      })
    }
  }

  const handleExportCSV = () => {
    const prospectsToExport = selectedProspects.length > 0 
      ? prospects.filter(prospect => selectedProspects.includes(prospect.id))
      : prospects

    const headers = ['First Name', 'Last Name', 'Email', 'Title', 'Company', 'Industry', 'Location', 'LinkedIn', 'Tags', 'Email Status', 'Time Zone', 'Notes']
    const csvContent = [
      headers.join(','),
      ...prospectsToExport.map(prospect => [
        prospect.first_name || '',
        prospect.last_name || '',
        prospect.email_address || '',
        prospect.job_title || '',
        prospect.company_name || '',
        prospect.industry || '',
        prospect.location || '',
        prospect.linkedin_url || '',
        prospect.tags || '',
        prospect.email_status || '',
        prospect.time_zone || '',
        prospect.notes || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `prospects-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export completed",
      description: `${prospectsToExport.length} prospects exported successfully`
    })
  }

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect)
    setShowEditModal(true)
  }

  const saveProspect = async () => {
    try {
      const isEditing = editingProspect.id
      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing ? `/api/prospects/${editingProspect.id}` : '/api/prospects'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProspect)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: isEditing ? "Prospect updated" : "Prospect added",
          description: `Prospect has been ${isEditing ? 'updated' : 'added'} successfully`
        })
        
        setShowEditModal(false)
        setEditingProspect({})
        fetchProspects()
      } else {
        throw new Error(data.error || 'Failed to save prospect')
      }
    } catch (error) {
      console.error('Error saving prospect:', error)
      toast({
        title: "Error",
        description: "Failed to save prospect",
        variant: "destructive"
      })
    }
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || ''
    const last = lastName?.charAt(0)?.toUpperCase() || ''
    return first + last || '??'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    
    if (diffDays < 7) {
      return `${diffDays} days ago`
    }
    return formattedDate
  }

  const getTagsArray = (tags?: string) => {
    if (!tags) return []
    return tags.split(',').map(tag => tag.trim()).filter(Boolean)
  }

  return (
    <div className={`min-h-screen bg-white ${selectedProspects.length > 0 ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-900">All prospects</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {totalProspects}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name, email, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
              />
            </div>
            
            <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {filterCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {filterCount}
                </Badge>
              )}
            </Button>
            
            <Button 
              className="text-white" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              onClick={() => setShowImportModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Import new prospects
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedProspects.length === prospects.length && prospects.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job title
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                LinkedIn
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                  Loading prospects...
                </td>
              </tr>
            ) : prospects.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                  No prospects found
                </td>
              </tr>
            ) : (
              prospects.map((prospect) => (
                <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedProspects.includes(prospect.id)}
                      onCheckedChange={() => handleSelectProspect(prospect.id)}
                    />
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                          {getInitials(prospect.first_name, prospect.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">
                        {prospect.first_name} {prospect.last_name}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-blue-600">
                    {prospect.email_address ? (
                      <a href={`mailto:${prospect.email_address}`} className="hover:underline">
                        {prospect.email_address}
                      </a>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs"
                      >
                        FIND EMAIL
                      </Button>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    {prospect.email_status && (
                      <Badge className={`text-xs ${emailStatusColors[prospect.email_status as keyof typeof emailStatusColors] || 'bg-gray-100 text-gray-800'}`}>
                        {prospect.email_status}
                      </Badge>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                    <div className="truncate" title={prospect.job_title}>
                      {prospect.job_title || "-"}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 truncate max-w-32">
                        {prospect.company_name || "-"}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {prospect.industry || "-"}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {prospect.location ? (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{prospect.location}</span>
                      </div>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    {prospect.linkedin_url ? (
                      <a 
                        href={prospect.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    {prospect.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {getTagsArray(prospect.tags).slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {getTagsArray(prospect.tags).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{getTagsArray(prospect.tags).length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    {prospect.campaign_id ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {campaigns.find(c => c.id === prospect.campaign_id)?.name || `Campaign ${prospect.campaign_id}`}
                      </Badge>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <div>
                      <div>{formatDate(prospect.created_at)}</div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleEditProspect(prospect)}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-medium text-gray-900">
              Select your import source
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Database className="w-6 h-6 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">Prospects database</h3>
                <p className="text-sm text-gray-500">Import from existing database</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <FileText className="w-6 h-6 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">CSV import</h3>
                <p className="text-sm text-gray-500">Import your prospects from CSV file</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Linkedin className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn import</h3>
                <p className="text-sm text-gray-500">Import prospects from LinkedIn</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <button 
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              onClick={() => setShowImportModal(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to prospects
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProspect.id ? 'Edit Prospect' : 'Add New Prospect'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={editingProspect.first_name || ''}
                onChange={(e) => setEditingProspect({...editingProspect, first_name: e.target.value})}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={editingProspect.last_name || ''}
                onChange={(e) => setEditingProspect({...editingProspect, last_name: e.target.value})}
                placeholder="Last name"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editingProspect.email_address || ''}
                onChange={(e) => setEditingProspect({...editingProspect, email_address: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Status</label>
              <Select 
                value={editingProspect.email_status || 'Unknown'} 
                onValueChange={(value) => setEditingProspect({...editingProspect, email_status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(emailStatusColors).map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Campaign</label>
              <Select 
                value={editingProspect.campaign_id?.toString() || ''} 
                onValueChange={(value) => setEditingProspect({...editingProspect, campaign_id: value ? parseInt(value) : undefined})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No campaign</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>{campaign.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Job Title</label>
              <Input
                value={editingProspect.job_title || ''}
                onChange={(e) => setEditingProspect({...editingProspect, job_title: e.target.value})}
                placeholder="Job title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <Input
                value={editingProspect.company_name || ''}
                onChange={(e) => setEditingProspect({...editingProspect, company_name: e.target.value})}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Industry</label>
              <Input
                value={editingProspect.industry || ''}
                onChange={(e) => setEditingProspect({...editingProspect, industry: e.target.value})}
                placeholder="Industry"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={editingProspect.location || ''}
                onChange={(e) => setEditingProspect({...editingProspect, location: e.target.value})}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time Zone</label>
              <Input
                value={editingProspect.time_zone || ''}
                onChange={(e) => setEditingProspect({...editingProspect, time_zone: e.target.value})}
                placeholder="e.g., America/New_York"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">LinkedIn</label>
              <Input
                value={editingProspect.linkedin_url || ''}
                onChange={(e) => setEditingProspect({...editingProspect, linkedin_url: e.target.value})}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Tags</label>
              <Input
                value={editingProspect.tags || ''}
                onChange={(e) => setEditingProspect({...editingProspect, tags: e.target.value})}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editingProspect.notes || ''}
                onChange={(e) => setEditingProspect({...editingProspect, notes: e.target.value})}
                placeholder="Additional notes about this prospect"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveProspect}>
              {editingProspect.id ? 'Save Changes' : 'Add Prospect'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection Bar - appears when prospects are selected */}
      {selectedProspects.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSelectedProspects([])}
                className="text-sm text-red-600 hover:text-red-700 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear selection
              </button>
              <button 
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select all
              </button>
              <span className="text-sm text-gray-600">
                {selectedProspects.length} selected.
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select onValueChange={handleCampaignAssignment}>
                <SelectTrigger className="w-auto min-w-32">
                  <Users2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={campaigns.length > 0 ? "Assign to Campaign" : "No campaigns found"} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-campaigns" disabled>
                      No campaigns available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="text-gray-700 border-gray-300" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Regular Footer - only show when no prospects selected */}
      {selectedProspects.length === 0 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalProspects)} of {totalProspects}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, Math.ceil(totalProspects / pageSize)))].map((_, index) => (
                  <Button 
                    key={index + 1}
                    variant="outline" 
                    size="sm" 
                    className={currentPage === index + 1 ? "bg-blue-50 border-blue-200 text-blue-600" : "text-gray-600"}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="text-gray-600"
                disabled={!hasMore}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}