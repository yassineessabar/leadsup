"use client"

import { useState, useEffect } from "react"
import { Check, Mail, Plus, AlertCircle, Settings, ChevronDown, ChevronRight, User, Globe, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"
import { fetchHealthScores, getHealthScoreColor, type HealthScoreResult } from "@/lib/health-score"

interface Domain {
  id: string
  domain: string
  status: 'verified' | 'pending' | 'failed'
  created_at: string
}

interface Sender {
  id: string
  email: string
  display_name: string
  is_default: boolean
  setup_status: 'completed' | 'warming_up' | 'needs_attention' | 'pending'
  daily_limit: number
  health_score: number
  emails_sent: number
  created_at: string
}

interface DomainWithSenders extends Domain {
  senders: Sender[]
}

interface CampaignSenderSelectionProps {
  campaignId: string | number
  onSelectionChange: (selectedSenders: string[]) => void
  initialSelectedSenders?: string[]
  isGuidedMode?: boolean
}

export default function CampaignSenderSelection({ 
  campaignId, 
  onSelectionChange, 
  initialSelectedSenders = [],
  isGuidedMode = false
}: CampaignSenderSelectionProps) {
  console.log('🎯 CampaignSenderSelection props:', { campaignId, initialSelectedSenders });
  const [domainsWithSenders, setDomainsWithSenders] = useState<DomainWithSenders[]>([])
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(() => {
    const initialSet = new Set(initialSelectedSenders)
    console.log('🚀 Initial selectedSenders state:', Array.from(initialSet), 'size:', initialSet.size)
    return initialSet
  })
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedSelection, setLastSavedSelection] = useState<Set<string>>(new Set())
  const [renderKey, setRenderKey] = useState(0)
  const [healthScores, setHealthScores] = useState<Record<string, HealthScoreResult>>({})
  const [healthScoresLoading, setHealthScoresLoading] = useState(false)
  
  // Test email modal state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testModalEmail, setTestModalEmail] = useState('')
  const [testModalSender, setTestModalSender] = useState<Sender | null>(null)
  const [testModalLoading, setTestModalLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // Load user email
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-cache"
        })
        const result = await response.json()
        if (result.success && result.user?.email) {
          setUserEmail(result.user.email)
        }
      } catch (error) {
        console.log('Could not fetch user email:', error)
      }
    }
    fetchUserEmail()
  }, [])

  // Load domains and their sender accounts
  useEffect(() => {
    loadData()
  }, [])

  // Trigger automatic loading of saved selections when domains become available
  useEffect(() => {
    if (domainsWithSenders.length > 0) {
      loadExistingSenderAssignments()
      loadHealthScores()
    }
  }, [domainsWithSenders])

  const loadData = async () => {
    // Load domains and senders first
    await fetchDomainsAndSenders()
    // loadExistingSenderAssignments will be triggered automatically by useEffect when domains are loaded
  }

  // Note: All domains are auto-expanded by default in fetchDomainsAndSenders()

  const fetchDomainsAndSenders = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🚀 Fetching domains and senders (optimized)...')
      const startTime = Date.now()

      // Use the optimized single API call
      const response = await fetch('/api/domains/with-senders').catch(error => {
        console.error('🚨 Network error fetching domains with senders:', error)
        throw new Error(`Failed to connect to server: ${error.message}`)
      })
      
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch domains and senders')
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`⚡ Optimized fetch completed in ${duration}ms`)
      console.log(`📊 Received ${data.domains.length} domains with ${data.performance?.senders_count || 0} senders`)

      setDomainsWithSenders(data.domains)

      // Auto-expand all domains by default to show sender accounts
      const allDomainIds = data.domains.map((domain: any) => domain.id)
      setExpandedDomains(new Set(allDomainIds))
      console.log('🎯 Auto-expanding all domains:', allDomainIds)

      // Auto-select all available senders by default
      const allSenderIds = data.domains
        .flatMap((domain: any) => domain.senders)
        .map((sender: any) => sender.id)
      
      if (allSenderIds.length > 0) {
        console.log('🎯 Available senders loaded:', allSenderIds.length, 'senders')
        console.log('📝 Skipping auto-selection - will load saved selections instead')
        // Don't auto-select here - let loadExistingSenderAssignments handle it
      }

    } catch (error) {
      console.error('Error fetching domains and senders:', error)
      setError('Failed to load domain accounts. Please try again.')
      toast.error('Failed to load sender accounts')
    } finally {
      setLoading(false)
    }
  }

  const loadHealthScores = async () => {
    try {
      setHealthScoresLoading(true)
      console.log('📊 Loading health scores...')
      
      // Get all sender IDs from domains
      const allSenderIds = domainsWithSenders
        .flatMap(domain => domain.senders)
        .map(sender => sender.id)
      
      if (allSenderIds.length === 0) {
        console.log('⚠️ No sender IDs available for health score calculation')
        setHealthScoresLoading(false)
        return
      }
      
      console.log('🔍 Fetching health scores for:', allSenderIds.length, 'senders')
      const scores = await fetchHealthScores(allSenderIds, campaignId.toString())
      setHealthScores(scores)
      
      console.log('✅ Loaded health scores for', Object.keys(scores).length, 'accounts')
    } catch (error) {
      console.error('❌ Error loading health scores:', error)
      // Don't show error toast as this is not critical functionality
    } finally {
      setHealthScoresLoading(false)
    }
  }


  const loadExistingSenderAssignments = async () => {
    try {
      console.log('📡 Loading saved sender selections...')
      console.log('🔍 domainsWithSenders available:', domainsWithSenders.length, 'domains')
      
      if (domainsWithSenders.length === 0) {
        console.log('⚠️ No domains loaded yet - cannot map emails to IDs')
        return
      }
      
      const response = await fetch(`/api/campaigns/${campaignId}/senders`)
      const data = await response.json()

      console.log('📡 API response:', data)

      if (response.ok && data.success) {
        // Handle both old and new format
        let assignedSenderIds: string[] = []
        
        if (data.assignments) {
          // Get the selected assignment emails
          const selectedEmails = data.assignments
            .filter((assignment: any) => assignment.is_selected)
            .map((assignment: any) => assignment.email)
            .filter(Boolean)
          
          console.log('📧 Found saved selections for emails:', selectedEmails)
          
          // Debug: Show available senders for mapping
          const availableSenders = domainsWithSenders.flatMap(domain => domain.senders)
          console.log('🔍 Available senders for mapping:', availableSenders.map(s => ({ id: s.id, email: s.email })))
          
          // Map emails back to sender account IDs by matching with current domain senders
          assignedSenderIds = availableSenders
            .filter(sender => selectedEmails.includes(sender.email))
            .map(sender => sender.id)
          
          console.log('✅ Mapped to sender IDs:', assignedSenderIds)
          console.log('✅ Restored', assignedSenderIds.length, 'saved sender selections')
        }
        
        if (assignedSenderIds.length > 0) {
          const newSelectedSet = new Set(assignedSenderIds)
          console.log('🔄 Setting selectedSenders state:', Array.from(newSelectedSet))
          
          // Use functional state update to ensure React recognizes the change
          setSelectedSenders(prevSelected => {
            console.log('🔄 State update - previous:', Array.from(prevSelected))
            console.log('🔄 State update - new:', Array.from(newSelectedSet))
            return newSelectedSet
          })
          
          setLastSavedSelection(newSelectedSet) // This is the saved state from database
          setHasUnsavedChanges(false) // No unsaved changes since we just loaded from database
          onSelectionChange(assignedSenderIds)
          console.log('🎯 Applied restored selections to UI')
          
          // Force a re-render to ensure checkboxes reflect the state
          setTimeout(() => {
            console.log('🔍 Post-load verification - selectedSenders size:', newSelectedSet.size)
            console.log('🔍 Post-load verification - selectedSenders content:', Array.from(newSelectedSet))
            
            // Force re-render of all checkboxes by incrementing render key
            setRenderKey(prev => prev + 1)
          }, 100)
        } else {
          console.log('ℹ️ No saved selections found - auto-selecting all available senders')
          
          // Auto-select all available senders by default
          const allSenderIds = domainsWithSenders
            .flatMap(domain => domain.senders)
            .map(sender => sender.id)
          
          if (allSenderIds.length > 0) {
            const allSelectedSet = new Set(allSenderIds)
            console.log('🎯 Auto-selecting all senders:', Array.from(allSelectedSet))
            
            setSelectedSenders(allSelectedSet)
            setLastSavedSelection(new Set()) // No previous saved selection
            setHasUnsavedChanges(true) // Mark as having changes since we auto-selected
            onSelectionChange(allSenderIds)
            console.log('✅ Auto-selected all available senders')
            
            // Force a re-render to ensure checkboxes reflect the auto-selection
            setTimeout(() => {
              setRenderKey(prev => prev + 1)
            }, 100)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading existing sender assignments:', error)
      // Don't show error toast for this as it's not critical
    }
  }

  const saveSenderSelection = async (selectedSenderIds: string[]) => {
    try {
      setIsSaving(true)
      console.log(`🔄 Saving ${selectedSenderIds.length} sender(s) to campaign ${campaignId}...`)
      console.log('📋 Campaign ID type:', typeof campaignId, 'value:', campaignId)
      console.log('📍 API URL:', `/api/campaigns/${campaignId}/save`)
      console.log('📋 Selected sender IDs:', selectedSenderIds)
      
      // Validate campaign ID
      if (!campaignId || campaignId === 'undefined' || campaignId === 'null') {
        throw new Error(`Invalid campaign ID: ${campaignId}`)
      }
      console.log('📋 Request body:', JSON.stringify({
        campaignData: {
          senderAccounts: selectedSenderIds
        },
        saveType: 'senders'
      }, null, 2))

      // First, test if we can access the API at all by making a GET request
      console.log('🧪 Testing API accessibility with GET request...')
      try {
        const testResponse = await fetch(`/api/campaigns/${campaignId}/save`, {
          method: 'GET',
          credentials: 'include'
        })
        console.log('🧪 GET test response:', testResponse.status, testResponse.statusText)
        if (!testResponse.ok) {
          const testText = await testResponse.text()
          console.log('🧪 GET test response body:', testText.substring(0, 200))
        }
      } catch (testError) {
        console.error('🧪 GET test failed:', testError)
      }
      
      // Use the same save endpoint as the campaign dashboard
      const response = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignData: {
            senderAccounts: selectedSenderIds
          },
          saveType: 'senders'
        }),
      }).catch(error => {
        console.error('🚨 Network error during fetch:', error)
        throw new Error(`Network error: ${error.message}`)
      })

      console.log('📡 Response status:', response.status, response.statusText)

      let data
      try {
        const responseText = await response.text()
        console.log('📡 Raw response text (first 500 chars):', responseText.substring(0, 500))
        console.log('📡 Full response text length:', responseText.length)
        
        if (!responseText) {
          console.error('❌ Empty response from server')
          throw new Error('Empty response from server')
        }
        
        // Check if response is HTML (error page)
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          console.error('❌ Received HTML instead of JSON - likely an error page')
          console.error('📄 HTML content:', responseText.substring(0, 1000))
          throw new Error('Server returned an error page instead of JSON. Check if you are logged in and the API route exists.')
        }
        
        // Check if response is empty JSON
        if (responseText.trim() === '{}') {
          console.error('❌ Received empty JSON object from server')
          throw new Error('Server returned empty JSON object - this indicates an API processing issue')
        }
        
        data = JSON.parse(responseText)
        console.log('📡 Parsed response data:', data)
        console.log('📡 Response data type:', typeof data)
        console.log('📡 Response data keys:', data ? Object.keys(data) : 'no keys')
        console.log('📡 Response data JSON string:', JSON.stringify(data))
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError)
        if (parseError.message.includes('Unexpected token')) {
          throw new Error('Server returned HTML instead of JSON. This usually means authentication failed or the API route is not found.')
        }
        throw new Error(`Invalid response from server: ${parseError.message}`)
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', { 
          status: response.status, 
          statusText: response.statusText,
          data: data || 'No response data'
        })
        throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!data || !data.success) {
        console.error('❌ API Response indicates failure:', data || 'No response data')
        throw new Error(data?.error || 'Save operation failed - no success confirmation from server')
      }

      console.log(`✅ Saved ${selectedSenderIds.length} sender(s) to campaign`)
      toast.success(`✅ Saved ${selectedSenderIds.length} sender(s) to campaign`)

      // Update tracking state
      setLastSavedSelection(new Set(selectedSenderIds))
      setHasUnsavedChanges(false)

      // Auto-enable inbound tracking for domains with selected senders
      if (selectedSenderIds.length > 0) {
        await enableInboundTrackingForDomains(selectedSenderIds)
      }
    } catch (error) {
      console.error('❌ Error saving sender selection:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to save sender selection: ${errorMessage}`)
      throw error // Re-throw so caller knows it failed
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to compare two sets of selections
  const areSelectionsSame = (set1: Set<string>, set2: Set<string>): boolean => {
    if (set1.size !== set2.size) return false
    for (const item of set1) {
      if (!set2.has(item)) return false
    }
    return true
  }

  // Manual save function for the save button
  const handleManualSave = async () => {
    try {
      await saveSenderSelection(Array.from(selectedSenders))
    } catch (error) {
      console.error('❌ Error in handleManualSave:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save sender selection')
    }
  }



  const enableInboundTrackingForDomains = async (selectedSenderIds: string[]) => {
    try {
      // Get unique domain IDs from selected senders
      const domainsWithSelectedSenders = new Set<string>()
      
      domainsWithSenders.forEach(domain => {
        const hasSelectedSenders = domain.senders.some(sender => 
          selectedSenderIds.includes(sender.id)
        )
        if (hasSelectedSenders) {
          domainsWithSelectedSenders.add(domain.id)
        }
      })

      // Enable inbound tracking for each domain
      const enablePromises = Array.from(domainsWithSelectedSenders).map(async (domainId) => {
        try {
          const response = await fetch(`/api/domains/${domainId}/inbound-tracking`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            console.log(`✅ Enabled inbound tracking for domain ${domainId}`)
          } else {
            console.warn(`⚠️ Failed to enable inbound tracking for domain ${domainId}`)
          }
        } catch (error) {
          console.warn(`⚠️ Error enabling inbound tracking for domain ${domainId}:`, error)
        }
      })

      await Promise.all(enablePromises)
    } catch (error) {
      console.error('❌ Error enabling inbound tracking:', error)
      // Don't show error toast as this is a background operation
    }
  }

  const handleSenderToggle = (senderId: string, checked: boolean) => {
    console.log('🔄 Toggle sender clicked:', senderId, 'New checked state:', checked)
    console.log('📋 Current selected senders:', Array.from(selectedSenders))
    console.log('🔍 Was sender previously selected?', selectedSenders.has(senderId))
    
    const newSelectedSenders = new Set(selectedSenders)
    
    if (checked) {
      console.log('➕ Adding sender to selection')
      newSelectedSenders.add(senderId)
    } else {
      console.log('➖ Removing sender from selection')
      newSelectedSenders.delete(senderId)
    }
    
    console.log('📋 New selected senders:', Array.from(newSelectedSenders))
    console.log('🔍 Will sender be selected after update?', newSelectedSenders.has(senderId))
    
    // Update UI state immediately for responsive feedback using callback to ensure update
    setSelectedSenders(prevSenders => {
      const updatedSet = new Set(newSelectedSenders);
      console.log('🔄 State callback - updating from:', Array.from(prevSenders), 'to:', Array.from(updatedSet));
      return updatedSet;
    });
    onSelectionChange(Array.from(newSelectedSenders))
    
    // Mark as having unsaved changes
    const hasChanges = !areSelectionsSame(newSelectedSenders, lastSavedSelection)
    setHasUnsavedChanges(hasChanges)
    console.log('📝 Has unsaved changes:', hasChanges)
    
    console.log('✅ State updated - React will re-render with new state')
    
    // Add a small delay to verify state update
    setTimeout(() => {
      console.log('🔍 Post-update verification - sender selected?', newSelectedSenders.has(senderId))
    }, 100)
  }

  const handleDomainToggle = (domain: DomainWithSenders, checked: boolean) => {
    const domainSenderIds = domain.senders.map(sender => sender.id)
    
    const newSelectedSenders = new Set(selectedSenders)
    
    if (checked) {
      // Select all senders in this domain
      domainSenderIds.forEach(id => newSelectedSenders.add(id))
    } else {
      // Unselect all senders in this domain
      domainSenderIds.forEach(id => newSelectedSenders.delete(id))
    }
    
    // Update UI state immediately for responsive feedback using callback to ensure update
    setSelectedSenders(prevSenders => {
      const updatedSet = new Set(newSelectedSenders);
      console.log('🔄 Domain toggle state callback - updating from:', Array.from(prevSenders), 'to:', Array.from(updatedSet));
      return updatedSet;
    });
    onSelectionChange(Array.from(newSelectedSenders))
    
    // Mark as having unsaved changes
    const hasChanges = !areSelectionsSame(newSelectedSenders, lastSavedSelection)
    setHasUnsavedChanges(hasChanges)
    console.log('📝 Domain toggle - Has unsaved changes:', hasChanges)
  }

  const toggleDomainExpansion = (domainId: string) => {
    const newExpanded = new Set(expandedDomains)
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId)
    } else {
      newExpanded.add(domainId)
    }
    setExpandedDomains(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'warming_up':
        return 'bg-blue-100 text-blue-700'
      case 'needs_attention':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Active'
      case 'warming_up':
        return 'Warming Up'
      case 'needs_attention':
        return 'Needs Attention'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Handle test email button click
  const handleTestClick = (sender: Sender) => {
    setTestModalSender(sender)
    setTestModalEmail(userEmail || 'essabar.yassine@gmail.com') // Pre-fill with logged-in user's email
    setShowTestModal(true)
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testModalEmail.trim()) {
      toast.error("Please enter an email address to send the test to.")
      return
    }

    if (!testModalSender) {
      toast.error("No sender selected for test email.")
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/campaigns/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          senderEmail: testModalSender.email,
          testEmail: testModalEmail,
          campaignId: campaignId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Test email sent from ${testModalSender.email} to ${testModalEmail}. Reply to test the complete flow!`)
        setShowTestModal(false)
        setTestModalEmail('')
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send test email. Please try again.")
    } finally {
      setTestModalLoading(false)
    }
  }

  // Handle domain configuration redirect
  const handleDomainConfig = (domain: Domain) => {
    // Redirect to domain verification/configuration page
    // Opens in new tab to preserve campaign workflow
    window.open(`/domains?domain=${encodeURIComponent(domain.domain)}`, '_blank')
  }

  // Handle domain deletion
  const handleDeleteDomain = async (domain: DomainWithSenders) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the domain "${domain.domain}"?\n\n` +
      `This will permanently remove:\n` +
      `• The domain and all its DNS settings\n` +
      `• ${domain.senders.length} sender account(s)\n` +
      `• All email history for this domain\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmDelete) {
      return
    }

    try {
      console.log(`🗑️ Deleting domain: ${domain.domain}`)
      
      const response = await fetch(`/api/domains?id=${domain.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`✅ Domain ${domain.domain} deleted successfully`)
        toast.success(`Domain ${domain.domain} deleted successfully`)
        
        // Remove the domain from local state
        setDomainsWithSenders(prev => prev.filter(d => d.id !== domain.id))
        
        // Remove any selected senders from this domain
        const domainSenderIds = domain.senders.map(sender => sender.id)
        const newSelectedSenders = new Set(selectedSenders)
        domainSenderIds.forEach(id => newSelectedSenders.delete(id))
        setSelectedSenders(newSelectedSenders)
        onSelectionChange(Array.from(newSelectedSenders))
        
        // Update campaign sender assignments
        saveSenderSelection(Array.from(newSelectedSenders)).catch(error => {
          console.error('Failed to update sender selection after domain deletion:', error)
        })
        
      } else {
        throw new Error(data.error || 'Failed to delete domain')
      }
    } catch (error) {
      console.error('Error deleting domain:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to delete domain: ${errorMessage}`)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Sender Accounts</h3>
              <p className="text-gray-600">Please wait while we fetch your domain accounts...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center bg-white rounded-3xl p-12 shadow-sm border border-gray-100/50">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">Failed to Load Accounts</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">{error}</p>
              <Button 
                onClick={fetchDomainsAndSenders} 
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (domainsWithSenders.length === 0) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center bg-white rounded-3xl p-12 shadow-sm border border-gray-100/50">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">No Verified Domains</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                You need to set up and verify at least one domain before you can select sender accounts for campaigns.
              </p>
              <Button 
                onClick={() => {
                  // Navigate to root page with domain tab selected
                  console.log('🔄 Navigating to /?tab=domain...')
                  window.location.href = '/?tab=domain'
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-8 py-4 text-lg"
              >
                <Plus className="h-5 w-5 mr-3" />
                Set Up Domain
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 mb-2">Sender Accounts</h1>
              <p className="text-gray-500 text-sm">
                Select which accounts will send emails for this campaign
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isGuidedMode && (
                <Button
                  onClick={handleManualSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className={`border-0 rounded-2xl px-5 py-2.5 font-medium transition-colors ${
                    hasUnsavedChanges 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-100 text-blue-400 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {hasUnsavedChanges ? 'Save' : 'Saved'}
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => {
                  // Navigate to root page with domain tab selected
                  console.log('🔄 Navigating to /?tab=domain to add new domain...')
                  window.location.href = '/?tab=domain'
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-5 py-2.5 font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          </div>
        </div>

        {/* Domain Groups */}
        <div className="space-y-4">
          {domainsWithSenders.map((domain) => {
            const domainSenderIds = domain.senders.map(sender => sender.id)
            const selectedInDomain = domainSenderIds.filter(id => selectedSenders.has(id)).length
            const isExpanded = expandedDomains.has(domain.id)
            const allSelected = domainSenderIds.length > 0 && domainSenderIds.every(id => selectedSenders.has(id))
            const someSelected = selectedInDomain > 0 && !allSelected

            return (
              <div key={domain.id} className="bg-white border-0 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleDomainExpansion(domain.id)}
                        className="flex items-center gap-4 hover:bg-gray-50 rounded-2xl p-3 -ml-3 transition-colors duration-200"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                            <Globe className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                              {domain.domain}
                            </h3>
                            <p className="text-gray-500 mt-1">
                              {domain.senders.length} sender account{domain.senders.length !== 1 ? 's' : ''}
                              {selectedInDomain > 0 && (
                                <span className="ml-2 text-gray-700 font-medium">
                                  • {selectedInDomain} selected
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className="bg-gray-100 text-gray-600 border-0 px-3 py-1 rounded-xl text-xs font-medium">
                        Verified
                      </Badge>
                      
                      {domain.senders.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => handleDomainToggle(domain, checked === true)}
                            className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 rounded-md"
                            ref={el => {
                              if (el && someSelected) {
                                el.setAttribute('data-indeterminate', 'true')
                              }
                            }}
                          />
                          <label className="text-xs text-gray-600 cursor-pointer font-medium">
                            Select All
                          </label>
                        </div>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDomain(domain)
                        }}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <div className="px-8 pb-8">
                      {domain.senders.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 mb-3">No Sender Accounts</h4>
                          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                            Add sender accounts to this domain to use them in campaigns
                          </p>
                          <Button
                            onClick={() => {
                              // Navigate to root page with domain tab to add senders
                              console.log('🔄 Navigating to /?tab=domain to add senders...')
                              window.location.href = '/?tab=domain'
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Senders
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 mt-6">
                          {domain.senders.map((sender) => {
                            const isSelected = selectedSenders.has(sender.id);
                            console.log(`🔍 Rendering sender ${sender.email} (ID: ${sender.id}) - isSelected: ${isSelected}`)
                            
                            return (
                            <div 
                              key={sender.id} 
                              className={`border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-2xl p-6 ${
                                isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Checkbox
                                    key={`checkbox-${sender.id}-${renderKey}-${isSelected}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      console.log(`🔍 Checkbox clicked - sender: ${sender.id}, checked: ${checked}, current isSelected: ${isSelected}`);
                                      console.log(`🎯 Element state - checkbox should be: ${checked ? 'CHECKED' : 'UNCHECKED'}`);
                                      handleSenderToggle(sender.id, checked === true);
                                    }}
                                    className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 data-[state=checked]:text-white rounded-md"
                                    aria-label={`Select sender ${sender.email}`}
                                    data-testid={`sender-checkbox-${sender.id}`}
                                    data-selected={isSelected}
                                    style={{
                                      backgroundColor: isSelected ? '#111827' : 'transparent',
                                      borderColor: isSelected ? '#111827' : '#d1d5db'
                                    }}
                                  />
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                                      <User className="h-6 w-6 text-gray-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <h4 className="font-medium text-gray-900 text-lg">
                                          {sender.display_name || sender.email.split('@')[0]}
                                        </h4>
                                        {sender.is_default && (
                                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-1 rounded-lg text-xs font-medium">
                                            Primary
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-gray-600 mt-1">{sender.email}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-8">
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 mb-1">Daily Limit</div>
                                    <div className="font-semibold text-gray-900 text-lg">{sender.daily_limit || 50}</div>
                                    <div className="text-xs text-gray-500">emails/day</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 mb-1">Health Score</div>
                                    {healthScoresLoading ? (
                                      <div className="font-semibold text-xl text-gray-400">
                                        <div className="animate-pulse">--</div>
                                      </div>
                                    ) : (
                                      <div className={`font-semibold text-xl ${getHealthScoreColor(healthScores[sender.id]?.score || 0)}`}>
                                        {healthScores[sender.id]?.score || '--'}%
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTestClick(sender)
                                    }}
                                    variant="outline"
                                    className="border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl px-3 py-1.5 text-xs font-medium"
                                  >
                                    Test
                                  </Button>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          })}
        </div>


        {/* Test Email Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-0 max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Send Test Email
                    </h3>
                    <p className="text-sm text-gray-500">
                      Test your campaign email
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTestModal(false)}
                    className="ml-auto w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {testModalSender && (
                  <div className="bg-blue-50/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {testModalSender.email}
                        </div>
                        <div className="text-xs text-gray-600">
                          {testModalSender.display_name || 'Sender Account'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send test email to:
                  </label>
                  <input
                    type="email"
                    value={testModalEmail}
                    onChange={(e) => setTestModalEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm"
                  />
                </div>

                <div className="bg-amber-50/50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-800">
                    Sends your first campaign email with test variables (John Doe, Acme Corp)
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 pt-3 border-t border-gray-100">
                <Button
                  onClick={() => setShowTestModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendTestEmail}
                  disabled={testModalLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm"
                >
                  {testModalLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Test'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}