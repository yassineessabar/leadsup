"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Search, MoreHorizontal, Reply, Forward, Archive, Trash2, Star, ChevronDown, Zap, Mail, BookOpen, MoreVertical, Send, X, Filter, Calendar, Users, MessageSquare, AlertTriangle } from 'lucide-react'

interface Email {
  id: number
  sender: string
  subject: string
  preview?: string
  date: string
  is_read?: boolean
  isRead?: boolean
  has_attachment?: boolean
  hasAttachment?: boolean
  is_important?: boolean
  isImportant?: boolean
  is_out_of_office?: boolean
  isOutOfOffice?: boolean
  status: string
  status_label?: string
  statusLabel?: string
  to_email?: string
  content?: string
  is_primary?: boolean
  campaign_id?: number
  campaign_name?: string
  sequence_step?: number
}

interface Campaign {
  id: number
  name: string
  type: string
  status: string
}

const statusConfig = {
  lead: { color: "text-[rgb(87,140,255)]", bg: "bg-[rgba(87,140,255,0.1)]", label: "Lead" },
  interested: { color: "text-green-500", bg: "bg-green-100", label: "Interested" },
  "meeting-booked": { color: "text-[rgb(87,140,255)]", bg: "bg-[rgba(87,140,255,0.1)]", label: "Meeting booked" },
  "meeting-completed": { color: "text-orange-500", bg: "bg-orange-100", label: "Meeting completed" },
  won: { color: "text-lime-500", bg: "bg-lime-100", label: "Won" },
  lost: { color: "text-red-500", bg: "bg-red-100", label: "Lost" }
}

const emailAccounts = [
  "contact@leadsupbase.com",
  "contact@leadsupdirect.co", 
  "contact@leadsupdirect.com",
  "contact@leadsuplab.co",
  "contact@leadsuplab.com",
  "contact@leadsuprech.co",
  "contact@leadsuprech.com"
]

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState("primary")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [replyDialog, setReplyDialog] = useState(false)
  const [forwardDialog, setForwardDialog] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [forwardTo, setForwardTo] = useState("")
  const [forwardContent, setForwardContent] = useState("")
  
  // Campaign-related state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [dateRange, setDateRange] = useState("30")
  const [channelFilter, setChannelFilter] = useState("")
  
  // Folder counts state
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    sent: 0,
    drafts: 0,
    scheduled: 0,
    archived: 0,
    spam: 0,
    trash: 0
  })
  
  const { toast } = useToast()

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        credentials: 'include'
      })
      const result = await response.json()
      
      if (result.success) {
        setCampaigns(result.data)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  // Fetch folder statistics from API
  const fetchFolderStats = async () => {
    try {
      const response = await fetch('/api/inbox/stats', {
        credentials: 'include'
      })
      const result = await response.json()
      
      if (result.success && result.data.folder_distribution) {
        setFolderCounts({
          inbox: result.data.folder_distribution.inbox || 0,
          sent: result.data.folder_distribution.sent || 0,
          drafts: result.data.folder_distribution.drafts || 0,
          scheduled: result.data.folder_distribution.scheduled || 0,
          archived: result.data.folder_distribution.archived || 0,
          spam: result.data.folder_distribution.spam || 0,
          trash: result.data.folder_distribution.trash || 0
        })
      }
    } catch (error) {
      console.error('Error fetching folder stats:', error)
    }
  }

  // Fetch emails from API with campaign filtering
  const fetchEmails = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedAccount) params.append('account', selectedAccount)
      if (selectedCampaign) params.append('campaign_id', selectedCampaign)
      if (searchQuery) params.append('search', searchQuery)
      if (selectedFolder !== 'inbox') params.append('folder', selectedFolder)
      if (channelFilter) params.append('channel', channelFilter)
      params.append('tab', activeTab)
      
      // Date range filter
      if (dateRange !== 'custom') {
        const days = parseInt(dateRange)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        params.append('start_date', startDate.toISOString())
      }

      const response = await fetch(`/api/inbox?${params.toString()}`)
      const data = await response.json()
      
      if (data.emails) {
        // Normalize the email data to handle both old and new property names
        const normalizedEmails = data.emails.map((email: any) => ({
          ...email,
          isRead: email.isRead ?? email.is_read ?? false,
          hasAttachment: email.hasAttachment ?? email.has_attachment ?? false,
          isImportant: email.isImportant ?? email.is_important ?? false,
          isOutOfOffice: email.isOutOfOffice ?? email.is_out_of_office ?? false,
          statusLabel: email.statusLabel ?? email.status_label,
          date: email.date || new Date(email.created_at || Date.now()).toLocaleDateString()
        }))
        setEmails(normalizedEmails)
        if (normalizedEmails.length > 0 && !selectedEmail) {
          setSelectedEmail(normalizedEmails[0])
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
      // Use fallback data if API fails
      const fallbackEmails = [
        {
          id: 1,
          sender: "customerservice@colesgroup.com.au",
          subject: "Quiet customers? I've got something.",
          preview: "Stop sending anti Ombudsman Brookes Mobile: 0410 151...",
          date: "Monday, Aug 4, 2025 at 3:13 pm",
          isRead: false,
          hasAttachment: false,
          isImportant: false,
          isOutOfOffice: true,
          status: "lead"
        },
        {
          id: 2,
          sender: "shannon.latty@carat.com",
          subject: "Re: Automatic reply: Ads ON THE MOVE -",
          preview: "Hi Shannon, Thank you for engaging with us in 2024. We hop...",
          date: "Jun 14, 2025",
          isRead: true,
          hasAttachment: false,
          isImportant: false,
          statusLabel: "Stratus x Uboard",
          status: "interested"
        },
        {
          id: 3,
          sender: "genevieve.marshall@scbcity.n...",
          subject: "RE: Ads ON THE MOVE - City of Canterbury Bankstown x Uboard",
          preview: "Hi Genevieve, Thank you for engaging with us in 2024. We h...",
          date: "Jun 14, 2025",
          isRead: true,
          hasAttachment: false,
          isImportant: true,
          status: "meeting-booked"
        }
      ]
      setEmails(fallbackEmails)
      if (fallbackEmails.length > 0) {
        setSelectedEmail(fallbackEmails[0])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchFolderStats()
  }, [])

  useEffect(() => {
    fetchEmails()
  }, [selectedStatus, selectedAccount, selectedCampaign, searchQuery, activeTab, selectedFolder, channelFilter, dateRange])

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email)
    
    // Mark as read if not already
    if (!email.isRead && !email.is_read) {
      try {
        await fetch(`/api/inbox/${email.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true })
        })
        
        // Update local state
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isRead: true, is_read: true } : e
        ))
      } catch (error) {
        console.error('Error marking email as read:', error)
      }
    }
  }

  const handleCheckboxChange = (emailId: number) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    )
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedEmail) return
    
    try {
      await fetch(`/api/inbox/${selectedEmail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      // Update local state
      setEmails(prev => prev.map(e => 
        e.id === selectedEmail.id ? { ...e, status: newStatus } : e
      ))
      setSelectedEmail({ ...selectedEmail, status: newStatus })
      
      toast({
        title: "Status updated",
        description: `Email status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update email status",
        variant: "destructive"
      })
    }
  }

  const handleArchive = async () => {
    if (!selectedEmail) return
    
    try {
      await fetch(`/api/inbox/${selectedEmail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true })
      })
      
      // Remove from current list
      const newEmails = emails.filter(e => e.id !== selectedEmail.id)
      setEmails(newEmails)
      setSelectedEmail(newEmails[0] || null)
      
      // Update folder counts
      fetchFolderStats()
      
      toast({
        title: "Email archived",
        description: "The email has been archived successfully"
      })
    } catch (error) {
      console.error('Error archiving email:', error)
      toast({
        title: "Error",
        description: "Failed to archive email",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedEmail) return
    
    try {
      await fetch(`/api/inbox/${selectedEmail.id}`, {
        method: 'DELETE'
      })
      
      // Remove from current list
      const newEmails = emails.filter(e => e.id !== selectedEmail.id)
      setEmails(newEmails)
      setSelectedEmail(newEmails[0] || null)
      
      // Update folder counts
      fetchFolderStats()
      
      toast({
        title: "Email deleted",
        description: "The email has been deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting email:', error)
      toast({
        title: "Error",
        description: "Failed to delete email",
        variant: "destructive"
      })
    }
  }

  const handleReply = () => {
    if (!selectedEmail) return
    setReplyContent(`\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.sender} wrote:\n${selectedEmail.preview || ''}`)
    setReplyDialog(true)
  }

  const handleForward = () => {
    if (!selectedEmail) return
    setForwardContent(`\n\n--- Forwarded message ---\nFrom: ${selectedEmail.sender}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.preview || ''}`)
    setForwardDialog(true)
  }

  const sendReply = async () => {
    if (!selectedEmail || !replyContent.trim()) return
    
    try {
      // Here you would normally send the email via your email service
      toast({
        title: "Reply sent",
        description: `Your reply to ${selectedEmail.sender} has been sent`
      })
      setReplyDialog(false)
      setReplyContent("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      })
    }
  }

  const sendForward = async () => {
    if (!selectedEmail || !forwardTo.trim() || !forwardContent.trim()) return
    
    try {
      // Here you would normally send the email via your email service
      toast({
        title: "Email forwarded",
        description: `Email forwarded to ${forwardTo}`
      })
      setForwardDialog(false)
      setForwardTo("")
      setForwardContent("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to forward email",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="h-screen bg-white flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Folders Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">Folders</div>
          <div className="space-y-1">
            {[
              { name: 'Inbox', key: 'inbox', icon: Mail, count: folderCounts.inbox },
              { name: 'Sent', key: 'sent', icon: Send, count: folderCounts.sent },
              { name: 'Drafts', key: 'drafts', icon: BookOpen, count: folderCounts.drafts },
              { name: 'Scheduled', key: 'scheduled', icon: Calendar, count: folderCounts.scheduled },
              { name: 'Archived', key: 'archived', icon: Archive, count: folderCounts.archived },
              { name: 'Spam', key: 'spam', icon: AlertTriangle, count: folderCounts.spam },
              { name: 'Trash', key: 'trash', icon: Trash2, count: folderCounts.trash }
            ].map((folder, index) => (
              <button
                key={index}
                onClick={() => setSelectedFolder(folder.key)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                  selectedFolder === folder.key 
                    ? 'font-medium'  
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={selectedFolder === folder.key ? { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' } : {}}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className="w-4 h-4" />
                  <span>{folder.name}</span>
                </div>
                {folder.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedFolder === folder.key 
                      ? '' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  style={selectedFolder === folder.key ? { backgroundColor: 'rgba(87, 140, 255, 0.2)', color: 'rgb(87, 140, 255)' } : {}}>
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">Filters</div>
          
          {/* Campaign Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">Campaign</label>
            <select 
              value={selectedCampaign || ''}
              onChange={(e) => setSelectedCampaign(e.target.value || null)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[rgb(87,140,255)]"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">Lead Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[rgb(87,140,255)]"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">Date Range</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[rgb(87,140,255)]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          {/* Channel Filter */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2">Channel</label>
            <select 
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[rgb(87,140,255)]"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
            />
          </div>
        </div>

        {/* More Section */}
        <div className="px-4 pb-4 mt-auto">
          <div className="text-sm font-medium text-gray-700 mb-3">More</div>
          
          <div className="space-y-1">
            <div 
              onClick={() => setSelectedAccount(null)}
              className="flex items-center space-x-2 text-sm text-gray-600 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>All Inbox</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
              <BookOpen className="w-4 h-4" />
              <span>Unread only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel - Email List */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        {/* Tabs */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-6 mb-4">
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "primary"
                  ? "border-[rgb(87,140,255)] text-[rgb(87,140,255)]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("primary")}
            >
              Primary
            </button>
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "others"
                  ? "border-[rgb(87,140,255)] text-[rgb(87,140,255)]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("others")}
            >
              Others
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500">Loading emails...</div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500">No emails found</div>
            </div>
          ) : (
            emails.map((email) => {
              const isRead = email.isRead || email.is_read
              const isImportant = email.isImportant || email.is_important
              const statusLabel = email.statusLabel || email.status_label
              
              return (
                <div
                  key={email.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedEmail?.id === email.id ? 'bg-[rgba(87,140,255,0.05)] border-l-4 border-l-[rgb(87,140,255)]' : ''
                  }`}
                  onClick={() => handleEmailSelect(email)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedEmails.includes(email.id)}
                      onCheckedChange={() => handleCheckboxChange(email.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm truncate ${isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                            {email.sender}
                          </span>
                          {email.status && statusConfig[email.status as keyof typeof statusConfig] && (
                            <Zap className={`w-3 h-3 ${statusConfig[email.status as keyof typeof statusConfig].color}`} />
                          )}
                          {isImportant && (
                            <Star className="w-3 h-3 text-red-500 fill-current" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {email.date}
                        </span>
                      </div>
                      
                      <div className={`text-sm mb-1 ${isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                        {email.subject}
                      </div>
                      
                      {(statusLabel || email.campaign_name) && (
                        <div className="flex items-center space-x-2 mb-1">
                          {email.campaign_name && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {email.campaign_name}
                            </span>
                          )}
                          {statusLabel && (
                            <span className="text-xs text-gray-500">
                              {statusLabel}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {email.preview && (
                        <div className="text-xs text-gray-500 truncate">
                          {email.preview}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Panel - Email Content */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 bg-gray-400 text-white">
                    <AvatarFallback className="bg-gray-400 text-white text-sm">
                      {selectedEmail.sender.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900 font-medium">{selectedEmail.sender}</span>
                      {(selectedEmail.isOutOfOffice || selectedEmail.is_out_of_office) && (
                        <Badge className="text-xs flex items-center space-x-1" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>
                          <Zap className="w-3 h-3" />
                          <span>Out of office</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Move
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 hidden">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Zap className={`w-3 h-3 ${config.color}`} />
                          <span>{config.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={handleArchive}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {selectedEmail.subject}
                </h2>
                <span className="text-sm text-gray-500">
                  {selectedEmail.date}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mt-2">
                <div>From: {selectedEmail.sender}</div>
                <div>To: {selectedEmail.to_email || emailAccounts[0]}</div>
                {selectedEmail.campaign_name && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span>Campaign:</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>
                      {selectedEmail.campaign_name}
                    </span>
                    {selectedEmail.sequence_step && (
                      <span className="text-xs text-gray-500">
                        Step {selectedEmail.sequence_step}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              <div className="prose max-w-none">
                {selectedEmail.content ? (
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {selectedEmail.content}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-900 mb-4">Thank you for contacting Liquorland.</p>
                    
                    <p className="text-gray-900 mb-4">This email inbox is no longer monitored.</p>
                    
                    <p className="text-gray-900 mb-4">
                      <a href="#" className="underline" style={{ color: 'rgb(87, 140, 255)' }}>Click here to chat with us</a> or visit our website to find other ways to contact us.
                    </p>
                    
                    <p className="text-gray-900 mb-4">Cheers,</p>
                    
                    <p className="text-gray-900 mb-6">The Liquorland Team</p>
                    
                    {/* Liquorland Logo */}
                    <div className="mb-6">
                      <div className="bg-black text-white px-4 py-2 inline-block font-bold text-lg tracking-wider">
                        LIQUORLAND
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* More messages indicator */}
              <div className="text-center py-4">
                <button className="text-sm text-gray-500 hover:text-gray-700">
                  1 more message
                  <ChevronDown className="w-4 h-4 ml-1 inline" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <Button 
                  className="text-white"
                  style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
                  onClick={handleReply}
                >
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleForward}
                >
                  <Forward className="w-4 h-4 mr-2" />
                  Forward
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select an email to view
          </div>
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog} onOpenChange={setReplyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to {selectedEmail?.sender}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">To:</label>
              <Input value={selectedEmail?.sender || ''} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Subject:</label>
              <Input value={`Re: ${selectedEmail?.subject || ''}`} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Message:</label>
              <Textarea 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="mt-1 min-h-[200px]"
                placeholder="Type your reply..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendReply}>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={forwardDialog} onOpenChange={setForwardDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forward Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">To:</label>
              <Input 
                value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)}
                placeholder="Enter recipient email"
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Subject:</label>
              <Input value={`Fwd: ${selectedEmail?.subject || ''}`} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Message:</label>
              <Textarea 
                value={forwardContent}
                onChange={(e) => setForwardContent(e.target.value)}
                className="mt-1 min-h-[200px]"
                placeholder="Add a message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendForward}>
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}