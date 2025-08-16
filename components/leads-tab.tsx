"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  Users, 
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
    <div className={`min-h-screen bg-gray-50/30 p-6 ${selectedContacts.length > 0 ? 'pb-32' : ''}`}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm mb-6">
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-light text-gray-900 tracking-tight">All Contacts</h1>
                  <p className="text-gray-600 text-sm">Manage your contact database</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 rounded-xl px-3 py-1 font-medium">
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
                  className="pl-10 w-64 border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                />
              </div>
              
              <Button 
                variant="outline" 
                className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl px-4 py-3 font-medium"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {filterCount > 0 && (
                  <Badge className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-xl">
                    {filterCount}
                  </Badge>
                )}
              </Button>
              
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                onClick={() => setShowImportModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Import new contacts
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm mb-6">
          <div className="p-8">
            <div className="flex flex-wrap gap-6">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Filter
                </label>
                <Input
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword Filter
                </label>
                <Input
                  placeholder="Filter by keywords..."
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  className="w-full border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                />
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry Filter
                </label>
                <Input
                  placeholder="Filter by industry..."
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocationFilter("")
                    setKeywordFilter("")
                    setIndustryFilter("")
                  }}
                  className="h-11 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl px-4 font-medium"
                >
                  Clear All
                </Button>
              </div>
            </div>
            {filterCount > 0 && (
              <div className="mt-4 text-sm text-gray-600 bg-blue-50/50 border border-blue-100/50 rounded-2xl px-4 py-2">
                <span className="font-medium">{filterCount}</span> filter{filterCount > 1 ? 's' : ''} applied
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/60">
                <th className="text-left p-4">
                  <Checkbox
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Industry</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-2 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse"></div></td>
                    <td className="p-4"><div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="p-4"><div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                    <td className="p-4"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                    <td className="p-4"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <Users2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No contacts found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleSelectContact(contact.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {contact.image_url && (
                            <AvatarImage src={contact.image_url} alt={`${contact.first_name} ${contact.last_name}`} />
                          )}
                          <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                            {getInitials(contact.first_name, contact.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {contact.campaign_name ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs border rounded-full px-2 py-1">
                          {contact.campaign_name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{contact.company || '-'}</p>
                      {contact.title && (
                        <p className="text-sm text-gray-500">{contact.title}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">{contact.location || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500">{contact.industry || '-'}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {contact.linkedin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                            onClick={() => window.open(contact.linkedin, '_blank')}
                          >
                            <Linkedin className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-gray-200">
                            <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this contact?')) {
                                  // Handle single contact deletion
                                  fetch(`/api/contacts/${contact.id}`, { 
                                    method: 'DELETE',
                                    credentials: 'include'
                                  }).then(() => {
                                    fetchContacts()
                                  })
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md rounded-3xl border border-gray-100/20">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-center text-2xl font-light text-gray-900 tracking-tight">
              Select your import source
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-4 p-6 border border-gray-200/50 rounded-2xl hover:bg-gray-50/80 cursor-pointer transition-all duration-200 hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Contacts database</h3>
                <p className="text-sm text-gray-500">Import from existing database</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-6 border border-gray-200/50 rounded-2xl hover:bg-gray-50/80 cursor-pointer transition-all duration-200 hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">CSV import</h3>
                <p className="text-sm text-gray-500">Import your contacts from CSV file</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-6 border border-blue-200/50 rounded-2xl hover:bg-blue-50/80 cursor-pointer transition-all duration-200 hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Linkedin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn import</h3>
                <p className="text-sm text-gray-500">Import contacts from LinkedIn</p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-100/50">
            <button 
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center transition-colors rounded-2xl px-3 py-2 hover:bg-gray-50"
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
        <DialogContent className="max-w-2xl rounded-3xl border border-gray-100/20">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-light text-gray-900 tracking-tight">
              {editingContact.id ? 'Edit Contact' : 'Add New Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
              <Input
                value={editingContact.first_name || ''}
                onChange={(e) => setEditingContact({...editingContact, first_name: e.target.value})}
                placeholder="First name"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
              <Input
                value={editingContact.last_name || ''}
                onChange={(e) => setEditingContact({...editingContact, last_name: e.target.value})}
                placeholder="Last name"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
              <Input
                type="email"
                value={editingContact.email || ''}
                onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                placeholder="email@example.com"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Campaign</label>
              <Select 
                value={editingContact.campaign_id?.toString() || ''} 
                onValueChange={(value) => setEditingContact({...editingContact, campaign_id: value ? parseInt(value) : undefined})}
              >
                <SelectTrigger className="border-gray-200/50 rounded-2xl bg-white/50 h-11">
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
              <Input
                value={editingContact.title || ''}
                onChange={(e) => setEditingContact({...editingContact, title: e.target.value})}
                placeholder="Job title"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Company</label>
              <Input
                value={editingContact.company || ''}
                onChange={(e) => setEditingContact({...editingContact, company: e.target.value})}
                placeholder="Company name"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
              <Input
                value={editingContact.industry || ''}
                onChange={(e) => setEditingContact({...editingContact, industry: e.target.value})}
                placeholder="Industry"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <Input
                value={editingContact.location || ''}
                onChange={(e) => setEditingContact({...editingContact, location: e.target.value})}
                placeholder="City, Country"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">LinkedIn</label>
              <Input
                value={editingContact.linkedin || ''}
                onChange={(e) => setEditingContact({...editingContact, linkedin: e.target.value})}
                placeholder="https://linkedin.com/in/username"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Avatar URL</label>
              <Input
                value={editingContact.image_url || ''}
                onChange={(e) => setEditingContact({...editingContact, image_url: e.target.value})}
                placeholder="https://example.com/avatar.jpg"
                className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100/50">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl px-6 py-3 font-medium"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveContact}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
            >
              {editingContact.id ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selection Bar - appears when contacts are selected */}
      {selectedContacts.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedContacts([])}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear selection
                </button>
                <button 
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Select all
                </button>
                <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-xl">
                  {selectedContacts.length} selected
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Select onValueChange={handleCampaignAssignment}>
                  <SelectTrigger className="w-auto min-w-40 rounded-2xl border-gray-200 bg-white/50">
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
                
                <Button variant="outline" className="text-gray-700 border-gray-200 rounded-2xl px-4 py-2 font-medium" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-2xl px-4 py-2 font-medium" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Footer - only show when no contacts selected */}
      {selectedContacts.length === 0 && (
        <div className="mt-6 bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl">
                {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalContacts)} of {totalContacts} contacts
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="text-gray-600 rounded-2xl h-10 w-10 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, Math.ceil(totalContacts / pageSize)))].map((_, index) => (
                    <Button 
                      key={index + 1}
                      variant="outline" 
                      size="sm" 
                      className={`rounded-2xl h-10 w-10 p-0 font-medium ${
                        currentPage === index + 1 
                          ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700" 
                          : "text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-600 rounded-2xl h-10 w-10 p-0"
                  disabled={!hasMore}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}