"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Search, MoreHorizontal, Reply, Forward, Archive, Trash2, Star, ChevronDown, Zap, Mail, MoreVertical, Send, X, Filter, Users, MessageSquare, RotateCcw } from 'lucide-react'

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
  const [composeMode, setComposeMode] = useState<'reply' | 'forward' | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [forwardTo, setForwardTo] = useState("")
  const [forwardContent, setForwardContent] = useState("")
  
  // Thread expansion state
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [threadMessages, setThreadMessages] = useState<{[key: string]: any[]}>({})
  
  // Campaign-related state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [dateRange, setDateRange] = useState("30")
  
  // Folder counts state
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    sent: 0,
    trash: 0
  })
  
  const { toast } = useToast()

  // Fetch all messages for a thread
  const fetchThreadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/inbox?conversation_id=${encodeURIComponent(conversationId)}`, {
        credentials: 'include'
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        setThreadMessages(prev => ({
          ...prev,
          [conversationId]: result.data
        }))
      } else {
        console.error('Error fetching thread messages:', result.error)
      }
    } catch (error) {
      console.error('Error fetching thread messages:', error)
    }
  }

  // Handle thread expansion
  const handleThreadExpansion = async (conversationId: string) => {
    const isExpanded = expandedThreads.has(conversationId)
    
    if (isExpanded) {
      // Collapse thread
      setExpandedThreads(prev => {
        const newSet = new Set(prev)
        newSet.delete(conversationId)
        return newSet
      })
    } else {
      // Expand thread - fetch all messages if not already loaded
      if (!threadMessages[conversationId]) {
        await fetchThreadMessages(conversationId)
      }
      setExpandedThreads(prev => new Set(prev).add(conversationId))
    }
  }

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
    setSelectedEmail(null) // Clear selected email when fetching new folder
    console.log('🔄 Fetching emails for folder:', selectedFolder)
    try {
      const params = new URLSearchParams()
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedAccount) params.append('account', selectedAccount) // Keep for backward compatibility
      if (selectedCampaign) params.append('campaigns', selectedCampaign) // Fixed: use 'campaigns' not 'campaign_id'
      if (searchQuery) params.append('search', searchQuery)
      if (selectedFolder) params.append('folder', selectedFolder)
      params.append('view', 'threads') // Ensure we use threaded view
      
      console.log('📡 API params:', params.toString())
      
      // Date range filter - Fixed: use date_from instead of start_date
      if (dateRange !== 'custom') {
        const days = parseInt(dateRange)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        params.append('date_from', startDate.toISOString())
      }

      const response = await fetch(`/api/inbox?${params.toString()}`)
      const data = await response.json()
      
      console.log('📧 API response:', { success: data.success, emailCount: data.emails?.length, folder: selectedFolder })
      
      if (data.success && data.emails) {
        // Normalize the email data to handle both old and new property names
        const normalizedEmails = data.emails.map((email: any) => ({
          ...email,
          isRead: email.isRead ?? email.is_read ?? false,
          hasAttachment: email.hasAttachment ?? email.has_attachment ?? false,
          isImportant: email.isImportant ?? email.is_important ?? false,
          isOutOfOffice: email.isOutOfOffice ?? email.is_out_of_office ?? false,
          statusLabel: email.statusLabel ?? email.status_label,
          date: email.date || new Date(email.created_at || Date.now()).toLocaleDateString(),
          // Fix sender/recipient mapping based on actual data structure
          // In inbox_messages: contact_email = who sent TO us, sender_email = our email that received it
          sender: email.sender || email.contact_email,  // External person who sent the email
          to_email: email.to_email || email.sender_email || email.recipient_email,  // Our email address that received it
          // Also ensure we have content/preview fields
          content: email.content || email.body_text || email.body_html,
          preview: email.preview || (email.body_text ? email.body_text.substring(0, 100) + '...' : '')
        }))
        setEmails(normalizedEmails)
        if (normalizedEmails.length > 0 && !selectedEmail) {
          setSelectedEmail(normalizedEmails[0])
        }
      } else if (data.success && !data.emails) {
        // API succeeded but no emails returned
        console.log('📧 No emails returned for folder:', selectedFolder)
        setEmails([])
        setSelectedEmail(null)
      } else {
        // API failed
        console.error('❌ API failed:', data.error)
        setEmails([])
        setSelectedEmail(null)
      }
    } catch (error) {
      console.error('❌ Network error fetching emails:', error)
      setEmails([])
      setSelectedEmail(null)
      // No fallback data - use real API only */
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
  }, [selectedStatus, selectedAccount, selectedCampaign, searchQuery, activeTab, selectedFolder, dateRange])

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email)
    
    // Mark thread as read if it has unread messages
    if (!email.isRead && !email.is_read) {
      try {
        // Mark all unread messages in this conversation as read
        const conversationId = (email as any).conversation_id
        if (conversationId) {
          const response = await fetch(`/api/inbox/threads/${conversationId}/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          })

          if (response.ok) {
            // Update local state - mark this thread as read
            setEmails(prev => prev.map(e => 
              e.id === email.id ? { ...e, isRead: true, is_read: true } : e
            ))
            
            // Refresh folder stats to update badge counts
            fetchFolderStats()
          } else {
            console.error('Failed to mark thread as read:', response.status)
          }
        } else {
          // Fallback: mark individual message as read using latest_message.id
          const messageId = (email as any).latest_message?.id
          if (messageId) {
            const response = await fetch(`/api/inbox/${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ status: 'read' })
            })

            if (response.ok) {
              setEmails(prev => prev.map(e => 
                e.id === email.id ? { ...e, isRead: true, is_read: true } : e
              ))
              fetchFolderStats()
            }
          }
        }
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

  const handleRestore = async () => {
    if (!selectedEmail) return
    
    try {
      console.log('🔄 Restoring email:', { 
        emailId: selectedEmail.id, 
        conversationId: selectedEmail.conversation_id,
        latestMessageId: selectedEmail.latest_message?.id,
        from: selectedFolder, 
        to: 'inbox' 
      })
      // Update ALL messages in the thread/conversation to restore the entire thread
      const conversationId = selectedEmail.conversation_id
      let response
      
      if (conversationId) {
        // Use a special endpoint to update all messages in a conversation
        response = await fetch(`/api/inbox/threads/${conversationId}/move-folder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'inbox' })
        })
      } else {
        // Fallback: update just the latest message
        const messageId = selectedEmail.latest_message?.id || selectedEmail.id
        response = await fetch(`/api/inbox/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'inbox' })
        })
      }
      
      const result = await response.json()
      console.log('📧 Restore response:', result)
      
      if (result.success) {
        // Remove from current list immediately
        const newEmails = emails.filter(e => e.id !== selectedEmail.id)
        setEmails(newEmails)
        setSelectedEmail(newEmails[0] || null)
        
        // Update folder counts
        fetchFolderStats()
        
        // Refresh current folder view to ensure consistency
        setTimeout(() => {
          fetchEmails()
        }, 500)
        
        toast({
          title: "Email restored",
          description: "The email has been restored to inbox"
        })
      } else {
        console.error('❌ Restore API failed:', result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to restore email",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error restoring email:', error)
      toast({
        title: "Error",
        description: "Failed to restore email",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedEmail) return
    
    try {
      if (selectedFolder === 'trash') {
        // Permanently delete if already in trash
        const messageId = selectedEmail.latest_message?.id || selectedEmail.id
        await fetch(`/api/inbox/${messageId}`, {
          method: 'DELETE'
        })
        
        toast({
          title: "Email permanently deleted",
          description: "The email has been permanently deleted"
        })
      } else {
        // Move to trash if not in trash
        console.log('🗑️ Moving email to trash:', { 
          emailId: selectedEmail.id,
          latestMessageId: selectedEmail.latest_message?.id, 
          from: selectedFolder, 
          to: 'trash' 
        })
        // Update ALL messages in the thread/conversation to move the entire thread
        const conversationId = selectedEmail.conversation_id
        let response
        
        if (conversationId) {
          // Use a special endpoint to update all messages in a conversation
          response = await fetch(`/api/inbox/threads/${conversationId}/move-folder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'trash' })
          })
        } else {
          // Fallback: update just the latest message
          const messageId = selectedEmail.latest_message?.id || selectedEmail.id
          response = await fetch(`/api/inbox/${messageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'trash' })
          })
        }
        
        const result = await response.json()
        console.log('📧 Move to trash response:', result)
        
        if (result.success) {
          toast({
            title: "Email moved to trash",
            description: "The email has been moved to trash"
          })
        } else {
          console.error('❌ Move to trash API failed:', result.error)
          toast({
            title: "Error",
            description: result.error || "Failed to move email to trash",
            variant: "destructive"
          })
          return // Don't proceed with local updates if API failed
        }
      }
      
      // Remove from current list
      const newEmails = emails.filter(e => e.id !== selectedEmail.id)
      setEmails(newEmails)
      setSelectedEmail(newEmails[0] || null)
      
      // Update folder counts
      fetchFolderStats()
      
      // Refresh current folder view to ensure consistency
      setTimeout(() => {
        fetchEmails()
      }, 500)
      
    } catch (error) {
      console.error('Error handling email delete:', error)
      toast({
        title: "Error",
        description: selectedFolder === 'trash' 
          ? "Failed to permanently delete email"
          : "Failed to move email to trash",
        variant: "destructive"
      })
    }
  }

  const handleReply = () => {
    if (!selectedEmail) return
    setReplyContent(`\n\n---\nOn ${selectedEmail.date}, ${selectedEmail.sender} wrote:\n${selectedEmail.preview || ''}`)
    setComposeMode('reply')
  }

  const handleForward = () => {
    if (!selectedEmail) return
    setForwardContent(`\n\n--- Forwarded message ---\nFrom: ${selectedEmail.sender}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.preview || ''}`)
    setComposeMode('forward')
  }

  const sendReply = async () => {
    if (!selectedEmail || !replyContent.trim()) return
    
    try {
      // Here you would normally send the email via your email service
      toast({
        title: "Reply sent",
        description: `Your reply to ${selectedEmail.sender} has been sent`
      })
      setComposeMode(null)
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
      setComposeMode(null)
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

  const cancelCompose = () => {
    setComposeMode(null)
    setReplyContent("")
    setForwardContent("")
    setForwardTo("")
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
                  {selectedFolder === 'trash' ? (
                    // Show restore button when viewing trash
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={handleRestore}
                      title="Restore to Inbox"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  ) : (
                    // Show archive button for non-trash folders
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={handleArchive}
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={handleDelete}
                    title={selectedFolder === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
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
                {composeMode === 'forward' ? (
                  <div className="flex items-center">
                    <span className="mr-2">To:</span>
                    <Input 
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="Enter recipient email"
                      className="flex-1 text-sm border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)] h-8"
                    />
                  </div>
                ) : (
                  <div>To: {selectedEmail.to_email || selectedEmail.sender_email || 'Unknown'}</div>
                )}
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

            {/* Email Content or Compose View */}
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {composeMode ? (
                // Compose View
                <div className="space-y-4">
                  <div className="flex items-center justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelCompose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-col h-full">
                    
                    <div 
                      className="flex-1 w-full p-4 text-gray-900 bg-transparent border-none outline-none resize-none"
                      style={{ 
                        minHeight: '400px',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        fontFamily: 'inherit'
                      }}
                    >
                      <textarea
                        value={composeMode === 'reply' ? replyContent : forwardContent}
                        onChange={(e) => composeMode === 'reply' 
                          ? setReplyContent(e.target.value) 
                          : setForwardContent(e.target.value)
                        }
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-900"
                        style={{
                          minHeight: '400px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          fontFamily: 'inherit',
                          fontSize: '14px'
                        }}
                        placeholder={composeMode === 'reply' ? "Type your reply..." : "Add a message..."}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 mt-auto">
                      <Button 
                        className="text-white"
                        style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
                        onClick={composeMode === 'reply' ? sendReply : sendForward}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {composeMode === 'reply' ? 'Send Reply' : 'Forward'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={cancelCompose}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Email Content View
                <div className="prose max-w-none">
                  {selectedEmail.content ? (
                    <div 
                      className="text-gray-900 whitespace-pre-wrap" 
                      style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                    >
                      {selectedEmail.preview || selectedEmail.content?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') || selectedEmail.latest_message?.body_text}
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
              )}
              
              {/* Thread Messages */}
              {!composeMode && selectedEmail && expandedThreads.has(selectedEmail.conversation_id) && threadMessages[selectedEmail.conversation_id] && (
                <div className="border-t border-gray-200 mt-6">
                  <div className="px-6 py-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">
                      Thread Messages ({threadMessages[selectedEmail.conversation_id].length})
                    </h3>
                    <div className="space-y-4">
                      {threadMessages[selectedEmail.conversation_id].map((message, index) => (
                        <div key={message.id} className={`p-4 rounded-lg border ${
                          message.direction === 'outbound' 
                            ? 'bg-blue-50 border-blue-200 ml-8' 
                            : 'bg-gray-50 border-gray-200 mr-8'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                message.direction === 'outbound'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {message.direction === 'outbound' ? 'Sent' : 'Received'}
                              </span>
                              <span className="text-sm text-gray-600">
                                {message.formatted_date}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700">
                            <div 
                              className="whitespace-pre-wrap" 
                              style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                            >
                              {message.body_text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* More messages indicator */}
              {!composeMode && selectedEmail && (() => {
                // Use thread messages count if available, otherwise fall back to selectedEmail.message_count
                const threadMessagesForEmail = threadMessages[selectedEmail.conversation_id] || []
                const totalMessages = threadMessagesForEmail.length > 0 ? threadMessagesForEmail.length : selectedEmail.message_count
                return totalMessages && totalMessages > 1
              })() && (
                <div className="text-center py-4 border-t border-gray-200">
                  <button 
                    onClick={() => handleThreadExpansion(selectedEmail.conversation_id)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center space-x-1"
                  >
                    <span>
                      {(() => {
                        const threadMessagesForEmail = threadMessages[selectedEmail.conversation_id] || []
                        const totalMessages = threadMessagesForEmail.length > 0 ? threadMessagesForEmail.length : selectedEmail.message_count
                        const moreCount = totalMessages - 1
                        
                        return expandedThreads.has(selectedEmail.conversation_id) 
                          ? 'Hide messages' 
                          : `${moreCount} more message${moreCount !== 1 ? 's' : ''}`
                      })()}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      expandedThreads.has(selectedEmail.conversation_id) ? 'rotate-180' : ''
                    }`} />
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!composeMode && (
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
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select an email to view
          </div>
        )}
      </div>

    </div>
  )
}