"use client"

import { useState, useEffect } from "react"
import { useI18n } from '@/hooks/use-i18n'
import { Check, Mail, Plus, AlertCircle, Settings, ChevronDown, ChevronRight, User, Globe, Trash2, Save, Copy, Loader2, CheckCircle, X, Flame, Activity, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { fetchHealthScores, getHealthScoreColor, type HealthScoreResult } from "@/lib/health-score"
import { SenderManagement } from "./sender-management"

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
  warmup_status?: 'active' | 'inactive' | 'paused'
  warmup_phase?: number
  warmup_days_completed?: number
  warmup_emails_sent_today?: number
  warmup_started_at?: string
  last_warmup_sent?: string
}

interface DomainWithSenders extends Domain {
  senders: Sender[]
}

interface CampaignSenderSelectionProps {
  campaignId: string | number
  onSelectionChange: (selectedSenders: string[]) => void
  initialSelectedSenders?: string[]
  isGuidedMode?: boolean
  showDomainSetupModal?: boolean
  onShowDomainSetupModal?: (show: boolean) => void
  onDomainAdded?: (domain: any) => void
  showDomainInstructions?: boolean
  onShowDomainInstructions?: (show: boolean) => void
  pendingDomainData?: any
  showSenderManagement?: boolean
  onShowSenderManagement?: (show: boolean) => void
  selectedDomainForSenders?: string
  onDomainSelected?: (domainId: string) => void
}

export default function CampaignSenderSelection({ 
  campaignId, 
  onSelectionChange, 
  initialSelectedSenders = [],
  isGuidedMode = false,
  showDomainSetupModal: parentShowModal,
  onShowDomainSetupModal: parentSetShowModal,
  onDomainAdded: parentOnDomainAdded,
  showDomainInstructions,
  onShowDomainInstructions,
  pendingDomainData,
  showSenderManagement,
  onShowSenderManagement,
  selectedDomainForSenders,
  onDomainSelected
}: CampaignSenderSelectionProps) {
  const { t, ready: translationsReady } = useI18n()
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
  
  // Use parent modal state if provided, otherwise use local state
  const showDomainSetupModal = parentShowModal ?? false
  const setShowDomainSetupModal = parentSetShowModal ?? (() => {})
  
  // DNS records state for domain setup instructions
  const [dnsRecords, setDnsRecords] = useState<any[]>([])
  const [loadingDnsRecords, setLoadingDnsRecords] = useState(false)
  const [dnsRecordsAdded, setDnsRecordsAdded] = useState(false)
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({})
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [showVerificationResults, setShowVerificationResults] = useState(false)
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<DomainWithSenders | null>(null)
  
  // Loading state for sender account creation
  const [creatingSenderAccounts, setCreatingSenderAccounts] = useState(false)

  // Helper function to get warmup status display info
  const getWarmupStatusInfo = (status?: string) => {
    switch (status) {
      case 'active':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: Flame, label: 'Active' }
      case 'paused':
        return { color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertCircle, label: 'Paused' }
      case 'inactive':
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-50', icon: Activity, label: 'Inactive' }
    }
  }

  // Helper function to get warmup phase label
  const getWarmupPhaseLabel = (phase?: number) => {
    switch (phase) {
      case 1:
        return 'Foundation'
      case 2:
        return 'Engagement'
      case 3:
        return 'Scale Up'
      default:
        return 'Not Started'
    }
  }

  // Fetch DNS records when domain instructions should be shown
  useEffect(() => {
    if (showDomainInstructions && pendingDomainData?.id) {
      console.log('🔄 Fetching DNS records for pending domain:', pendingDomainData.id)
      // Clear any previous verification results when showing DNS instructions
      setVerificationResults(null)
      setShowVerificationResults(false)
      setCreatingSenderAccounts(false)
      fetchDnsRecords(pendingDomainData.id)
    }
  }, [showDomainInstructions, pendingDomainData?.id])

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
    // Load warmup data and merge it with sender data
    await loadWarmupData()
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
      setError(t('senderManagement.errors.failedToLoadDomains'))
      toast.error(t('senderManagement.errors.failedToLoadSenders'))
    } finally {
      setLoading(false)
    }
  }

  const createPresetSenders = async (domainId: string, domainName: string) => {
    const presetAccounts = [
      { localPart: 'contact', displayName: 'Contact' },
      { localPart: 'hello', displayName: 'Hello' },
      { localPart: 'info', displayName: 'Info' }
    ]

    try {
      console.log(`🚀 Creating preset sender accounts for ${domainName}`)
      
      // Create all preset accounts in parallel
      const createPromises = presetAccounts.map((account, index) => 
        fetch(`/api/domains/${domainId}/senders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${account.localPart}@${domainName}`,
            display_name: account.displayName,
            is_default: index === 0 // Make 'contact' the default
          })
        })
      )

      const responses = await Promise.all(createPromises)
      const successCount = responses.filter(r => r.ok).length
      
      if (successCount > 0) {
        toast.success(t('senderManagement.success.createdPresetAccounts', { count: successCount }))
        console.log(`✅ Created ${successCount} preset sender accounts for ${domainName}`)
      }
    } catch (error) {
      console.error('Error creating preset senders:', error)
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
      
      // Use the EXACT same API call as analytics and sender management for consistency
      const allSenderEmails = domainsWithSenders.flatMap(domain => domain.senders).map(sender => sender.email).filter(Boolean)
      const params = new URLSearchParams()
      if (allSenderEmails.length > 0) {
        params.set('emails', allSenderEmails.join(','))
      }
      if (campaignId) {
        params.set('campaignId', campaignId.toString())
        console.log('🎯 Using campaignId like analytics and sender management:', campaignId)
      }
      
      const response = await fetch(`/api/sender-accounts/health-score?${params}`, {
        credentials: 'include'
      })
      
      const result = await response.json()
      const scores = result.success ? result.healthScores : {}
      
      setHealthScores(scores)
      console.log('🔥 CAMPAIGN SENDER SELECTION: Health scores from API:', scores)
      
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

  // Load warmup data for campaign senders
  const loadWarmupData = async () => {
    try {
      console.log('🔥 Loading warmup data for campaign:', campaignId)
      
      const response = await fetch(`/api/campaigns/${campaignId}/senders`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn('⚠️ Failed to load warmup data:', response.status)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.assignments) {
        console.log('✅ Loaded warmup data for', data.assignments.length, 'senders')
        
        // Merge warmup data with existing sender data
        setDomainsWithSenders(prevDomains => 
          prevDomains.map(domain => ({
            ...domain,
            senders: domain.senders.map(sender => {
              // Find matching campaign sender by email
              const warmupData = data.assignments.find((assignment: any) => 
                assignment.email === sender.email
              )
              
              if (warmupData) {
                console.log(`🔥 Merged warmup data for ${sender.email}:`, {
                  warmup_status: warmupData.warmup_status,
                  health_score: warmupData.health_score
                })
                return {
                  ...sender,
                  warmup_status: warmupData.warmup_status,
                  warmup_phase: warmupData.warmup_phase,
                  warmup_days_completed: warmupData.warmup_days_completed,
                  warmup_emails_sent_today: warmupData.warmup_emails_sent_today,
                  last_warmup_sent: warmupData.last_warmup_sent,
                  health_score: warmupData.health_score || sender.health_score
                }
              }
              
              return sender
            })
          }))
        )
      }
    } catch (error) {
      console.error('❌ Error loading warmup data:', error)
      // Don't show error to user as this is supplementary data
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
      toast.success(t('senderManagement.success.savedSenders', { count: selectedSenderIds.length }))

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

  // Handle test email button click - Updated to use dynamic user email
  const handleTestClick = (sender: Sender) => {
    setTestModalSender(sender)
    setTestModalEmail(userEmail || 'essabar.yassine@gmail.com') // Pre-fill with logged-in user's email
    setShowTestModal(true)
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testModalEmail.trim()) {
      toast.error(t('senderManagement.errors.pleaseEnterEmail'))
      return
    }

    if (!testModalSender) {
      toast.error(t('senderManagement.errors.noSenderSelected'))
      return
    }

    setTestModalLoading(true)
    try {
      // First, try to setup the sender identity automatically
      console.log(`🔧 Setting up SendGrid configuration for ${testModalSender.email}`)
      try {
        const setupResponse = await fetch('/api/sendgrid/setup-sender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail: testModalSender.email,
            senderName: testModalSender.name
          })
        })
        
        const setupData = await setupResponse.json()
        console.log('🔧 SendGrid setup result:', setupData)
        
        if (setupData.success) {
          console.log('✅ SendGrid setup completed successfully')
        } else {
          console.log('⚠️ SendGrid setup had issues:', setupData.results?.errors)
        }
      } catch (setupError) {
        console.log('⚠️ SendGrid setup failed, continuing with test email:', setupError)
      }
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
        toast.success(t('senderManagement.success.testEmailSent', { 
          senderEmail: testModalSender.email, 
          testEmail: testModalEmail 
        }))
        setShowTestModal(false)
        setTestModalEmail('')
      } else {
        throw new Error(data.error || t('senderManagement.errors.failedToSendTest'))
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error(error instanceof Error ? error.message : t('senderManagement.errors.failedToSendTestTryAgain'))
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

  // Fetch DNS records for domain setup instructions
  const fetchDnsRecords = async (domainId: string) => {
    if (!domainId) return
    
    setLoadingDnsRecords(true)
    try {
      console.log('📡 Fetching DNS records for domain ID:', domainId)
      const response = await fetch(`/api/domains/${domainId}/dns-records`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ DNS records fetched:', data)
        if (data.success && data.records) {
          setDnsRecords(data.records)
        } else {
          console.log('❌ DNS records not available, using fallback')
          // Set fallback DNS records like the domains page does
          setDnsRecords([
            {
              type: 'CNAME',
              host: 'mail',
              value: 'sendgrid.net',
              description: 'Email routing'
            },
            {
              type: 'TXT',
              host: '@',
              value: 'v=spf1 include:sendgrid.net ~all',
              description: 'SPF record'
            }
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching DNS records:', error)
      // Set fallback DNS records
      setDnsRecords([
        {
          type: 'CNAME',
          host: 'mail',
          value: 'sendgrid.net',
          description: 'Email routing'
        },
        {
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:sendgrid.net ~all',
          description: 'SPF record'
        }
      ])
    } finally {
      setLoadingDnsRecords(false)
    }
  }

  // Copy to clipboard functionality
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Verify domain functionality - exact same as domains page
  const handleVerifyDomain = async (domainId: string) => {
    if (!domainId) return
    
    setVerifying(domainId)
    setVerificationResults(null)
    setShowVerificationResults(false)
    // Show loading popup immediately when verification starts
    setCreatingSenderAccounts(true)
    
    try {
      console.log('🔄 Verifying domain:', domainId)
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST',
        credentials: 'include'
      })
      
      const data = await response.json()
      console.log('📡 Verification response:', data)
      
      // Always show verification results
      setVerificationResults(data)
      setShowVerificationResults(true)
      
      if (response.ok && data.success) {
        console.log('✅ Domain verification successful')
        
        // If domain is ready, create accounts and redirect immediately
        if (data.domainReady) {
          // Auto-create preset sender accounts immediately
          if (pendingDomainData?.id && pendingDomainData?.domain) {
            await createPresetSenders(pendingDomainData.id, pendingDomainData.domain)
          }
          
          await fetchDomainsAndSenders()
          if (onShowDomainInstructions) {
            onShowDomainInstructions(false)
          }
          setCreatingSenderAccounts(false)
        }
      } else {
        console.log('❌ Domain verification failed:', data)
        // Hide loading popup on failure
        setCreatingSenderAccounts(false)
      }
    } catch (error) {
      console.error('Error verifying domain:', error)
      setVerificationResults({
        success: false,
        error: 'Failed to verify domain. Please try again.',
        domainReady: false
      })
      setShowVerificationResults(true)
      // Hide loading popup on error
      setCreatingSenderAccounts(false)
    } finally {
      setVerifying(null)
    }
  }

  // Handle domain addition
  const handleDomainAdded = (newDomain: any) => {
    console.log('✅ Domain added successfully:', newDomain)
    toast.success(`Domain ${newDomain.domain} added successfully!`)
    
    // Refresh the domains and senders list
    fetchDomainsAndSenders()
    
    // Close the modal
    setShowDomainSetupModal(false)
    
    // Call parent handler if provided
    if (parentOnDomainAdded) {
      parentOnDomainAdded(newDomain)
    }
  }

  // Handle domain deletion - show dialog instead of browser popup
  const handleDeleteDomain = (domain: DomainWithSenders) => {
    setDomainToDelete(domain)
    setShowDeleteDialog(true)
  }

  // Confirm domain deletion
  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return

    try {
      console.log(`🗑️ Deleting domain: ${domainToDelete.domain}`)
      
      const response = await fetch(`/api/domains?id=${domainToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`✅ Domain ${domainToDelete.domain} deleted successfully`)
        toast.success(`Domain ${domainToDelete.domain} deleted successfully`)
        
        // Remove the domain from local state
        setDomainsWithSenders(prev => prev.filter(d => d.id !== domainToDelete.id))
        
        // Remove any selected senders from this domain
        const domainSenderIds = domainToDelete.senders.map(sender => sender.id)
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
    } finally {
      setShowDeleteDialog(false)
      setDomainToDelete(null)
    }
  }


  if (loading || !translationsReady) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('senderManagement.loading.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t('senderManagement.loading.description')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center bg-white dark:bg-gray-900 rounded-3xl p-12 shadow-sm border border-gray-100/50 dark:border-gray-800">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">Failed to Load Accounts</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{error}</p>
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
    console.log('🔍 Debug - No domains found, checking instruction state:')
    console.log('🔍 showDomainInstructions:', showDomainInstructions)
    console.log('🔍 pendingDomainData:', pendingDomainData)
    
    // Show domain setup instructions if we have pending domain data
    if (showDomainInstructions && pendingDomainData) {
      console.log('✅ Showing domain setup instructions for:', pendingDomainData.domain)
      return (
        <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900">
          <div className="max-w-7xl mx-auto p-6 md:p-8">
            {/* Header - Exact same as domains page */}
            <div className="mb-8">
              <div className="mb-8">
                <h1 className="text-4xl font-light text-gray-900 dark:text-gray-100 tracking-tight mb-2">Setup {pendingDomainData.domain}</h1>
                <p className="text-gray-500 dark:text-gray-400 font-light">
                  Follow these steps to connect your domain
                </p>
              </div>

              {/* Quick Steps Guide - Exact same as domains page */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">?</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Steps</h3>
                    <ol className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                      <li><span className="font-medium">1.</span> Go to your domain provider (GoDaddy, Namecheap, etc.)</li>
                      <li><span className="font-medium">2.</span> Look for "DNS Settings" or "Domain Management"</li>
                      <li><span className="font-medium">3.</span> Copy and paste each setting below</li>
                      <li><span className="font-medium">4.</span> Save and come back to verify</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* DNS Settings - Exact same format as domains page */}
              <div className="space-y-6">
                {loadingDnsRecords ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-8 mb-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your settings...</span>
                    </div>
                  </div>
                ) : dnsRecords.length > 0 ? (
                  <>
                    {/* Regular DNS Records (non-MX) */}
                    {dnsRecords.filter(r => r.type !== 'MX').length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">DNS Records</h3>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                              <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Host</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Value</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {dnsRecords.filter(r => r.type !== 'MX').map((record, index) => (
                                <tr key={`regular-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                      {record.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                        {record.host}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.host, `host-${index}`)}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                      >
                                        {copiedStates[`host-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono text-gray-700 break-all">
                                        {record.value}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.value, `value-${index}`)}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                      >
                                        {copiedStates[`value-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {record.description && (
                                      <span className="text-xs text-gray-500">{record.description}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* MX Records with Priority */}
                    {dnsRecords.filter(r => r.type === 'MX').length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">MX Records (Mail Exchange)</h3>
                        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                              <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">Type</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Host</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Priority</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Value</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {dnsRecords.filter(r => r.type === 'MX').map((record, index) => (
                                <tr key={`mx-${index}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {record.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                        {record.host}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.host, `mx-host-${index}`)}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                      >
                                        {copiedStates[`mx-host-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <code className="text-sm font-mono text-gray-700">{record.priority}</code>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                        {record.value}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(record.value, `mx-value-${index}`)}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                      >
                                        {copiedStates[`mx-value-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {record.description && (
                                      <span className="text-xs text-gray-500">{record.description}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </>
                ) : (
                  <div className="bg-white rounded-xl border p-8 text-center mb-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No settings available. Please try refreshing.</p>
                  </div>
                )}

                {/* Verification Actions - Exact same as domains page */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="dns-added" 
                        checked={dnsRecordsAdded} 
                        onCheckedChange={(checked) => setDnsRecordsAdded(checked as boolean)}
                        className="mt-1"
                      />
                      <label htmlFor="dns-added" className="text-gray-700 font-medium leading-relaxed">
                        I've added all the settings above to my domain provider
                      </label>
                    </div>

                    <div className="text-center">
                      <Button 
                        className="text-white px-8 py-3 rounded-lg font-medium transition-colors text-base disabled:opacity-50 disabled:bg-gray-300"
                        style={{ backgroundColor: !dnsRecordsAdded || verifying !== null ? undefined : 'rgb(87, 140, 255)' }}
                        onMouseEnter={(e) => {
                          if (!(!dnsRecordsAdded || verifying !== null)) {
                            e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(!dnsRecordsAdded || verifying !== null)) {
                            e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                          }
                        }}
                        disabled={!dnsRecordsAdded || verifying !== null}
                        onClick={() => {
                          if (pendingDomainData?.id) {
                            handleVerifyDomain(pendingDomainData.id)
                          }
                        }}
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking connection...
                          </>
                        ) : (
                          'Check My Domain'
                        )}
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-500">
                        Changes can take up to 24 hours to take effect
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Results - Exact same as domains page */}
                {showVerificationResults && verificationResults && (
                  <div>
                        <div className="bg-white rounded-xl border p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-medium text-gray-900">{t('dnsSetup.verification.connectionStatus')}</h3>
                            <Button
                              variant="ghost"
                              onClick={() => setShowVerificationResults(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {verificationResults?.domainReady === true ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                              </div>
                              <h3 className="text-xl font-medium text-gray-900 mb-2">Domain Connected!</h3>
                              <p className="text-gray-600 mb-6">
                                Your domain is ready to send emails. You can now create sender accounts.
                              </p>
                              <div className="space-x-4">
                                <Button 
                                  onClick={() => {
                                    // Refresh domains and hide instructions
                                    fetchDomainsAndSenders()
                                    if (onShowDomainInstructions) {
                                      onShowDomainInstructions(false)
                                    }
                                  }}
                                  className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                  style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                                  }}
                                >
                                  Continue to Sender Selection
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    if (onShowDomainInstructions) {
                                      onShowDomainInstructions(false)
                                    }
                                  }}
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                  Back to Setup
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-3 mb-4">
                                  <AlertCircle className="h-6 w-6 text-red-500" />
                                  <span className="text-lg font-medium text-gray-900">{t('dnsSetup.verification.setupNotComplete')}</span>
                                </div>
                                <p className="text-gray-600 mb-6">
                                  {t('dnsSetup.verification.someDNSRecordsNeeded')}
                                </p>
                              </div>
                              
                              {/* Simple list of missing records */}
                              {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                                .filter((record: any) => !record.verified)
                                .length > 0 && (
                                <div className="bg-red-50 rounded-lg p-6">
                                  <h4 className="font-medium text-gray-900 mb-4">{t('dnsSetup.verification.pleaseCheckSettings')}</h4>
                                  <div className="space-y-3">
                                    {(verificationResults.report?.records || verificationResults.recommendations || verificationResults.records || [])
                                      .filter((record: any) => !record.verified)
                                      .map((record: any, index: number) => (
                                      <div key={`missing-${index}`} className="flex items-center gap-3 bg-white rounded-lg p-3">
                                        <span className="text-red-500 text-lg">✗</span>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">
                                            {(() => {
                                              const recordText = record.record || `${record.type} ${record.host || ''}`;
                                              // If it contains "Cryptographic email signing", translate it
                                              if (recordText.includes('Cryptographic email signing')) {
                                                const parts = recordText.split(' - ');
                                                return `${parts[0]} - ${t('dnsSetup.verification.cryptographicEmailSigning')}`;
                                              }
                                              return recordText.replace(/\(.*?\)/g, '').trim();
                                            })()}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            {t('dnsSetup.verification.checkSettingInDNS', { type: record.type })}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Action buttons */}
                              <div className="text-center">
                                <p className="text-sm text-gray-600 mb-4">
                                  {t('dnsSetup.verification.reviewDNSSettings')}
                                </p>
                                <div className="space-x-3">
                                  <Button
                                    onClick={() => {
                                      setShowVerificationResults(false)
                                      setDnsRecordsAdded(false)
                                    }}
                                    className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                    style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'
                                    }}
                                  >
                                    {t('dnsSetup.verification.checkAgain')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      if (onShowDomainInstructions) {
                                        onShowDomainInstructions(false)
                                      }
                                    }}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
                                  >
                                    Back to Setup
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                {/* Back button - only show when not showing verification results */}
                {!showVerificationResults && (
                  <div className="text-center">
                    <Button
                      onClick={() => {
                        console.log('🔄 Going back to domain setup...')
                        if (onShowDomainInstructions) {
                          onShowDomainInstructions(false)
                        }
                      }}
                      variant="outline"
                      className="px-6 py-3"
                    >
                      ← Back to Setup
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default no domains screen
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center bg-white dark:bg-gray-900 rounded-3xl p-12 shadow-sm border border-gray-100/50 dark:border-gray-800">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-medium text-gray-900 mb-4">{t('senderManagement.noVerifiedDomains.title')}</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                {t('senderManagement.noVerifiedDomains.description')}
              </p>
              <Button 
                onClick={() => {
                  console.log('🔄 Opening domain setup modal...')
                  setShowDomainSetupModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-8 py-4 text-lg"
              >
                <Plus className="h-5 w-5 mr-3" />
                {t('senderManagement.noVerifiedDomains.setupButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show sender management if requested
  if (showSenderManagement && selectedDomainForSenders) {
    return (
      <SenderManagement 
        domainId={selectedDomainForSenders}
        campaignId={campaignId.toString()}
        onBack={() => {
          if (onShowSenderManagement) {
            onShowSenderManagement(false)
          }
          // Refresh data when returning from sender management
          fetchDomainsAndSenders()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] dark:bg-gray-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-2">{t('senderManagement.header.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('senderManagement.header.description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Edit Accounts button - show if there are any verified domains with senders */}
              {domainsWithSenders.some(domain => domain.status === 'verified' && domain.senders.length > 0) && (
                <Button
                  onClick={() => {
                    // Find the first verified domain with senders to edit
                    const domainToEdit = domainsWithSenders.find(domain => 
                      domain.status === 'verified' && domain.senders.length > 0
                    )
                    if (domainToEdit && onDomainSelected && onShowSenderManagement) {
                      onDomainSelected(domainToEdit.id)
                      onShowSenderManagement(true)
                    }
                  }}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl px-5 py-2.5 font-medium transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('senderManagement.buttons.editAccounts')}
                </Button>
              )}
              
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
                      {t('senderManagement.buttons.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {hasUnsavedChanges ? t('senderManagement.buttons.save') : t('senderManagement.buttons.saved')}
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => {
                  console.log('🔄 Redirecting to domains tab...')
                  const currentUrl = new URL(window.location.href)
                  currentUrl.searchParams.set('tab', 'domain')
                  window.location.href = currentUrl.toString()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-5 py-2.5 font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('senderManagement.buttons.addDomain')}
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
              <div key={domain.id} className="bg-white dark:bg-gray-900 border-0 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleDomainExpansion(domain.id)}
                        className="flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl p-3 -ml-3 transition-colors duration-200"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                            <Globe className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 transition-colors">
                              {domain.domain}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              {domain.senders.length} {domain.senders.length === 1 ? t('senderManagement.senderAccount') : t('senderManagement.senderAccounts')}
                              {selectedInDomain > 0 && (
                                <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">
                                  • {selectedInDomain} {t('senderManagement.selected')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-0 px-3 py-1 rounded-xl text-xs font-medium">
                        {t('senderManagement.verified')}
                      </Badge>
                      
                      {domain.senders.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5">
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
                          <label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer font-medium">
                            {t('senderManagement.selectAll')}
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
                        className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('senderManagement.buttons.delete')}
                      </Button>
                    </div>
                  </div>
                </div>

                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <div className="px-8 pb-8">
                      {domain.senders.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">{t('senderManagement.noSenderAccounts.title')}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            {t('senderManagement.noSenderAccounts.description')}
                          </p>
                          <Button
                            onClick={() => {
                              console.log('🔄 Opening sender management for domain:', domain.id)
                              if (onDomainSelected) {
                                onDomainSelected(domain.id)
                              }
                              if (onShowSenderManagement) {
                                onShowSenderManagement(true)
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('senderManagement.noSenderAccounts.addButton')}
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
                              className={`border border-gray-100/50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 rounded-2xl p-6 ${
                                isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 hover:shadow-sm'
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
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                                      <User className="h-6 w-6 text-gray-600" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3">
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-lg">
                                          {sender.display_name || sender.email.split('@')[0]}
                                        </h4>
                                        {sender.is_default && (
                                          <Badge className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg text-xs font-medium">
                                            Primary
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-gray-600 dark:text-gray-400 mt-1">{sender.email}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-8">
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('senderManagement.dailyLimit')}</div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{sender.daily_limit || 50}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('senderManagement.emailsPerDay')}</div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      Today: {sender.emails_sent_today || 0} sent
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('senderManagement.healthScore')}</div>
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
                                  <div className="text-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Warmup Status</div>
                                    {(() => {
                                      const statusInfo = getWarmupStatusInfo(sender.warmup_status)
                                      const StatusIcon = statusInfo.icon
                                      return (
                                        <div className="flex flex-col items-center gap-1">
                                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${statusInfo.bg}`}>
                                            <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                                            <span className={`text-xs font-medium ${statusInfo.color}`}>
                                              {statusInfo.label}
                                            </span>
                                          </div>
                                          {sender.warmup_phase && sender.warmup_phase > 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              Phase {sender.warmup_phase}: {getWarmupPhaseLabel(sender.warmup_phase)}
                                            </div>
                                          )}
                                          {sender.warmup_started_at && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              Day {(() => {
                                                const now = new Date();
                                                const startDate = new Date(sender.warmup_started_at);
                                                const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                                return Math.min(Math.max(daysSinceStart + 1, 1), 35);
                                              })()} / 35
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTestClick(sender)
                                    }}
                                    variant="outline"
                                    className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl px-3 py-1.5 text-xs font-medium"
                                  >
                                    Test
                                  </Button>
                                </div>
                                
                                {/* Warmup Activity Section */}
                                {sender.warmup_status === 'active' && (
                                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-6 text-sm">
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        <span className="text-gray-600 dark:text-gray-400">
                                          Today's Warmup: 
                                          <span className="font-medium text-gray-900 dark:text-gray-100 ml-1">
                                            {sender.warmup_emails_sent_today || 0} emails
                                          </span>
                                        </span>
                                      </div>
                                      {sender.last_warmup_sent && (
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                          <Activity className="h-4 w-4" />
                                          <span>
                                            Last: {new Date(sender.last_warmup_sent).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
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
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-0 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t('senderManagement.testModal.title')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('senderManagement.testModal.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTestModal(false)}
                    className="ml-auto w-8 h-8 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {testModalSender && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {testModalSender.email}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {testModalSender.display_name || 'Sender Account'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Send test email to:
                  </label>
                  <input
                    type="email"
                    value={testModalEmail}
                    onChange={(e) => setTestModalEmail(e.target.value)}
                    placeholder={t('senderManagement.testModal.emailPlaceholder')}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-900/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {t('senderManagement.testModal.note')}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button
                  onClick={() => setShowTestModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl text-sm"
                >
                  {t('senderManagement.testModal.cancel')}
                </Button>
                <Button
                  onClick={sendTestEmail}
                  disabled={testModalLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm"
                >
                  {testModalLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('senderManagement.testModal.sending')}
                    </div>
                  ) : (
                    t('senderManagement.testModal.sendTest')
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Domain Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-medium text-gray-900 dark:text-gray-100">Delete Domain</DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400 pt-2">
                Are you sure you want to delete "{domainToDelete?.domain}"?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">This will permanently remove:</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• The domain and all its DNS settings</li>
                  <li>• {domainToDelete?.senders.length || 0} {(domainToDelete?.senders.length || 0) === 1 ? t('senderManagement.senderAccount') : t('senderManagement.senderAccounts')}</li>
                  <li>• All email history for this domain</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteDomain}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Loading Popup for Sender Account Creation */}
        <Dialog open={creatingSenderAccounts} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="sr-only">Creating Email Accounts</DialogTitle>
            </DialogHeader>
            
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-green-400 animate-spin animate-reverse"></div>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Creating Email Accounts...</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Setting up your sender accounts automatically
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal is now managed by parent component */}
      </div>
    </div>
  )
}