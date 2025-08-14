"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

interface Contact {
  id: number
  first_name?: string
  last_name?: string
  email?: string
  title?: string
  location?: string
  industry?: string
  linkedin?: string
  image_url?: string
  campaign_id?: number
  campaign_name?: string
  company?: string
  website?: string
  created_at?: string
  updated_at?: string
}

interface Campaign {
  id: number | string
  name: string
  type?: string
  status?: string
}


export function LeadsTab() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Partial<Contact>>({})
  const [filterCount, setFilterCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [locationFilter, setLocationFilter] = useState("")
  const [keywordFilter, setKeywordFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const { toast } = useToast()

  const pageSize = 20

  // Fetch contacts from API (all contacts for the user across all campaigns)
  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())
      
      // Add filter parameters
      if (locationFilter.trim()) params.append('location', locationFilter.trim())
      if (keywordFilter.trim()) params.append('keyword', keywordFilter.trim())
      if (industryFilter.trim()) params.append('industry', industryFilter.trim())

      const response = await fetch(`/api/contacts?${params.toString()}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.contacts) {
        setContacts(data.contacts)
        setTotalContacts(data.total)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
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
      const response = await fetch('/api/campaigns', {
        credentials: 'include'
      })
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
    fetchContacts()
  }, [currentPage])

  useEffect(() => {
    fetchCampaigns()
  }, []) // Run once on component mount

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchContacts()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update filter count when filters change
  useEffect(() => {
    let count = 0
    if (locationFilter.trim()) count++
    if (keywordFilter.trim()) count++
    if (industryFilter.trim()) count++
    setFilterCount(count)
  }, [locationFilter, keywordFilter, industryFilter])

  // Re-fetch contacts when filters change
  useEffect(() => {
    setCurrentPage(1)
    fetchContacts()
  }, [locationFilter, keywordFilter, industryFilter])

  const handleCampaignAssignment = async (campaignId: string) => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select contacts to assign to campaign",
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

      console.log(`Assigning ${selectedContacts.length} contacts to campaign "${selectedCampaign.name}" (ID: ${campaignId})`)

      // Update each selected contact to assign them to the campaign
      const updatePromises = selectedContacts.map(async (contactId) => {
        console.log(`🔄 Updating contact ${contactId} with campaign_id: ${campaignId} (type: ${typeof campaignId})`)
        
        // Campaign IDs are UUIDs (strings), not integers
        const requestBody = { campaign_id: campaignId }
        console.log(`📋 Request body:`, requestBody)
        
        const response = await fetch(`/api/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        })
        
        const result = await response.json()
        console.log(`📊 Update result for contact ${contactId}:`, {
          success: response.ok,
          status: response.status,
          contact_name: result.contact ? `${result.contact.first_name} ${result.contact.last_name}` : 'Unknown',
          old_campaign_id: result.contact?.campaign_id,
          error: result.error
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update contact ${contactId}: ${result.error || 'Unknown error'}`)
        }
        
        return result
      })

      const results = await Promise.all(updatePromises)
      console.log('✅ All assignments completed successfully. Updated contacts:', 
        results.map(r => ({
          id: r.contact?.id,
          name: `${r.contact?.first_name || ''} ${r.contact?.last_name || ''}`.trim(),
          campaign_id: r.contact?.campaign_id
        }))
      )

      // Verify assignments worked by checking a sample contact
      if (results.length > 0) {
        const sampleContactId = selectedContacts[0]
        console.log(`🔍 Verifying assignment for contact ${sampleContactId}...`)
        
        try {
          const verifyResponse = await fetch(`/api/contacts?campaign_id=${campaignId}&limit=5`, {
            credentials: 'include'
          })
          const verifyData = await verifyResponse.json()
          console.log(`✅ Verification: Found ${verifyData.contacts?.length || 0} contacts for campaign ${campaignId}`)
        } catch (verifyError) {
          console.error('❌ Verification failed:', verifyError)
        }
      }

      toast({
        title: "Campaign Assignment",
        description: `${selectedContacts.length} contacts assigned to campaign "${selectedCampaign.name}"`
      })

      setSelectedContacts([])
      fetchContacts() // Refresh the contacts list
    } catch (error) {
      console.error('Error assigning contacts to campaign:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign contacts to campaign",
        variant: "destructive"
      })
    }
  }

  const handleSelectContact = (contactId: number) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(contact => contact.id))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} selected contacts?`)) return

    try {
      const deletePromises = selectedContacts.map(contactId =>
        fetch(`/api/contacts/${contactId}`, { 
          method: 'DELETE',
          credentials: 'include'
        })
      )

      await Promise.all(deletePromises)

      toast({
        title: "Contacts deleted",
        description: `${selectedContacts.length} contacts have been deleted successfully`
      })

      setSelectedContacts([])
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contacts:', error)
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive"
      })
    }
  }

  const handleExportCSV = () => {
    const contactsToExport = selectedContacts.length > 0 
      ? contacts.filter(contact => selectedContacts.includes(contact.id))
      : contacts

    const headers = ['First Name', 'Last Name', 'Email', 'Title', 'Company', 'Industry', 'Location', 'LinkedIn', 'Campaign']
    const csvContent = [
      headers.join(','),
      ...contactsToExport.map(contact => [
        contact.first_name || '',
        contact.last_name || '',
        contact.email || '',
        contact.title || '',
        contact.company || '',
        contact.industry || '',
        contact.location || '',
        contact.linkedin || '',
        contact.campaign_name || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contacts-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export completed",
      description: `${contactsToExport.length} contacts exported successfully`
    })
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setShowEditModal(true)
  }

  const saveContact = async () => {
    try {
      const isEditing = editingContact.id
      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing ? `/api/contacts/${editingContact.id}` : '/api/contacts'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingContact)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: isEditing ? "Contact updated" : "Contact added",
          description: `Contact has been ${isEditing ? 'updated' : 'added'} successfully`
        })
        
        setShowEditModal(false)
        setEditingContact({})
        fetchContacts()
      } else {
        throw new Error(data.error || 'Failed to save contact')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      toast({
        title: "Error",
        description: "Failed to save contact",
        variant: "destructive"
      })
    }
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || ''
    const last = lastName?.charAt(0)?.toUpperCase() || ''
    return first + last || '??'
  }



  return (
    <div className={`min-h-screen bg-white ${selectedContacts.length > 0 ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-medium text-gray-900">All contacts</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {totalContacts}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name, email, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
              />
            </div>
            
            <Button 
              variant="outline" 
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => setShowFilters(!showFilters)}
            >
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
              Import new contacts
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Filter
              </label>
              <Input
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keyword Filter
              </label>
              <Input
                placeholder="Filter by keywords..."
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry Filter
              </label>
              <Input
                placeholder="Filter by industry..."
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocationFilter("")
                  setKeywordFilter("")
                  setIndustryFilter("")
                }}
                className="h-10"
              >
                Clear All
              </Button>
            </div>
          </div>
          {filterCount > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {filterCount} filter{filterCount > 1 ? 's' : ''} applied
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avatar
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                First Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Industry
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                LinkedIn
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  No contacts found
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleSelectContact(contact.id)}
                    />
                  </td>
                  
                  <td className="px-4 py-4">
                    <Avatar className="w-8 h-8">
                      {contact.image_url && (
                        <AvatarImage src={contact.image_url} alt={`${contact.first_name} ${contact.last_name}`} />
                      )}
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                        {getInitials(contact.first_name, contact.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {contact.first_name || "-"}
                  </td>
                  
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {contact.last_name || "-"}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                    <div className="truncate" title={contact.title}>
                      {contact.title || "-"}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-blue-600">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {contact.location ? (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{contact.location}</span>
                      </div>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {contact.industry || "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    {contact.linkedin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs h-7"
                        onClick={() => window.open(contact.linkedin, '_blank')}
                      >
                        <Linkedin className="w-3 h-3 mr-1" />
                        LinkedIn
                      </Button>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    {contact.campaign_name ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {contact.campaign_name}
                      </Badge>
                    ) : "-"}
                  </td>
                  
                  <td className="px-4 py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleEditContact(contact)}
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
                <h3 className="font-medium text-gray-900">Contacts database</h3>
                <p className="text-sm text-gray-500">Import from existing database</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <FileText className="w-6 h-6 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">CSV import</h3>
                <p className="text-sm text-gray-500">Import your contacts from CSV file</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Linkedin className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn import</h3>
                <p className="text-sm text-gray-500">Import contacts from LinkedIn</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <button 
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              onClick={() => setShowImportModal(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to contacts
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingContact.id ? 'Edit Contact' : 'Add New Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={editingContact.first_name || ''}
                onChange={(e) => setEditingContact({...editingContact, first_name: e.target.value})}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={editingContact.last_name || ''}
                onChange={(e) => setEditingContact({...editingContact, last_name: e.target.value})}
                placeholder="Last name"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editingContact.email || ''}
                onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Campaign</label>
              <Select 
                value={editingContact.campaign_id?.toString() || ''} 
                onValueChange={(value) => setEditingContact({...editingContact, campaign_id: value ? parseInt(value) : undefined})}
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
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editingContact.title || ''}
                onChange={(e) => setEditingContact({...editingContact, title: e.target.value})}
                placeholder="Job title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <Input
                value={editingContact.company || ''}
                onChange={(e) => setEditingContact({...editingContact, company: e.target.value})}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Industry</label>
              <Input
                value={editingContact.industry || ''}
                onChange={(e) => setEditingContact({...editingContact, industry: e.target.value})}
                placeholder="Industry"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={editingContact.location || ''}
                onChange={(e) => setEditingContact({...editingContact, location: e.target.value})}
                placeholder="City, Country"
              />
            </div>
            <div className="col-span-1">
              <label className="text-sm font-medium">LinkedIn</label>
              <Input
                value={editingContact.linkedin || ''}
                onChange={(e) => setEditingContact({...editingContact, linkedin: e.target.value})}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="col-span-1">
              <label className="text-sm font-medium">Avatar URL</label>
              <Input
                value={editingContact.image_url || ''}
                onChange={(e) => setEditingContact({...editingContact, image_url: e.target.value})}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveContact}>
              {editingContact.id ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection Bar - appears when contacts are selected */}
      {selectedContacts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSelectedContacts([])}
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
                {selectedContacts.length} selected.
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

      {/* Regular Footer - only show when no contacts selected */}
      {selectedContacts.length === 0 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalContacts)} of {totalContacts}
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
                {[...Array(Math.min(5, Math.ceil(totalContacts / pageSize)))].map((_, index) => (
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