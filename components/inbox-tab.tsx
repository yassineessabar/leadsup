"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from '@/hooks/use-i18n'
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
  // All hooks must be declared BEFORE any early returns
  const { t, ready } = useI18n()
  
  
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
  
  // Ref for textarea auto-focus
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-focus textarea when compose mode is activated
  useEffect(() => {
    if (composeMode && replyTextareaRef.current) {
      setTimeout(() => {
        replyTextareaRef.current?.focus()
      }, 100)
    }
  }, [composeMode])
  
  // Campaign-related state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [dateRange, setDateRange] = useState("30")
  
  // Folder counts state - these are unread counts for badges
  const [folderCounts, setFolderCounts] = useState({
    inbox: 0,
    sent: 0,
    trash: 0
  })
  
  const { toast } = useToast()

  // ALL hooks must be declared before any early returns
  const fetchCampaigns = useCallback(async () => {
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
  }, [])

  const fetchFolderStats = useCallback(async () => {
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
  }, [])

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        folder: selectedFolder || 'inbox',
        range: dateRange || '30'
      })

      if (selectedStatus) queryParams.append('status', selectedStatus)
      if (selectedCampaign) queryParams.append('campaign_id', selectedCampaign)
      if (searchQuery) queryParams.append('search', searchQuery)
      if (selectedAccount) queryParams.append('account', selectedAccount)

      const response = await fetch(`/api/inbox?${queryParams}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      console.log('Inbox API response:', result)
      
      if (result.success && result.emails) {
        setEmails(result.emails)
      } else {
        console.error('API error fetching emails:', {
          success: result.success,
          error: result.error,
          fullResponse: result
        })
        setEmails([])
      }

      setSelectedEmail(null)
      // No fallback data - use real API only */
    } catch (error) {
      console.error('Error fetching emails:', error || 'Unknown error')
      setEmails([])
      setSelectedEmail(null)
      // No fallback data - use real API only */
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, selectedAccount, selectedCampaign, searchQuery, selectedFolder, dateRange])

  useEffect(() => {
    fetchCampaigns()
    fetchFolderStats()
  }, [fetchCampaigns, fetchFolderStats])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])
  
  // Early return AFTER all hooks are declared
  if (!ready) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 dark:text-gray-400">{t ? t('common.loading') : 'Loading...'}</div>
    </div>
  }

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


  // Helper function to replace template variables with actual values
  const replaceTemplateVariables = (content: string, email: Email, message?: any): string => {
    if (!content) return content
    
    // Extract data from email object and message if provided
    const firstName = email.contact_name?.split(' ')[0] || 'there'
    const lastName = email.contact_name?.split(' ')[1] || ''
    // Try to get company name from message first, then email sources
    const companyName = message?.campaign?.company_name ||
                       (email as any).latest_message?.campaign?.company_name || 
                       (email as any).campaign?.company_name || 
                       (email as any).company_name || 
                       'your company'
    const contactEmail = email.contact_email || ''
    
    // Replace variables (case insensitive)
    let replacedContent = content
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{lastName\}\}/gi, lastName) 
      .replace(/\{\{last_name\}\}/gi, lastName)
      .replace(/\{\{company\}\}/gi, companyName)
      .replace(/\{\{companyName\}\}/gi, companyName)
      .replace(/\{\{company_name\}\}/gi, companyName)
      .replace(/\{\{email\}\}/gi, contactEmail)
      .replace(/\{\{contactEmail\}\}/gi, contactEmail)
      .replace(/\{\{contact_email\}\}/gi, contactEmail)
    
    return replacedContent
  }

  // Helper function to get full email content with variable replacement
  const getFullEmailContent = (email: Email): string => {
    // For sent emails (outbound), we want to show the full content with variables replaced
    if (email.direction === 'outbound' || (email as any).folder === 'sent') {
      // Try to get the full body content from latest_message first, then fallback to thread data
      let fullContent = (email as any).latest_message?.body_text || 
                       (email as any).latest_message?.body_html || 
                       email.content ||
                       email.preview ||
                       'No content available'
      
      // Replace template variables with actual values for sent emails
      return replaceTemplateVariables(fullContent, email)
    } else {
      // For received emails (inbound), show content as-is
      return (email as any).latest_message?.body_text || 
             email.content?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') || 
             email.preview ||
             'No content available'
    }
  }

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email)
    
    // Auto-expand thread if it has multiple messages
    const conversationId = (email as any).conversation_id
    if (conversationId) {
      const threadMessagesForEmail = threadMessages[conversationId]
      const totalMessages = threadMessagesForEmail && Array.isArray(threadMessagesForEmail) 
        ? threadMessagesForEmail.length 
        : (email as any).message_count
      
      // Always auto-expand thread to show full conversation context
      if (conversationId && !expandedThreads.has(conversationId)) {
        // Fetch thread messages if not already loaded
        if (!threadMessages[conversationId]) {
          await fetchThreadMessages(conversationId)
        }
        // Expand the thread
        setExpandedThreads(prev => new Set(prev).add(conversationId))
      }
    }
    
    // Mark thread as read if it has unread messages
    if (!email.isRead && !email.is_read) {
      try {
        // Mark all unread messages in this conversation as read
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
            
            // Update folder counts immediately for real-time badge updates
            setFolderCounts(prev => ({
              ...prev,
              [selectedFolder]: Math.max(0, prev[selectedFolder] - 1)
            }))
            
            // Dispatch inbox update event for sidebar badge refresh
            window.dispatchEvent(new CustomEvent('inbox-updated'))
            
            // Refresh folder stats to sync with server
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
              
              // Update folder counts immediately for real-time badge updates
              setFolderCounts(prev => ({
                ...prev,
                [selectedFolder]: Math.max(0, prev[selectedFolder] - 1)
              }))
              
              // Dispatch inbox update event for sidebar badge refresh
              window.dispatchEvent(new CustomEvent('inbox-updated'))
              
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

  const handleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      // Deselect all
      setSelectedEmails([])
    } else {
      // Select all
      setSelectedEmails(emails.map(email => email.id))
    }
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

  const handleBulkDelete = async () => {
    if (selectedEmails.length === 0) return
    
    try {
      const emailsToDelete = emails.filter(email => selectedEmails.includes(email.id))
      
      if (selectedFolder === 'trash') {
        // Permanently delete if already in trash
        console.log('💀 Permanently deleting emails...', emailsToDelete)
        const deleteResults = []
        
        for (const email of emailsToDelete) {
          try {
            // Use the actual message ID from the email object
            const messageId = email.latest_message?.id || email.message_id || email.id
            console.log(`🗑️ Permanently deleting message: ${messageId} (from email: ${email.id})`)
            
            const response = await fetch(`/api/inbox/${messageId}?permanent=true`, { 
              method: 'DELETE' 
            })
            const result = await response.json()
            
            if (!response.ok) {
              console.error(`❌ Failed to delete message ${messageId}:`, result)
              throw new Error(result.error || 'Delete failed')
            }
            
            deleteResults.push({ success: true, messageId, email: email.id })
            console.log(`✅ Successfully deleted message: ${messageId}`)
            
          } catch (error) {
            console.error(`❌ Error deleting email ${email.id}:`, error)
            deleteResults.push({ success: false, error: error.message, email: email.id })
          }
        }
        
        const successCount = deleteResults.filter(r => r.success).length
        const failCount = deleteResults.filter(r => !r.success).length
        
        console.log(`🎯 Delete results: ${successCount} success, ${failCount} failed`)
        
        toast({
          title: successCount > 0 ? "Emails permanently deleted" : "Delete failed",
          description: successCount > 0 ? 
            `${successCount} emails permanently deleted` + (failCount > 0 ? ` (${failCount} failed)` : '') :
            `Failed to delete ${failCount} emails`,
          variant: failCount > 0 && successCount === 0 ? "destructive" : "default"
        })
      } else {
        // Move to trash if not in trash
        const movePromises = emailsToDelete.map(email => {
          const conversationId = email.conversation_id
          if (conversationId) {
            return fetch(`/api/inbox/threads/${conversationId}/move-folder`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folder: 'trash' })
            })
          } else {
            const messageId = email.latest_message?.id || email.id
            return fetch(`/api/inbox/${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folder: 'trash' })
            })
          }
        })
        
        await Promise.all(movePromises)
        
        toast({
          title: "Emails moved to trash",
          description: `${selectedEmails.length} emails have been moved to trash`
        })
      }
      
      // Refresh emails and clear selection
      setSelectedEmails([])
      await fetchEmails()
      fetchFolderStats()
      
    } catch (error) {
      console.error('Error handling bulk delete:', error)
      toast({
        title: "Error",
        description: "Failed to delete emails",
        variant: "destructive"
      })
    }
  }

  const handleBulkRestore = async () => {
    if (selectedEmails.length === 0) return
    
    try {
      const emailsToRestore = emails.filter(email => selectedEmails.includes(email.id))
      
      const restorePromises = emailsToRestore.map(email => {
        const conversationId = email.conversation_id
        if (conversationId) {
          return fetch(`/api/inbox/threads/${conversationId}/move-folder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'inbox' })
          })
        } else {
          const messageId = email.latest_message?.id || email.id
          return fetch(`/api/inbox/${messageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'inbox' })
          })
        }
      })
      
      await Promise.all(restorePromises)
      
      toast({
        title: "Emails restored",
        description: `${selectedEmails.length} emails have been restored to inbox`
      })
      
      // Remove from current list and clear selection
      const newEmails = emails.filter(e => !selectedEmails.includes(e.id))
      setEmails(newEmails)
      setSelectedEmails([])
      setSelectedEmail(newEmails[0] || null)
      
      // Update folder counts and refresh
      fetchFolderStats()
      setTimeout(() => fetchEmails(), 500)
      
    } catch (error) {
      console.error('Error handling bulk restore:', error)
      toast({
        title: "Error",
        description: "Failed to restore emails",
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
      // Get the actual message ID and contact email
      const messageId = (selectedEmail as any).latest_message?.id || selectedEmail.id
      const toEmail = (selectedEmail as any).contact_email || selectedEmail.sender
      
      // Call the inbox actions API to save and send the reply
      const response = await fetch('/api/inbox/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reply',
          message_id: messageId,
          data: {
            subject: selectedEmail.subject,
            body: replyContent,
            to_email: toEmail
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Now actually send the email via SendGrid
        const sendResponse = await fetch('/api/automation/send-single-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            to_email: toEmail,
            subject: `Re: ${selectedEmail.subject}`,
            body_html: replyContent.replace(/\n/g, '<br>'),
            body_text: replyContent,
            from_email: (selectedEmail as any).sender_email || 'noreply@leadsup.io',
            reply_message_id: result.data?.results?.[0]?.reply_id
          })
        })

        const sendResult = await sendResponse.json()
        
        if (sendResult.success) {
          toast({
            title: "Reply sent successfully",
            description: `Your reply to ${toEmail} has been sent and saved`
          })
          
          // Refresh the emails list to show the new reply
          fetchEmails()
          
          // Dispatch inbox update event for badge refresh
          window.dispatchEvent(new CustomEvent('inbox-updated'))
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } else {
        throw new Error(result.error || 'Failed to save reply')
      }
      
      setComposeMode(null)
      setReplyContent("")
    } catch (error) {
      console.error('Error sending reply:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reply",
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
    <div className="h-screen bg-gray-50 dark:bg-gray-800/30 dark:bg-gray-900/30 flex gap-6 p-6">
      {/* Left Sidebar */}
      <div className="w-72 bg-white dark:bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800/20 dark:border-gray-800/20 rounded-3xl flex flex-col shadow-sm">
        {/* Folders Section */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800/50 dark:border-gray-800/50">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-4">{t('inbox.folders')}</div>
          <div className="space-y-2">
            {[
              { name: t('inbox.inbox'), key: 'inbox', icon: Mail, count: folderCounts.inbox },
              { name: t('inbox.sent'), key: 'sent', icon: Send, count: folderCounts.sent },
              { name: t('inbox.trash'), key: 'trash', icon: Trash2, count: folderCounts.trash }
            ].map((folder, index) => (
              <button
                key={index}
                onClick={() => setSelectedFolder(folder.key)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left rounded-2xl transition-all duration-200 ${
                  selectedFolder === folder.key 
                    ? 'bg-blue-50/80 text-blue-600 font-medium shadow-sm'  
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className="w-4 h-4" />
                  <span>{folder.name}</span>
                </div>
                {folder.count > 0 && (
                  <span className="text-xs px-2 py-1 rounded-xl font-medium bg-blue-500 text-white">
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800/50">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">{t('inbox.filters')}</div>
          
          {/* Campaign Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('inbox.campaign')}</label>
            <select 
              value={selectedCampaign || ''}
              onChange={(e) => setSelectedCampaign(e.target.value || null)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-900/50"
            >
              <option value="">{t('inbox.allCampaigns')}</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('inbox.leadStatus')}</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-900/50"
            >
              <option value="">{t('inbox.allStatuses')}</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('inbox.dateRange')}</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-900/50"
            >
              <option value="7">{t('inbox.last7Days')}</option>
              <option value="30">{t('inbox.last30Days')}</option>
              <option value="90">{t('inbox.last90Days')}</option>
              <option value="custom">{t('inbox.customRange')}</option>
            </select>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('inbox.searchMessages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm border-gray-200 dark:border-gray-700/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white dark:bg-gray-900/50 h-11"
            />
          </div>
        </div>
      </div>

      {/* Middle Panel - Email List */}
      <div className="w-96 bg-white dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800/20 rounded-3xl flex flex-col shadow-sm">
        {/* Tabs */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex space-x-6 mb-4">
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "primary"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setActiveTab("primary")}
            >
              {t('inbox.primary')}
            </button>
            <button
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "others"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setActiveTab("others")}
            >
              {t('inbox.others')}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('inbox.searchMail')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200 dark:border-gray-700/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white dark:bg-gray-900/50 h-11"
            />
          </div>
        </div>

        {/* Select All Bar */}
        {emails.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={selectedEmails.length > 0 && selectedEmails.length === emails.length}
                indeterminate={selectedEmails.length > 0 && selectedEmails.length < emails.length ? true : undefined}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedEmails.length === 0 
                  ? `Select all ${emails.length} emails` 
                  : selectedEmails.length === emails.length
                  ? `All ${emails.length} emails selected`
                  : `${selectedEmails.length} of ${emails.length} emails selected`
                }
              </span>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedEmails.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800/50 bg-blue-50/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {selectedEmails.length} email{selectedEmails.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                {selectedFolder === 'trash' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRestore}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Forever
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmails([])}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('inbox.loadingEmails')}</div>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="text-sm text-gray-500 dark:text-gray-400">{t('inbox.noEmailsFound')}</div>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {emails.map((email) => {
                const isRead = email.isRead || email.is_read
                const isImportant = email.isImportant || email.is_important
                const statusLabel = email.statusLabel || email.status_label
                
                return (
                  <div
                    key={email.id}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      selectedEmail?.id === email.id 
                        ? 'bg-blue-50/80 border-blue-200/50 shadow-sm' 
                        : !isRead 
                        ? 'bg-blue-50/60 border-blue-200/30 shadow-sm' // Unread emails get blue background
                        : 'border-transparent hover:bg-gray-50 dark:bg-gray-800/80 hover:border-gray-100 dark:border-gray-800/50'
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
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span className={`text-sm truncate ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                              {email.sender}
                            </span>
                            {email.status && statusConfig[email.status as keyof typeof statusConfig] && (
                              <Zap className={`w-3 h-3 flex-shrink-0 ${statusConfig[email.status as keyof typeof statusConfig].color}`} />
                            )}
                            {isImportant && (
                              <Star className="w-3 h-3 text-red-500 fill-current flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                            {email.date}
                          </span>
                        </div>
                        
                        <div className={`text-sm mb-2 ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                          {email.subject}
                        </div>
                        
                        {(statusLabel || email.campaign_name) && (
                          <div className="flex items-center space-x-2 mb-2">
                            {email.campaign_name && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-xl font-medium">
                                {email.campaign_name}
                              </span>
                            )}
                            {statusLabel && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {statusLabel}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {email.preview && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {email.preview}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Email Content */}
      <div className="flex-1 bg-white dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800/20 rounded-3xl flex flex-col shadow-sm">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-10 h-10 ring-2 ring-gray-100">
                    <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                      {selectedEmail.sender.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base text-gray-900 dark:text-gray-100 font-medium">{selectedEmail.sender}</span>
                      {(selectedEmail.isOutOfOffice || selectedEmail.is_out_of_office) && (
                        <Badge className="text-xs flex items-center space-x-1 bg-blue-100 text-blue-700 rounded-xl">
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
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-2xl h-10 w-10 p-0"
                      onClick={handleRestore}
                      title={t('inbox.restoreToInbox')}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  ) : (
                    // Show archive button for non-trash folders
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-2xl h-10 w-10 p-0"
                      onClick={handleArchive}
                      title={t('inbox.archive')}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-2xl h-10 w-10 p-0"
                    onClick={handleDelete}
                    title={selectedFolder === 'trash' ? 'Delete Permanently' : 'Move to Trash'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-light text-gray-900 dark:text-gray-100 tracking-tight">
                  {selectedEmail.subject}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedEmail.date}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>From: {selectedEmail.sender}</div>
                {composeMode === 'forward' ? (
                  <div className="flex items-center">
                    <span className="mr-2">To:</span>
                    <Input 
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="Enter recipient email"
                      className="flex-1 text-sm border-gray-200 dark:border-gray-700/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 h-8 bg-white dark:bg-gray-900/50"
                    />
                  </div>
                ) : (
                  <div>To: {selectedEmail.to_email || selectedEmail.sender_email || 'Unknown'}</div>
                )}
                {selectedEmail.campaign_name && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span>Campaign:</span>
                    <span className="px-3 py-1 rounded-2xl text-xs font-medium bg-blue-100 text-blue-700">
                      {selectedEmail.campaign_name}
                    </span>
                    {selectedEmail.sequence_step && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Step {selectedEmail.sequence_step}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email Content or Compose View */}
            <div className="flex-1 p-8 overflow-y-auto">
              {composeMode ? (
                // Compose View - same as original but with sticky buttons
                <div className="relative h-full">
                  <div className="flex items-center justify-end mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelCompose}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-col" style={{ height: 'calc(100% - 120px)' }}>
                    {composeMode === 'forward' && (
                      <div className="flex items-center mb-4">
                        <span className="mr-2">To:</span>
                        <Input 
                          value={forwardTo}
                          onChange={(e) => setForwardTo(e.target.value)}
                          placeholder="Enter recipient email"
                          className="flex-1 text-sm border-gray-200 dark:border-gray-700/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 h-8 bg-white dark:bg-gray-900/50"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 w-full p-4 text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none resize-none"
                      style={{ 
                        minHeight: '400px',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        fontFamily: 'inherit'
                      }}
                    >
                      <textarea
                        ref={replyTextareaRef}
                        value={composeMode === 'reply' ? replyContent : forwardContent}
                        onChange={(e) => composeMode === 'reply' 
                          ? setReplyContent(e.target.value) 
                          : setForwardContent(e.target.value)
                        }
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100"
                        style={{
                          minHeight: '400px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.6',
                          fontFamily: 'inherit',
                          fontSize: '14px'
                        }}
                        placeholder={composeMode === 'reply' ? t('inbox.typeReply') : t('inbox.addMessage')}
                      />
                    </div>
                  </div>
                  
                  {/* Sticky buttons at bottom of compose view */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800/50 pt-6">
                    <div className="flex items-center space-x-3">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                        onClick={composeMode === 'reply' ? sendReply : sendForward}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {composeMode === 'reply' ? t('inbox.sendReply') : t('inbox.forward')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 rounded-2xl px-6 py-3 font-medium"
                        onClick={cancelCompose}
                      >
                        {t('button.cancel')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Email Content View
                <div className="prose max-w-none">
                  {selectedEmail.content ? (
                    <div 
                      className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap" 
                      style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                    >
                      {getFullEmailContent(selectedEmail)}
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 dark:text-gray-100 mb-4">Thank you for contacting Liquorland.</p>
                      
                      <p className="text-gray-900 dark:text-gray-100 mb-4">This email inbox is no longer monitored.</p>
                      
                      <p className="text-gray-900 dark:text-gray-100 mb-4">
                        <a href="#" className="underline" style={{ color: 'rgb(87, 140, 255)' }}>Click here to chat with us</a> or visit our website to find other ways to contact us.
                      </p>
                      
                      <p className="text-gray-900 dark:text-gray-100 mb-4">Cheers,</p>
                      
                      <p className="text-gray-900 dark:text-gray-100 mb-6">The Liquorland Team</p>
                      
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
                <div className="border-t border-gray-100 dark:border-gray-800/50 mt-8">
                  <div className="py-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
                      {t('inbox.threadMessages', { count: threadMessages[selectedEmail.conversation_id].length })}
                    </h3>
                    <div className="space-y-4">
                      {threadMessages[selectedEmail.conversation_id].map((message, index) => (
                        <div key={message.id} className={`p-6 rounded-2xl border transition-all duration-200 ${
                          message.direction === 'outbound' 
                            ? 'bg-blue-50/80 border-blue-200/50 ml-8 shadow-sm' 
                            : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/50 mr-8 shadow-sm'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-3 py-1 rounded-xl font-medium ${
                                message.direction === 'outbound'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {message.direction === 'outbound' ? t('inbox.sent') : t('inbox.received')}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {message.formatted_date}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            <div 
                              className="whitespace-pre-wrap" 
                              style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                            >
                              {message.direction === 'outbound' ? replaceTemplateVariables(message.body_text, selectedEmail, message) : message.body_text}
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
                const threadMessagesForEmail = threadMessages[selectedEmail.conversation_id]
                const totalMessages = threadMessagesForEmail && Array.isArray(threadMessagesForEmail) 
                  ? threadMessagesForEmail.length 
                  : selectedEmail.message_count
                return totalMessages && totalMessages > 1
              })() && (
                <div className="text-center py-6 border-t border-gray-100 dark:border-gray-800/50">
                  <button 
                    onClick={() => handleThreadExpansion(selectedEmail.conversation_id)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 flex items-center justify-center space-x-2 transition-colors rounded-2xl px-4 py-2 hover:bg-gray-50 dark:bg-gray-800"
                  >
                    <span>
                      {(() => {
                        const threadMessagesForEmail = threadMessages[selectedEmail.conversation_id]
                        const hasThreadMessages = threadMessagesForEmail && Array.isArray(threadMessagesForEmail) && threadMessagesForEmail.length > 0
                        
                        // Use actual thread messages count if available, otherwise fall back to selectedEmail.message_count
                        const totalMessages = hasThreadMessages 
                          ? threadMessagesForEmail.length 
                          : selectedEmail.message_count
                        const moreCount = totalMessages - 1
                        
                        return expandedThreads.has(selectedEmail.conversation_id) 
                          ? t('inbox.hideMessages') 
                          : t('inbox.moreMessages', { count: moreCount })
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
              <div className="p-8 border-t border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center space-x-3">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                    onClick={handleReply}
                  >
                    <Reply className="w-4 h-4 mr-2" />
                    {t('inbox.reply')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 rounded-2xl px-6 py-3 font-medium"
                    onClick={handleForward}
                  >
                    <Forward className="w-4 h-4 mr-2" />
                    {t('inbox.forward')}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 dark:text-gray-400 text-lg font-light">{t('inbox.selectEmailToView')}</div>
              <div className="text-gray-400 text-sm mt-2">{t('inbox.chooseMessage')}</div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}