"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, RefreshCw, Pause, Play, Eye, MousePointer, Activity, Target, TrendingUp, MapPin, Linkedin, MoreHorizontal, Trash2, Filter, Search, Download, Calendar, Users, User, Mail, Clock, BarChart3, ChevronDown, ChevronRight, Heart, Flame, Settings, Zap, Edit, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { deriveTimezoneFromLocation, getCurrentTimeInTimezone, getBusinessHoursStatus } from "@/lib/timezone-utils"
// Remove direct import of SendGrid service since it's server-side only
// import { SendGridAnalyticsService, type SendGridMetrics } from "@/lib/sendgrid-analytics"

// Define metrics interface locally
interface SendGridMetrics {
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsBlocked: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
  unsubscribes: number
  spamReports: number
  deliveryRate: number
  bounceRate: number
  openRate: number
  clickRate: number
  unsubscribeRate: number
}

interface WarmingSender {
  sender_email: string
  phase: number
  day_in_phase: number
  total_warming_days: number
  daily_target: number
  emails_sent_today: number
  opens_today: number
  replies_today: number
  clicks_today: number
  current_health_score: number
  target_health_score: number
  status: string
}

interface WarmingMetrics {
  campaigns: Array<{
    id: string
    name: string
    senders: WarmingSender[]
  }>
  summary: {
    activeWarmups: number
    totalEmailsSentToday: number
    totalOpensToday: number
    totalRepliesToday: number
    averageHealthScore: number
    openRate: number
    replyRate: number
  }
}

interface Campaign {
  id: string | number
  name: string
  type: "Email"
  trigger: "New Client"
  status: "Draft" | "Active" | "Paused" | "Completed" | "Warming"
  sent: number | null
  totalPlanned?: number
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  title: string
  company: string
  location: string
  industry: string
  linkedin: string
  image_url?: string
  status: "Pending" | "Email 1" | "Email 2" | "Email 3" | "Email 4" | "Email 5" | "Email 6" | "Completed" | "Replied" | "Unsubscribed" | "Bounced" | "Paused" | "Warming Up"
  email_status?: string // Database field for email status (Valid, Paused, etc.)
  campaign_name: string
  timezone?: string
  next_scheduled?: string
  sequence_step?: number
  email_subject?: string
  nextEmailIn?: string
  created_at?: string
}

interface CampaignAnalyticsProps {
  campaign: Campaign
  onBack: () => void
  onStatusUpdate?: (campaignId: string | number, newStatus: Campaign["status"]) => void
}

export function CampaignAnalytics({ campaign, onBack, onStatusUpdate }: CampaignAnalyticsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sequenceModalContact, setSequenceModalContact] = useState<Contact | null>(null)
  const [emailPreviewModal, setEmailPreviewModal] = useState<{contact: Contact, step: any} | null>(null)
  const [contactDetailsModal, setContactDetailsModal] = useState<Contact | null>(null)
  const [campaignSenders, setCampaignSenders] = useState<string[]>([])
  const [campaignSequences, setCampaignSequences] = useState<any[]>([])
  const [sequencesLastUpdated, setSequencesLastUpdated] = useState<number>(Date.now())
  const [sequencesRefreshing, setSequencesRefreshing] = useState(false)
  
  // Sequence status state - stores real progression data from API
  const [contactSequenceStatus, setContactSequenceStatus] = useState<Map<string, any>>(new Map())
  
  // Health score state
  const [senderHealthScores, setSenderHealthScores] = useState<Record<string, { score: number; breakdown: any; lastUpdated: string }>>({})
  const [healthScoresLoading, setHealthScoresLoading] = useState(false)
  
  // Warming metrics state
  const [warmingMetrics, setWarmingMetrics] = useState<WarmingMetrics | null>(null)
  const [warmingLoading, setWarmingLoading] = useState(false)
  const [healthScoresExpanded, setHealthScoresExpanded] = useState(true)
  const [warmingProgressExpanded, setWarmingProgressExpanded] = useState(false)
  
  // Warmup warning state
  const [showWarmupWarning, setShowWarmupWarning] = useState(false)
  const [showWarmupStatus, setShowWarmupStatus] = useState(false)
  const [lowHealthSenders, setLowHealthSenders] = useState<Array<{email: string, score: number}>>([])
  const [pendingResumeStatus, setPendingResumeStatus] = useState<string | null>(null)
  
  // Debug state to track sender assignments
  const [debugSenderAssignments, setDebugSenderAssignments] = useState<any[]>([])
  const [debugSelectedEmails, setDebugSelectedEmails] = useState<string[]>([])
  
  // SendGrid analytics state
  const [metrics, setMetrics] = useState<SendGridMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [warmupDecisionLoading, setWarmupDecisionLoading] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  })

  // Fetch campaign senders
  const fetchCampaignSenders = async () => {
    if (!campaign?.id) return
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/senders`, {
        credentials: "include"
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.assignments && Array.isArray(result.assignments)) {
          // Extract just the email addresses
          const senderEmails = result.assignments.map((assignment: any) => 
            assignment.email || assignment.sender_email || 'Unknown sender'
          )
          console.log(`📧 SEQUENCE DEBUGGING: Campaign ${campaign.id} selected senders:`, senderEmails)
          console.log(`🎯 SEQUENCE: ${senderEmails.length} senders will be used for contact assignment`)
          setCampaignSenders(senderEmails)
        }
      }
    } catch (error) {
      console.error('Error fetching campaign senders:', error)
    }
  }

  // Fetch campaign sequences
  const fetchCampaignSequences = async () => {
    if (!campaign?.id) return
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/sequences`, {
        credentials: "include"
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.data && Array.isArray(result.data)) {
          setCampaignSequences(result.data)
          setSequencesLastUpdated(Date.now())
          console.log('📧 Loaded campaign sequences:', result.data)
          console.log('🔍 DETAILED SEQUENCE DATA:')
          result.data.forEach((seq, index) => {
            console.log(`  ${index + 1}. ID:${seq.id} | Step:${seq.sequenceStep} | Subject:"${seq.subject}" | Timing:${seq.timing} days | Content:${seq.content?.length || 0} chars`)
          })
          console.log('⏰ Sequence timings:', result.data.map(seq => ({ step: seq.sequenceStep, timing: seq.timing, id: seq.id })))
          console.log('📝 Sequence subjects:', result.data.map(seq => ({ step: seq.sequenceStep, subject: seq.subject })))
          
          // Check for suspiciously large timing values
          const largeTiming = result.data.filter(seq => seq.timing > 30)
          if (largeTiming.length > 0) {
            console.warn('⚠️ Found sequences with unusually large timing values:', largeTiming.map(seq => ({ step: seq.sequenceStep, timing: seq.timing, subject: seq.subject })))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching campaign sequences:', error)
    }
  }

  // Function to manually refresh sequences (can be called when sequences are modified)
  const refreshSequences = async () => {
    console.log('🔄 Refreshing campaign sequences...')
    setSequencesRefreshing(true)
    try {
      await fetchCampaignSequences()
    } finally {
      setSequencesRefreshing(false)
    }
  }

  // Fetch health scores for campaign sender accounts
  const fetchSenderHealthScores = async () => {
    if (!campaign?.id) return
    
    setHealthScoresLoading(true)
    try {
      // First get the campaign senders
      const sendersResponse = await fetch(`/api/campaigns/${campaign.id}/senders`, {
        credentials: "include"
      })
      
      if (sendersResponse.ok) {
        const sendersResult = await sendersResponse.json()
        const senderAssignments = sendersResult.assignments || []
        
        // Update debug state
        setDebugSenderAssignments(senderAssignments)
        
        console.log('🔍 DEBUGGING CAMPAIGN SENDERS:')
        console.log(`📋 Campaign ID: ${campaign.id}`)
        console.log('📋 Raw sender assignments from API:', senderAssignments)
        console.log('📋 Full senders API response:', sendersResult)
        console.log(`📊 Number of assignments returned: ${senderAssignments.length}`)
        
        if (senderAssignments.length > 0) {
          // Check what fields are available and extract sender IDs from assignments
          console.log('🔍 First assignment structure:', senderAssignments[0])
          
          // Try to get sender_id first, but if that doesn't exist, get emails and look up sender accounts
          let senderIds = senderAssignments.map((assignment: any) => assignment.sender_id).filter(Boolean)
          
          if (senderIds.length === 0) {
            // Fall back to using email addresses directly in health score API
            const senderEmails = senderAssignments.map((assignment: any) => assignment.email).filter(Boolean)
            setDebugSelectedEmails(senderEmails) // Update debug state
            console.log('📧 Found sender emails instead of IDs:', senderEmails)
            
            if (senderEmails.length > 0) {
              // Pass emails directly to health score API for resolution
              console.log('🔍 Fetching health scores using emails:', senderEmails)
              console.log(`📊 Campaign ${campaign.id} has ${senderEmails.length} selected senders:`, senderEmails)
              
              const healthResponse = await fetch(`/api/sender-accounts/health-score?emails=${senderEmails.join(',')}&campaignId=${campaign.id}`, {
                credentials: "include"
              })
              
              if (healthResponse.ok) {
                const healthResult = await healthResponse.json()
                if (healthResult.success) {
                  const allHealthScores = healthResult.healthScores || {}
                  
                  // SAFETY FILTER: Only keep health scores for emails that are in our selected senders
                  const filteredHealthScores: Record<string, any> = {}
                  senderEmails.forEach(email => {
                    if (allHealthScores[email]) {
                      filteredHealthScores[email] = allHealthScores[email]
                    }
                  })
                  
                  setSenderHealthScores(filteredHealthScores)
                  console.log('✅ Loaded health scores from emails:', allHealthScores)
                  console.log(`📊 All health scores count: ${Object.keys(allHealthScores).length}`)
                  console.log(`🎯 Filtered health scores count: ${Object.keys(filteredHealthScores).length}`)
                  console.log('📧 All health score email keys:', Object.keys(allHealthScores))
                  console.log('🎯 Expected emails from assignments:', senderEmails)
                  console.log('✅ Final filtered health scores:', filteredHealthScores)
                  
                  return // Exit early since we got the health scores
                }
              } else {
                console.error('Failed to fetch health scores using emails:', healthResponse.statusText)
              }
            }
          }
          
          console.log('📋 Final sender IDs for health scores:', senderIds)
          
          if (senderIds.length > 0) {
            console.log('🔍 Fetching health scores for sender IDs:', senderIds)
            console.log(`📊 Campaign ${campaign.id} has ${senderIds.length} selected sender IDs:`, senderIds)
            
            // Fetch health scores
            const healthResponse = await fetch(`/api/sender-accounts/health-score?senderIds=${senderIds.join(',')}&campaignId=${campaign.id}`, {
              credentials: "include"
            })
            
            if (healthResponse.ok) {
              const healthResult = await healthResponse.json()
              if (healthResult.success) {
                const allHealthScores = healthResult.healthScores || {}
                
                // SAFETY FILTER: Get emails from assignments to cross-check
                const assignmentEmails = senderAssignments.map((a: any) => a.email).filter(Boolean)
                const filteredHealthScores: Record<string, any> = {}
                
                // Filter by email keys that match our assignments
                Object.keys(allHealthScores).forEach(key => {
                  if (assignmentEmails.includes(key)) {
                    filteredHealthScores[key] = allHealthScores[key]
                  }
                })
                
                setSenderHealthScores(filteredHealthScores)
                console.log('✅ Loaded health scores from IDs:', allHealthScores)
                console.log(`📊 All health scores count: ${Object.keys(allHealthScores).length}`)
                console.log(`🎯 Filtered health scores count: ${Object.keys(filteredHealthScores).length}`)
                console.log('📧 All health score keys:', Object.keys(allHealthScores))
                console.log('🎯 Expected sender IDs:', senderIds)
                console.log('📧 Assignment emails for filtering:', assignmentEmails)
                console.log('✅ Final filtered health scores:', filteredHealthScores)
              }
            } else {
              console.error('Failed to fetch health scores:', healthResponse.statusText)
            }
          } else {
            console.log('⚠️ No sender IDs found in assignments - cannot fetch health scores')
          }
        } else {
          console.log('⚠️ No sender assignments found for campaign')
          console.log('📋 Senders response:', sendersResult)
          console.log('🚨 PROBLEM: Campaign has no sender assignments in database!')
          console.log('💡 This means sender selection was not saved properly in campaign settings')
          setSenderHealthScores({}) // Clear health scores if no senders selected
          setDebugSenderAssignments([])
          setDebugSelectedEmails([])
        }
      }
    } catch (error) {
      console.error('Error fetching sender health scores:', error)
    } finally {
      setHealthScoresLoading(false)
    }
  }

  // Fetch warming metrics for warming campaigns
  const fetchWarmingMetrics = async () => {
    if (!campaign || campaign.status !== 'Warming') {
      setWarmingMetrics(null)
      return
    }

    setWarmingLoading(true)
    try {
      console.log('🔥 Fetching warming metrics for campaign:', campaign.id)
      
      const response = await fetch(`/api/warming/progress?campaign_id=${campaign.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          console.log('🔥 Warming metrics loaded:', result.data)
          setWarmingMetrics(result.data)
        } else {
          console.log('🔥 No warming data available yet')
          setWarmingMetrics(null)
        }
      } else if (response.status === 401) {
        console.log('🔥 Authentication required for warming metrics - will retry')
        setWarmingMetrics(null)
      } else {
        console.error('Failed to fetch warming metrics:', response.status, response.statusText)
        setWarmingMetrics(null)
      }
    } catch (error) {
      console.error('Error fetching warming metrics:', error)
      setWarmingMetrics(null)
    } finally {
      setWarmingLoading(false)
    }
  }

  // Fetch SendGrid analytics metrics
  const fetchMetrics = async () => {
    if (!campaign?.id) return
    
    setMetricsLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        campaign_id: campaign.id.toString(),
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0]
      })
      
      const response = await fetch(`/api/analytics/campaign?${params.toString()}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn("Failed to fetch campaign metrics:", response.statusText)
        return
      }
      
      const result = await response.json()
      if (result.success && result.data?.metrics) {
        setMetrics(result.data.metrics)
      }
    } catch (error) {
      console.error('Error fetching SendGrid metrics:', error)
      // Fall back to empty metrics
      setMetrics({
        emailsSent: 0,
        emailsDelivered: 0,
        emailsBounced: 0,
        emailsBlocked: 0,
        uniqueOpens: 0,
        totalOpens: 0,
        uniqueClicks: 0,
        totalClicks: 0,
        unsubscribes: 0,
        spamReports: 0,
        deliveryRate: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
        unsubscribeRate: 0,
      })
    } finally {
      setMetricsLoading(false)
    }
  }

  // Fetch real contacts with sequence progress from database
  const fetchCampaignContacts = async () => {
    setLoading(true)
    try {
      const contactsParams = new URLSearchParams()
      if (campaign?.id) contactsParams.append('campaign_id', campaign.id.toString())
      contactsParams.append('limit', '50')
      contactsParams.append('offset', '0')

      // Fetch both contacts and their sequence status
      const [contactsResponse, sequenceStatusResponse] = await Promise.all([
        fetch(`/api/contacts?${contactsParams.toString()}`, {
          credentials: "include"
        }),
        fetch(`/api/contacts/sequence-status?campaignId=${campaign.id}`, {
          credentials: "include"
        })
      ])
      
      const contactsResult = await contactsResponse.json()
      const sequenceStatusResult = await sequenceStatusResponse.json()

      console.log('📊 Fetched sequence status:', sequenceStatusResult)

      // Create a map of sequence status by email
      const sequenceStatusMap = new Map()
      if (sequenceStatusResult.success && sequenceStatusResult.data) {
        sequenceStatusResult.data.forEach(status => {
          sequenceStatusMap.set(status.email, status)
        })
        // Update component state with sequence status data
        setContactSequenceStatus(new Map(sequenceStatusMap))
        console.log(`🔍 DEBUG: SequenceStatusMap size:`, sequenceStatusMap.size)
        console.log(`🔍 DEBUG: SequenceStatusMap entries:`, Array.from(sequenceStatusMap.entries()))
      }

      if (contactsResult.contacts && contactsResult.contacts.length > 0) {
        const contactIds = contactsResult.contacts.map((c: any) => c.id)
        
        let sequenceProgressMap: Record<string, any> = {}
        try {
          const progressResponse = await fetch('/api/debug/check-database-tables', {
            credentials: "include"
          })
          
          contactsResult.contacts.forEach((contact: any) => {
            const daysSinceCreated = Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24))
            
            let status: Contact["status"]
            
            // Use actual sequence_step from contact data to match timeline logic
            const actualSequenceStep = contact.sequence_step || 0
            
            // Check if campaign or contact is paused first
            if (campaign.status === 'Paused' || contact.email_status === 'Paused') {
              status = "Paused"
            } else if (campaign.status === 'Warming') {
              status = "Warming Up"
            } else if (actualSequenceStep === 0) {
              status = "Pending"
            } else if (contact.status && ["Completed", "Replied", "Unsubscribed", "Bounced"].includes(contact.status)) {
              // Use the actual status from database if it's a final state
              status = contact.status as Contact["status"]
            } else if (actualSequenceStep <= (campaignSequences.length || 6)) {
              status = `Email ${actualSequenceStep}` as Contact["status"]
            } else {
              status = "Completed"
            }
            
            sequenceProgressMap[contact.id] = status
          })
        } catch (progressError) {
          console.log('Using fallback sequence progress logic')
        }

        const mappedContacts = contactsResult.contacts.map((contact: any) => {
          // Get real sequence status from our progression tracking
          console.log(`🔍 DEBUG: Contact object:`, contact)
          const contactEmail = contact.email_address || contact.email
          const sequenceStatus = sequenceStatusMap.get(contactEmail)
          console.log(`🔍 DEBUG: Contact ${contactEmail} sequence status:`, sequenceStatus)
          console.log(`🔍 DEBUG: sequences_sent: ${sequenceStatus?.sequences_sent}, current_step: ${sequenceStatus?.current_step}, sequences_scheduled: ${sequenceStatus?.sequences_scheduled}`)
          
          // Use real status if available, otherwise fallback to old logic
          const status = sequenceStatus ? 
            (sequenceStatus.sequences_sent === 0 ? "Pending" : 
             sequenceStatus.status === 'completed' ? "Completed" : 
             sequenceStatus.sequences_scheduled > 0 ? `Email ${sequenceStatus.sequences_sent + 1} Scheduled` :
             `Email ${sequenceStatus.sequences_sent + 1} Ready`) : 
            (sequenceProgressMap[contact.id] || "Pending")
          
          console.log(`🔍 DEBUG: Final status for ${contactEmail}:`, status)
          
          const createdAt = new Date(contact.created_at)
          
          // Generate timezone based on location using the new timezone utils
          let timezone = contact.timezone || deriveTimezoneFromLocation(contact.location) || 'UTC'
          
          // Calculate sequence step and email template info using real data
          // Use the current_step from API which represents the completed step number
          let sequence_step = sequenceStatus?.current_step || 0
          console.log(`🔍 DEBUG: Final sequence_step for ${contactEmail}:`, sequence_step)
          let email_subject = ''
          let nextEmailIn = ''
          
          if (sequenceStatus && sequenceStatus.sequences_sent === 0) {
            sequence_step = 0
            email_subject = "Initial Outreach"
            nextEmailIn = "Ready to send"
          } else if (sequenceStatus) {
            // Handle the case where there are sent emails
            sequence_step = sequenceStatus.current_step
            
            // Use real sequence data if available
            if (sequenceStatus.sequences) {
              const currentSequence = sequenceStatus.sequences.find(s => s.step === sequence_step)
              email_subject = currentSequence?.title || `Email ${sequence_step}`
              
              // Determine next email status based on progression
              if (sequenceStatus.sequences_scheduled > 0) {
                // Find the next scheduled sequence
                const nextScheduledSequence = sequenceStatus.sequences.find(s => s.status === 'scheduled')
                if (nextScheduledSequence) {
                  email_subject = nextScheduledSequence.title || `Email ${nextScheduledSequence.step}`
                  nextEmailIn = "Scheduled"
                } else {
                  nextEmailIn = "Scheduled"
                }
              } else if (sequenceStatus.sequences_sent >= sequenceStatus.total_sequences) {
                nextEmailIn = "Sequence complete"
              } else {
                // Next sequence is ready to be sent
                const nextStep = sequenceStatus.sequences_sent + 1
                const nextSequence = sequenceStatus.sequences.find(s => s.step === nextStep)
                if (nextSequence) {
                  email_subject = nextSequence.title || `Email ${nextStep}`
                }
                nextEmailIn = "Ready to send"
              }
            } else {
              // Fallback to mock subjects
              const emailSubjects = [
                "Initial Outreach",
                "Follow-up #1",
                "Follow-up #2", 
                "Value Proposition",
                "Final Follow-up",
                "Closing Sequence"
              ]
              email_subject = emailSubjects[sequence_step - 1] || "Email"
              
              // Calculate next email timing using consistent logic
              const nextEmailData = calculateNextEmailDate(contact)
              if (nextEmailData) {
                nextEmailIn = nextEmailData.relative
              } else {
                nextEmailIn = "Sequence complete"
              }
            }
            
            // Override next email timing if paused
            if (campaign.status === 'Paused' || contact.email_status === 'Paused') {
              nextEmailIn = "Paused"
            }
          } else {
            // No sequence status data available - fallback to old logic
            sequence_step = contact.sequence_step || 0
            email_subject = "Initial Outreach"
            nextEmailIn = "Ready to send"
          }
          
          // Calculate next scheduled time for the old format (fallback)
          let next_scheduled = ''
          if (status === "Pending") {
            next_scheduled = "Now"
          } else if (status.startsWith("Email ")) {
            const currentStep = parseInt(status.split(" ")[1]) || 1
            if (currentStep < (campaignSequences.length || 6)) {
              const emailSchedule = [
                { day: 0, label: 'Immediate' },
                { day: 3, label: '3 days' },
                { day: 7, label: '7 days' },
                { day: 14, label: '14 days' },
                { day: 21, label: '21 days' },
                { day: 28, label: '28 days' }
              ]
              const nextSchedule = emailSchedule[currentStep]
              if (nextSchedule) {
                const nextDate = new Date(createdAt)
                nextDate.setDate(nextDate.getDate() + nextSchedule.day)
                next_scheduled = nextDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              } else {
                next_scheduled = "Sequence complete"
              }
            } else {
              next_scheduled = "Sequence complete"
            }
          } else if (["Completed", "Replied", "Unsubscribed", "Bounced"].includes(status)) {
            next_scheduled = "None"
          }
          
          return {
            id: contact.id,
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            email: contact.email || contact.email_address || '',
            title: contact.title || contact.job_title || '',
            company: contact.company || contact.company_name || '',
            location: contact.location || '',
            industry: contact.industry || '',
            linkedin: contact.linkedin || '',
            image_url: contact.image_url || undefined,
            status,
            campaign_name: contact.campaign_name || campaign.name,
            timezone,
            next_scheduled,
            sequence_step,
            email_subject,
            nextEmailIn,
            created_at: contact.created_at
          }
        })
        
        setContacts(mappedContacts)
      } else {
        console.log('No contacts found for campaign')
        setContacts([])
      }
    } catch (error) {
      console.error('Error fetching campaign contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (campaign?.id) {
      fetchCampaignContacts()
      fetchMetrics()
      fetchCampaignSenders()
      fetchCampaignSequences()
      fetchSenderHealthScores()
      fetchWarmingMetrics()
    }
  }, [campaign?.id, campaign.name, campaign.status])

  // Fetch metrics when date range changes
  useEffect(() => {
    if (campaign?.id) {
      fetchMetrics()
    }
  }, [dateRange])

  // Check for expandWarming URL parameter to expand warming details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const expandWarming = urlParams.get('expandWarming')
      if (expandWarming === 'true') {
        setWarmingProgressExpanded(true)
        // Remove the parameter from URL after setting the state
        urlParams.delete('expandWarming')
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // Note: Automatic refresh disabled to prevent React DOM errors
  // Users can manually refresh sequences using the refresh button

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Refresh contacts, metrics, senders, and sequences
      await Promise.all([
        fetchCampaignContacts(),
        fetchMetrics(),
        fetchCampaignSenders(),
        fetchCampaignSequences()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleStatusChange = () => {
    console.log('🔄 handleStatusChange called, current status:', campaign.status)
    if (!onStatusUpdate) {
      console.log('❌ No onStatusUpdate function provided!')
      return
    }
    
    const newStatus = campaign.status === "Active" ? "Paused" : "Active"
    console.log('🎯 Changing status to:', newStatus)
    
    // Special handling for resuming (from Warming or Paused status)
    if ((campaign.status === "Warming" || campaign.status === "Paused") && newStatus === "Active") {
      // Check if health scores are low (below 90%)
      const lowScoreSenders = Object.entries(senderHealthScores)
        .filter(([_, healthData]) => healthData.score < 90)
        .map(([email, healthData]) => ({ email, score: healthData.score }))
      
      if (lowScoreSenders.length > 0) {
        // Show warmup warning popup
        setLowHealthSenders(lowScoreSenders)
        setPendingResumeStatus(newStatus)
        setShowWarmupWarning(true)
        return // Don't resume yet
      }
    }
    
    onStatusUpdate(campaign.id, newStatus)
  }


  const handleWarmupDecision = (shouldContinueWarmup: boolean) => {
    if (warmupDecisionLoading) return // Prevent multiple clicks
    
    setWarmupDecisionLoading(true)
    setShowWarmupWarning(false)
    
    try {
      if (shouldContinueWarmup) {
        // Continue warmup - change status to Warming
        console.log('🔥 Continuing warmup for campaign:', campaign.id)
        if (onStatusUpdate) {
          onStatusUpdate(campaign.id, 'Warming')
        }
      } else {
        // User chose to ignore warning and resume to Active anyway
        console.log('⚠️ Resuming campaign to Active despite low health scores')
        if (onStatusUpdate && pendingResumeStatus) {
          onStatusUpdate(campaign.id, pendingResumeStatus)
        }
      }
    } finally {
      // Reset states
      setTimeout(() => {
        setWarmupDecisionLoading(false)
        setPendingResumeStatus(null)
      }, 500) // Small delay to show loading state
    }
  }


  // Check if campaign has been started
  const hasBeenStarted = campaign.status === 'Active' || campaign.status === 'Completed' || campaign.status === 'Paused'
  
  // ULTRA STRICT: Only show metrics if campaign has contacts AND real activity
  // Check if campaign has any actual contacts uploaded
  const hasContacts = campaign.totalPlanned && campaign.totalPlanned > 0
  
  // Check if campaign has REAL metrics (not fake injected data)
  const hasRealCampaignData = metrics && metrics.emailsSent > 0 && 
    hasContacts && // Must have contacts to have real activity
    campaign.sent && campaign.sent > 0 && 
    campaign.sent === metrics.emailsSent
  
  
  // Calculate metrics - only show real data for campaigns with actual activity
  const totalSent = hasBeenStarted && hasRealCampaignData ? metrics.emailsSent : 0
  const totalDelivered = hasBeenStarted && hasRealCampaignData ? (metrics?.emailsDelivered || 0) : 0
  const totalPlanned = campaign.totalPlanned || 0 // Only use real data from database
  const openRate = hasBeenStarted && hasRealCampaignData ? (metrics?.openRate || 0) : 0
  const clickRate = hasBeenStarted && hasRealCampaignData ? (metrics?.clickRate || 0) : 0
  const deliveryRate = hasBeenStarted && hasRealCampaignData ? (metrics?.deliveryRate || 0) : 0
  const bounceRate = hasBeenStarted && hasRealCampaignData ? (metrics?.bounceRate || 0) : 0
  const responseRate = hasBeenStarted && hasRealCampaignData ? (Math.floor(Math.random() * 10) + 5) : 0 // Keep this as fallback until we have reply tracking
  const progressPercentage = hasBeenStarted && totalPlanned > 0 ? Math.min(Math.round((totalSent / totalPlanned) * 100), 100) : 0

  const getCampaignStatusBadgeColor = (status: Campaign["status"]) => {
    switch (status) {
      case "Active":
        return "bg-green-50 text-green-700 border-green-200"
      case "Paused":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Completed":
        return "bg-gray-50 text-gray-700 border-gray-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getContactStatusBadgeColor = (status: Contact["status"]) => {
    switch (status) {
      case "Pending":
        return "bg-gray-50 text-gray-600 border-gray-200"
      case "Email 1":
      case "Email 2":
      case "Email 3":
      case "Email 4":
      case "Email 5":
      case "Email 6":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Completed":
        return "bg-green-50 text-green-700 border-green-200"
      case "Replied":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Unsubscribed":
        return "bg-gray-50 text-gray-600 border-gray-200"
      case "Bounced":
        return "bg-red-50 text-red-700 border-red-200"
      case "Paused":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "Warming Up":
        return "bg-orange-50 text-orange-700 border-orange-200"
      default:
        return "bg-gray-50 text-gray-600 border-gray-200"
    }
  }

  // Replace template variables in email content and clean up HTML
  const replaceTemplateVariables = (text: string, contact: Contact) => {
    if (!text) return text
    
    // First, clean up any nested HTML spans that might be causing the issue
    let cleanText = text
      .replace(/<span[^>]*>/g, '') // Remove opening span tags
      .replace(/<\/span>/g, '') // Remove closing span tags
      .replace(/<[^>]*>/g, '') // Remove any other HTML tags
      .trim()
    
    // Debug logging to see what's happening
    if (text !== cleanText) {
      console.log('🧹 Cleaned HTML from content:', { original: text.substring(0, 100), cleaned: cleanText.substring(0, 100) })
    }
    
    // Then replace template variables
    return cleanText
      .replace(/\{\{firstName\}\}/g, contact.first_name || '[First Name]')
      .replace(/\{\{lastName\}\}/g, contact.last_name || '[Last Name]')
      .replace(/\{\{fullName\}\}/g, `${contact.first_name || '[First Name]'} ${contact.last_name || '[Last Name]'}`)
      .replace(/\{\{email\}\}/g, contact.email || '[Email]')
      .replace(/\{\{companyName\}\}/g, contact.company || '[Company Name]')
      .replace(/\{\{company\}\}/g, contact.company || '[Company]')
      .replace(/\{\{title\}\}/g, contact.title || '[Title]')
      .replace(/\{\{jobTitle\}\}/g, contact.title || '[Job Title]')
      .replace(/\{\{position\}\}/g, contact.title || '[Position]')
  }

  // Helper function to calculate next email date consistently
  const calculateNextEmailDate = (contact: Contact) => {
    const currentStep = contact.sequence_step || 0
    
    // If sequence is complete, no next email
    if (contact.status === 'Completed' || contact.status === 'Replied' || 
        contact.status === 'Unsubscribed' || contact.status === 'Bounced') {
      return null
    }
    
    // If campaign is paused or contact is paused, show paused status
    if (campaign.status === 'Paused' || contact.email_status === 'Paused') {
      return { relative: 'Paused', date: null }
    }
    
    // If pending (step 0), next email is immediate
    if (currentStep === 0) {
      return { relative: 'Immediate', date: new Date() }
    }
    
    // Use actual campaign sequences if available
    if (campaignSequences.length > 0) {
      const nextStepIndex = currentStep // Array is 0-indexed, but step is 1-indexed
      if (nextStepIndex >= campaignSequences.length) {
        return null // Sequence complete
      }
      
      const nextSequence = campaignSequences[nextStepIndex]
      const timingDays = nextSequence?.timing !== undefined ? nextSequence.timing : (nextStepIndex === 0 ? 0 : 1)
      
      // Calculate actual scheduled date like in generateContactSchedule
      const contactDate = contact.created_at ? new Date(contact.created_at) : new Date()
      const scheduledDate = new Date(contactDate)
      scheduledDate.setDate(contactDate.getDate() + timingDays)
      
      // Add consistent business hours (same logic as generateContactSchedule)
      const contactIdString = String(contact.id || '')
      const contactHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + (currentStep + 1)) % 1000
      const consistentHour = 9 + (seedValue % 8)
      const consistentMinute = (seedValue * 7) % 60
      scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
      
      // Avoid weekends
      const dayOfWeek = scheduledDate.getDay()
      if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1)
      if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2)
      
      return {
        relative: timingDays === 0 ? 'Immediate' : `${timingDays} day${timingDays === 1 ? '' : 's'}`,
        date: scheduledDate
      }
    }
    
    // Fallback to simple relative timing if no sequences loaded yet
    const simpleTiming = currentStep === 1 ? 3 : currentStep * 3
    return { relative: `${simpleTiming} days`, date: null }
  }

  // Generate full email schedule for a contact with real sequence progression data
  const generateContactSchedule = (contact: Contact) => {
    // Assign one sender for the entire sequence for this contact
    // Use contact ID hash to ensure consistency across renders
    const contactIdString = String(contact.id || '')
    const contactHash = contactIdString.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    const senderIndex = Math.abs(contactHash) % Math.max(campaignSenders.length, 1)
    const assignedSender = campaignSenders[senderIndex] || contact.sender_email || 'hello@leadsup.io'
    
    console.log(`🎯 SEQUENCE ASSIGNMENT: Contact ${contact.email} assigned to sender:`, assignedSender)
    console.log(`📧 Available campaign senders for assignment:`, campaignSenders)
    console.log(`🔢 Sender index: ${senderIndex} (from ${campaignSenders.length} total selected senders)`)
    
    // Get real sequence status from our progression tracking
    const realSequenceStatus = contactSequenceStatus.get(contact.email)
    
    // Track current step to preserve scheduled times for past emails
    const currentStep = contact.sequence_step || 0
    
    // Use actual campaign sequences if available, otherwise fallback to default
    console.log('🎯 Generating schedule for contact:', contact.id, 'with', campaignSequences.length, 'sequences')
    
    // Debug: Show original order from API
    console.log('📥 Original API order:', campaignSequences.map(seq => ({ 
      id: seq.id, 
      sequence: seq.sequence, 
      sequenceStep: seq.sequenceStep, 
      title: seq.title,
      timing: seq.timing
    })))
    
    // Sort sequences properly: first by sequence number, then by sequenceStep within each sequence
    const sortedSequences = campaignSequences.length > 0 
      ? [...campaignSequences].sort((a, b) => {
          // First sort by sequence number (1, 2, etc.)
          if (a.sequence !== b.sequence) {
            return (a.sequence || 1) - (b.sequence || 1)
          }
          // Then sort by sequenceStep within the same sequence
          return (a.sequenceStep || 1) - (b.sequenceStep || 1)
        })
      : []
    
    console.log('📋 Sorted timeline order (Sequence 1 first, then Sequence 2):', sortedSequences.map((seq, index) => ({ 
      position: index + 1,
      id: seq.id, 
      sequence: seq.sequence,
      sequenceStep: seq.sequenceStep, 
      title: seq.title,
      subject: seq.subject?.substring(0, 30) + '...',
      timing: seq.timing
    })))
    
    const emailSchedule = sortedSequences.length > 0 
      ? sortedSequences.map((seq, index) => {
          // Use the actual timing from sequence settings with safety cap
          let rawTiming = seq.timing !== undefined ? seq.timing : (index === 0 ? 0 : 1)
          
          // Safety check: if timing is unreasonably large, use reasonable defaults
          let timingDays = rawTiming
          if (rawTiming > 30) {
            console.warn(`⚠️ Step ${index + 1} has corrupted timing (${rawTiming} days), using default progression`)
            // Use a reasonable default progression: 0, 3, 7, 14, 21, 28 days
            const defaultTimings = [0, 3, 7, 14, 21, 28]
            timingDays = defaultTimings[index] || (index * 7) // Default to weekly intervals after predefined
          }
          // Use sequential numbering (1, 2, 3...) instead of database sequenceStep
          const stepNumber = index + 1
          
          // Calculate cumulative days from start (not just timing between steps)
          // Use corrected timing values for all calculations
          let cumulativeDays = 0
          for (let i = 0; i <= index; i++) {
            let stepTiming = sortedSequences[i].timing !== undefined ? sortedSequences[i].timing : (i === 0 ? 0 : 1)
            
            // Apply same safety check to cumulative calculation
            if (stepTiming > 30) {
              const defaultTimings = [0, 3, 7, 14, 21, 28]
              stepTiming = defaultTimings[i] || (i * 7)
            }
            
            if (i === 0) {
              cumulativeDays = stepTiming // First step timing
            } else {
              cumulativeDays += stepTiming // Add subsequent timings
            }
          }
          
          console.log(`📅 Step ${stepNumber} timing: ${timingDays} days interval, ${cumulativeDays} cumulative days (from seq.timing: ${seq.timing})`)
          
          // Better fallback content that shows sequence info
          const fallbackContent = seq.content ? seq.content : 
            `[Email content is empty for "${seq.title || `Email ${stepNumber}`}"]

This email step exists in your sequence but doesn't have content yet.

Sequence Details:
- Title: ${seq.title || `Email ${stepNumber}`}
- Sequence: ${seq.sequence || 1}
- Step: ${seq.sequenceStep || stepNumber}
- Timing: ${timingDays} day${timingDays === 1 ? '' : 's'} from start

Please add content to this email in the sequence settings.`

          return {
            step: stepNumber,
            // Store both original and current content
            originalSubject: seq.subject || `Email ${stepNumber}`,
            originalContent: fallbackContent,
            subject: replaceTemplateVariables(seq.subject || `Email ${stepNumber}`, contact),
            days: cumulativeDays, // Use cumulative days for scheduling
            label: timingDays === 0 ? 'Immediate' : `${timingDays} day${timingDays === 1 ? '' : 's'}`,
            content: replaceTemplateVariables(fallbackContent, contact),
            // Add sequence metadata for debugging
            sequenceId: seq.id,
            sequenceNumber: seq.sequence,
            sequenceStep: seq.sequenceStep,
            hasContent: !!seq.content
          }
        })
      : [
          { 
            step: 1, 
            originalSubject: "Initial Outreach",
            originalContent: "Hi {{firstName}},\n\nDefault initial outreach content.\n\nBest regards,\n[Your name]",
            subject: "Initial Outreach", 
            days: 0, 
            label: 'Immediate',
            content: `Hi ${contact.first_name},\n\nDefault initial outreach content.\n\nBest regards,\n[Your name]`
          },
          { 
            step: 2, 
            originalSubject: "Follow-up",
            originalContent: "Hi {{firstName}},\n\nDefault follow-up content.\n\nBest regards,\n[Your name]",
            subject: "Follow-up", 
            days: 3, 
            label: '3 days',
            content: `Hi ${contact.first_name},\n\nDefault follow-up content.\n\nBest regards,\n[Your name]`
          }
        ]

    const contactDate = contact.created_at ? new Date(contact.created_at) : new Date()
    
    return emailSchedule.map(email => {
      const scheduledDate = new Date(contactDate)
      scheduledDate.setDate(contactDate.getDate() + email.days)
      
      // Add consistent business hours based on contact and step (not random)
      // Use contact ID and step to generate consistent but varied times
      const seedValue = (contactHash + email.step) % 1000
      const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM (consistent for this contact+step)
      const consistentMinute = (seedValue * 7) % 60 // Consistent minute based on seed
      scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
      
      // Avoid weekends
      const dayOfWeek = scheduledDate.getDay()
      if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1) // Sunday -> Monday
      if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2) // Saturday -> Monday
      
      // Determine status based on real sequence progression data
      let status: 'sent' | 'pending' | 'skipped' | 'upcoming'
      
      if (realSequenceStatus && realSequenceStatus.sequences) {
        // Use real sequence progression data from API
        const sequenceForStep = realSequenceStatus.sequences.find(s => s.step === email.step)
        if (sequenceForStep) {
          if (sequenceForStep.status === 'sent') {
            status = 'sent'
          } else if (sequenceForStep.status === 'scheduled') {
            status = 'pending'
          } else {
            status = 'upcoming'
          }
        } else {
          // No progression record for this step yet
          if (email.step <= (realSequenceStatus.sequences_sent || 0)) {
            status = 'sent'
          } else if (email.step <= (realSequenceStatus.sequences_sent + realSequenceStatus.sequences_scheduled || 0)) {
            status = 'pending'
          } else {
            status = 'upcoming'
          }
        }
      } else {
        // Fallback to old logic if no real data available
        if (email.step < currentStep) {
          status = 'sent'
        } else if (email.step === currentStep) {
          status = contact.status === 'Completed' || contact.status === 'Replied' ? 'sent' : 'pending'
        } else if (contact.status === 'Completed' || contact.status === 'Replied' || contact.status === 'Unsubscribed') {
          status = 'skipped'
        } else {
          status = 'upcoming'
        }
      }

      // For sent emails, preserve original content (don't update with new sequence settings)
      const finalEmail = { ...email }
      if (status === 'sent') {
        // Use original template without variable replacement for sent emails
        finalEmail.subject = email.originalSubject || `Email ${email.step} (Sent)`
        finalEmail.content = email.originalContent || `[Original email content for step ${email.step} - already sent]`
      }
      
      return {
        ...finalEmail,
        scheduledDate,
        status,
        timezone: contact.timezone || 'UTC',
        sender: assignedSender
      }
    })
  } 
  // Open sequence modal
  const openSequenceModal = (contact: Contact) => {
    setSequenceModalContact(contact)
    // Refresh sequences when modal opens to ensure we have latest data
    if (campaignSequences.length === 0) {
      console.log('🔄 No sequences loaded, fetching...')
      fetchCampaignSequences()
    }
  }

  // Open email content preview modal
  const openEmailPreview = (contact: Contact, step: any) => {
    console.log('🔍 Opening email preview with step:', step)
    console.log('📧 Available campaign sequences:', campaignSequences.length)
    console.log('📝 Step subject:', step.subject)
    console.log('📄 Step content length:', step.content?.length || 0)
    console.log('📄 Step has content:', step.hasContent)
    console.log('📄 Step originalContent length:', step.originalContent?.length || 0)
    console.log('🆔 Sequence metadata:', {
      sequenceId: step.sequenceId,
      sequenceNumber: step.sequenceNumber,
      sequenceStep: step.sequenceStep
    })
    if (step.content) {
      console.log('✅ Content preview:', step.content.substring(0, 200) + '...')
    } else {
      console.log('❌ No content found, showing fallback')
    }
    setEmailPreviewModal({ contact, step })
  }

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery === "" || 
      contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const statusCounts = contacts.reduce((acc, contact) => {
    acc[contact.status] = (acc[contact.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const uniqueStatuses = [...new Set(contacts.map(c => c.status))]

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 hover:bg-white/50 rounded-2xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-light text-gray-900 tracking-tight">
                    {campaign.name}
                  </h1>
                  <Badge variant="outline" className={`${getCampaignStatusBadgeColor(campaign.status)} border rounded-full px-3 py-1`}>
                    {campaign.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/?tab=campaigns-email&campaignId=${campaign.id}`
                    }}
                    className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl px-2 py-1.5"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 font-light">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {contacts.length} contacts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {progressPercentage}% complete
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <select 
                value={`${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}`}
                onChange={(e) => {
                  const [startStr, endStr] = e.target.value.split('_')
                  setDateRange({
                    start: new Date(startStr),
                    end: new Date(endStr)
                  })
                }}
                className="border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2.5 font-medium transition-all duration-300 rounded-2xl border"
              >
                <option value={`${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>Last 7 days</option>
                <option value={`${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>Last 30 days</option>
                <option value={`${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>Last 90 days</option>
              </select>
              
              {campaign.status === "Active" ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleStatusChange()
                    return false
                  }}
                  className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : campaign.status !== "Completed" && (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleStatusChange()
                    return false
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              

            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Emails Sent</h3>
                  <p className="text-gray-500 text-sm">Campaign progress</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                {metricsLoading ? (
                  <div className="text-3xl font-light text-gray-400">...</div>
                ) : (
                  <p className="text-3xl font-light text-gray-900">
                    {hasBeenStarted ? totalSent.toLocaleString() : '—'}
                  </p>
                )}
                <span className="text-sm text-gray-400 font-medium">
                  {hasBeenStarted && totalPlanned > 0 ? `${Math.round((totalSent / totalPlanned) * 100)}%` : 
                   hasBeenStarted ? '0%' : 'Not started'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Open Rate</h3>
                  <p className="text-gray-500 text-sm">Email engagement</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                {metricsLoading ? (
                  <div className="text-3xl font-light text-gray-400">...</div>
                ) : (
                  <p className="text-3xl font-light text-gray-900">
                    {hasBeenStarted ? `${openRate.toFixed(1)}%` : '—'}
                  </p>
                )}
                <span className="text-sm text-gray-400 font-medium">
                  {hasBeenStarted ? (metrics?.uniqueOpens ? `${metrics.uniqueOpens} unique` : 'No data') : 'Not started'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Click Rate</h3>
                  <p className="text-gray-500 text-sm">Link engagement</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                {metricsLoading ? (
                  <div className="text-3xl font-light text-gray-400">...</div>
                ) : (
                  <p className="text-3xl font-light text-gray-900">
                    {hasBeenStarted ? `${clickRate.toFixed(1)}%` : '—'}
                  </p>
                )}
                <span className="text-sm text-gray-400 font-medium">
                  {hasBeenStarted ? (metrics?.uniqueClicks ? `${metrics.uniqueClicks} unique` : 'No data') : 'Not started'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delivery Rate</h3>
                  <p className="text-gray-500 text-sm">Successfully delivered</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                {metricsLoading ? (
                  <div className="text-3xl font-light text-gray-400">...</div>
                ) : (
                  <p className="text-3xl font-light text-gray-900">
                    {hasBeenStarted ? `${deliveryRate.toFixed(1)}%` : '—'}
                  </p>
                )}
                <span className="text-sm text-gray-400 font-medium">
                  {hasBeenStarted ? (metrics?.emailsBounced ? `${metrics.emailsBounced} bounced` : 'No bounces') : 'Not started'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Score and Daily Limit Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Score Section - Enhanced for Warming */}
          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
            {(healthScoresLoading || warmingLoading) ? (
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  {campaign.status === 'Warming' ? (
                    <Flame className="w-6 h-6 text-orange-600 animate-pulse" />
                  ) : (
                    <Heart className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {campaign.status === 'Warming' ? 'Warming Progress' : 'Sender Health'}
                  </h3>
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              </div>
            ) : campaign.status === 'Warming' ? (
              warmingMetrics && warmingMetrics.senders && warmingMetrics.senders.length > 0 ? (
              <>
                {(() => {
                  const senders = warmingMetrics.senders || []
                  const avgPhase = senders.length > 0 ? (senders.reduce((sum: number, s: any) => sum + (s.phase || 0), 0) / senders.length) : 0
                  // Calculate average health score from actual sender health scores if available
                  let avgHealthScore = 0
                  if (Object.keys(senderHealthScores).length > 0) {
                    // Use actual health scores
                    const validScores = senders
                      .map((s: any) => senderHealthScores[s.sender_email]?.score)
                      .filter((score: number | undefined) => score !== undefined)
                    if (validScores.length > 0) {
                      avgHealthScore = Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length)
                    } else {
                      avgHealthScore = warmingMetrics.summary?.averageHealthScore || 0
                    }
                  } else {
                    avgHealthScore = warmingMetrics.summary?.averageHealthScore || 0
                  }
                  
                  const getPhaseColor = (phase: number) => {
                    if (phase >= 3) return 'text-green-600 bg-green-50'
                    if (phase >= 2) return 'text-yellow-600 bg-yellow-50'
                    return 'text-orange-600 bg-orange-50'
                  }
                  
                  const getPhaseStatus = (phase: number) => {
                    if (phase >= 3) return 'Advanced'
                    if (phase >= 2) return 'Growing'
                    return 'Starting'
                  }
                  
                  return (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                          <Flame className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">Warming Progress</h3>
                          <p className="text-gray-500 text-sm">{senders.length} sender{senders.length > 1 ? 's' : ''} warming • {getPhaseStatus(avgPhase)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarmingProgressExpanded(!warmingProgressExpanded)}
                          className="flex items-center space-x-2 px-3 py-2 text-sm"
                        >
                          <span>{warmingProgressExpanded ? 'Minimize' : 'View Details'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${warmingProgressExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>

                      {/* Overall Progress Bar */}
                      {(() => {
                        const totalDays = senders.reduce((sum: number, s: any) => sum + (s.total_warming_days || 0), 0)
                        const avgDays = senders.length > 0 ? totalDays / senders.length : 0
                        const overallProgress = Math.min((avgDays / 35) * 100, 100)
                        
                        return (
                          <div className="mb-6 p-4 bg-white rounded-xl border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Overall Warming Progress</span>
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(avgPhase)}`}>
                                  Phase {avgPhase.toFixed(1)}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-semibold text-gray-900">{overallProgress.toFixed(1)}%</span>
                                <p className="text-xs text-gray-500">{avgDays.toFixed(0)} of 35 days</p>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${overallProgress}%` }}
                              ></div>
                            </div>
                            
                            {/* Phase Milestones */}
                            <div className="flex justify-between text-xs text-gray-500">
                              <span className={avgPhase >= 1 ? 'text-orange-600 font-medium' : ''}>Phase 1</span>
                              <span className={avgPhase >= 2 ? 'text-orange-600 font-medium' : ''}>Phase 2</span>
                              <span className={avgPhase >= 3 ? 'text-orange-600 font-medium' : ''}>Phase 3</span>
                              <span className={overallProgress >= 100 ? 'text-green-600 font-medium' : ''}>Complete</span>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-gray-50">
                            Health: {avgHealthScore}%
                          </div>
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-gray-50">
                            {warmingMetrics.summary?.totalEmailsSentToday || 0} emails today
                          </div>
                        </div>
                      </div>
                      
                      {/* Expandable details */}
                      {warmingProgressExpanded && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {senders.map((sender: any, index: number) => {
                            const phase = sender.phase || 1
                            // Use actual health score from senderHealthScores if available, otherwise use warmup data
                            const actualHealthScore = senderHealthScores[sender.sender_email]?.score
                            const healthScore = actualHealthScore !== undefined ? actualHealthScore : (sender.current_health_score || 0)
                            const dayInPhase = sender.day_in_phase || 1
                            const emailsToday = sender.emails_sent_today || 0
                            const opensToday = sender.opens_today || 0
                            const repliesToday = sender.replies_today || 0
                            const dailyTarget = sender.daily_target || 5
                            
                            return (
                              <div key={sender.sender_email || index} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center ${getPhaseColor(phase)}`}>
                                      <Flame className="w-3 h-3" />
                                    </div>
                                    <div className="flex flex-col">
                                      <p className="text-sm font-medium text-gray-900">{sender.sender_email}</p>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <span>Phase {phase} • Day {dayInPhase}</span>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <span>{healthScore}% health</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(phase)}`}>
                                    Phase {phase}
                                  </div>
                                </div>
                                
                                {/* Today's Activity */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-lg font-medium text-gray-900">{emailsToday}</p>
                                    <p className="text-xs text-gray-500">Emails sent</p>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                      <div 
                                        className="bg-blue-500 h-1.5 rounded-full" 
                                        style={{ width: `${Math.min((emailsToday / dailyTarget) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{dailyTarget} target</p>
                                  </div>
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-lg font-medium text-gray-900">{opensToday}</p>
                                    <p className="text-xs text-gray-500">Opens today</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {emailsToday > 0 ? `${((opensToday / emailsToday) * 100).toFixed(1)}%` : '0%'} rate
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-white rounded-lg border">
                                    <p className="text-lg font-medium text-gray-900">{repliesToday}</p>
                                    <p className="text-xs text-gray-500">Replies today</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {emailsToday > 0 ? `${((repliesToday / emailsToday) * 100).toFixed(1)}%` : '0%'} rate
                                    </p>
                                  </div>
                                </div>

                                {/* Overall Progress */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="p-3 bg-white rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Total Warming Days</span>
                                      <span className="text-sm text-gray-900">{sender.total_warming_days || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-orange-500 h-2 rounded-full" 
                                        style={{ width: `${Math.min(((sender.total_warming_days || 0) / 35) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">35 days target</p>
                                  </div>
                                  <div className="p-3 bg-white rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Health Score</span>
                                      <span className="text-sm text-gray-900">{healthScore}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${healthScore}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{sender.target_health_score || 90}% target</p>
                                  </div>
                                </div>

                                {/* Phase Progress */}
                                <div className="p-3 bg-white rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Phase {phase} Progress</span>
                                    <span className="text-xs text-gray-500">Day {dayInPhase}</span>
                                  </div>
                                  
                                  {/* Phase timeline */}
                                  <div className="flex items-center space-x-2 mb-2">
                                    {[1, 2, 3].map((phaseNum) => (
                                      <div key={phaseNum} className="flex-1">
                                        <div className={`h-2 rounded-full ${
                                          phaseNum < phase ? 'bg-green-500' : 
                                          phaseNum === phase ? 'bg-orange-500' : 'bg-gray-200'
                                        }`}></div>
                                        <p className="text-xs text-center mt-1 text-gray-500">Phase {phaseNum}</p>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500 text-center">
                                    {phase === 1 && "Building initial reputation"}
                                    {phase === 2 && "Increasing volume and engagement"}
                                    {phase === 3 && "Full warming capacity"}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                      <Flame className="w-6 h-6 text-orange-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Warming Progress</h3>
                      <p className="text-sm text-gray-500 font-light">Initializing warming system...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-light text-orange-600">—</p>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">No data yet</p>
                  </div>
                </div>
              )
            ) : Object.keys(senderHealthScores).length > 0 ? (
              <>
                {(() => {
                  // Calculate average score
                  const scores = Object.values(senderHealthScores).map(data => data.score)
                  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                  
                  const getScoreColor = (score: number) => {
                    if (score >= 80) return 'text-green-600 bg-green-50'
                    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
                    return 'text-red-600 bg-red-50'
                  }
                  
                  const getScoreStatus = (score: number) => {
                    if (score >= 80) return 'Excellent'
                    if (score >= 60) return 'Good'
                    return 'Needs Attention'
                  }
                  
                  return (
                    <>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                          <Heart className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Sender Health</h3>
                          <p className="text-gray-500 text-sm">{scores.length} selected sender{scores.length > 1 ? 's' : ''} • {getScoreStatus(avgScore)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getScoreColor(avgScore)}`}>
                            Avg: {avgScore}/100
                          </div>
                          {avgScore < 90 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (campaign.status === 'Warming') {
                                  setShowWarmupStatus(true)
                                } else {
                                  setShowWarmupWarning(true)
                                }
                              }}
                              className="px-2 py-1 text-xs font-medium text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 whitespace-nowrap rounded-full animate-pulse"
                            >
                              Warm Up
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHealthScoresExpanded(!healthScoresExpanded)}
                            className="p-1 h-8 w-8 flex-shrink-0"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${healthScoresExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Expandable details */}
                      {healthScoresExpanded && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {Object.entries(senderHealthScores).map(([emailOrId, healthData]) => {
                            const score = healthData.score
                            const email = emailOrId
                            
                            return (
                              <div key={emailOrId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-6 h-6 rounded flex items-center justify-center ${getScoreColor(score)}`}>
                                    <Mail className="w-3 h-3" />
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="text-sm text-gray-700">{email}</p>
                                    {campaign.status === 'Warming' && (
                                      <div className="flex items-center space-x-1 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-orange-600 font-medium">Warming</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(score)}`}>
                                  {score}/100
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Sender Health</h3>
                  <p className="text-gray-500 text-sm">No senders selected</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Daily Limit Section */}
          <Card className="bg-white border border-gray-100/50 hover:border-gray-200 transition-all duration-300 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              {(() => {
                // Calculate total daily limit based on selected senders
                const selectedSenderCount = Object.keys(senderHealthScores).length
                const dailyLimitPerSender = 50
                const totalDailyLimit = selectedSenderCount * dailyLimitPerSender
                
                return (
                  <>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Daily Limit</h3>
                        <p className="text-gray-500 text-sm">{selectedSenderCount} selected sender{selectedSenderCount > 1 ? 's' : ''} • {dailyLimitPerSender} emails each</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                          {totalDailyLimit} emails/day
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to campaign sender management
                            const url = new URL(window.location.origin)
                            url.searchParams.set('tab', 'campaigns-email')
                            url.searchParams.set('campaignId', campaign.id.toString())
                            url.searchParams.set('subtab', 'sender')
                            window.location.href = url.toString()
                          }}
                          className="flex items-center gap-2 h-8 px-3 text-xs rounded-full"
                        >
                          <Settings className="w-3 h-3" />
                          Manage
                        </Button>
                      </div>
                    </div>
                    
                    {selectedSenderCount > 0 && (
                      <div className="mt-6 p-4 bg-blue-50/50 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-blue-900 font-medium mb-2">Want to increase your daily limit?</p>
                            <p className="text-xs text-blue-700">
                              We recommend 50 emails per account per day for optimal deliverability. 
                              To send more emails, add new domains or sender accounts in the campaign settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedSenderCount === 0 && (
                      <div className="mt-6 text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">No sender accounts selected</p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Navigate to campaign sender management
                            const url = new URL(window.location.origin)
                            url.searchParams.set('tab', 'campaigns-email')
                            url.searchParams.set('campaignId', campaign.id.toString())
                            url.searchParams.set('subtab', 'sender')
                            window.location.href = url.toString()
                          }}
                          className="flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Add Sender Accounts
                        </Button>
                      </div>
                    )}
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>


        {/* Contacts Table */}
        <Card className="bg-white border border-gray-100/50 rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-medium text-gray-900">Contacts</h2>
                <p className="text-gray-500 text-sm mt-1">{contacts.length} total contacts in campaign</p>
              </div>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-gray-50 border-gray-200 rounded-2xl"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 px-4 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all duration-300 rounded-2xl">
                    <Filter className="h-4 w-4 mr-2" />
                    {statusFilter === "all" ? "All Status" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-gray-200">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  {uniqueStatuses.map(status => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedContacts.length > 0 && (
                <Button variant="outline" className="h-10 px-4 border-red-300 hover:bg-red-50 text-red-600 font-medium transition-all duration-300 rounded-2xl">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedContacts.length})
                </Button>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200/60">
                      <th className="text-left p-4">
                        <Checkbox
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts(filteredContacts.map(c => c.id))
                            } else {
                              setSelectedContacts([])
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">Status</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Timezone</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Next Email</th>
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
                          <td className="p-4"><div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div></td>
                          <td className="p-4"><div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-500">
                          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-900 mb-2">No contacts found</p>
                          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.slice(0, 20).map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedContacts([...selectedContacts, contact.id])
                                } else {
                                  setSelectedContacts(selectedContacts.filter(id => id !== contact.id))
                                }
                              }}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                {contact.image_url && (
                                  <AvatarImage src={contact.image_url} alt={`${contact.first_name} ${contact.last_name}`} />
                                )}
                                <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                                  {contact.first_name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                                <p className="text-sm text-gray-500">{contact.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 min-w-[200px]">
                            <Badge variant="outline" className={`${getContactStatusBadgeColor(contact.status)} text-xs border rounded-full px-3 py-1 whitespace-nowrap inline-block`}>
                              {contact.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-500">{contact.location || '-'}</p>
                          </td>
                          <td className="p-4">
                            {(() => {
                              const timezone = contact.timezone || deriveTimezoneFromLocation(contact.location)
                              
                              if (timezone) {
                                const status = getBusinessHoursStatus(timezone)
                                return (
                                  <div className="space-y-1">
                                    {/* Primary Timezone */}
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 text-xs">
                                        {timezone}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {status.currentTime}
                                      </span>
                                    </div>
                                    
                                    {/* Business Hours Status */}
                                    <div className="flex items-center gap-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        status.isBusinessHours ? 'bg-green-500' : 'bg-red-500'
                                      }`}></div>
                                      <span className={`text-xs ${
                                        status.isBusinessHours ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {status.text}
                                      </span>
                                    </div>
                                    
                                    {/* Show if timezone was derived */}
                                    {!contact.timezone && (
                                      <div className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        🌍 Derived from location
                                      </div>
                                    )}
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="space-y-1">
                                    <span className="text-xs text-gray-500">No timezone</span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                      <span className="text-xs text-gray-500">Using UTC default</span>
                                    </div>
                                  </div>
                                )
                              }
                            })()}
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              {/* Current Status Summary */}
                              {contact.sequence_step !== undefined && contact.sequence_step > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      contact.status === 'Completed' ? 'bg-green-500' :
                                      contact.status === 'Replied' ? 'bg-blue-500' :
                                      contact.status.startsWith('Email') ? 'bg-blue-500' :
                                      'bg-gray-500'
                                    }`}></div>
                                    <span className="font-medium text-xs">
                                      Step {contact.sequence_step}/{campaignSequences.length || 0}
                                    </span>
                                  </div>
                                  {contact.nextEmailIn && contact.nextEmailIn !== "Sequence complete" && (
                                    <div className="text-xs text-blue-600">
                                      Next: {contact.nextEmailIn}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                  <span className="text-xs text-yellow-600">Pending Start</span>
                                </div>
                              )}
                              
                              {/* View Sequence Button - Hide when campaign is paused or warming */}
                              {campaign.status !== 'Paused' && campaign.status !== 'Warming' && contact.email_status !== 'Paused' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-3 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                  onClick={() => openSequenceModal(contact)}
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  View Sequence
                                </Button>
                              )}
                            </div>
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
                                  <DropdownMenuItem onClick={() => setContactDetailsModal(contact)}>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => console.log('Remove:', contact.id)} className="text-red-600">
                                    Remove
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
              
              {!loading && filteredContacts.length > 20 && (
                <div className="p-6 border-t border-gray-200/60 text-center bg-gray-50">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2.5 font-medium transition-all duration-300 rounded-2xl">
                    Load More ({filteredContacts.length - 20} remaining)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-100/50 rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-gray-900">Campaign Progress</h2>
                  <p className="text-gray-500 text-sm mt-1">Email delivery status</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="font-semibold text-gray-900">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3 bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 bg-gray-50 rounded-2xl">
                    <p className="text-2xl font-light text-gray-900">
                      {hasBeenStarted ? totalSent : '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {hasBeenStarted ? 'Sent' : 'Not started'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-2xl">
                    <p className="text-2xl font-light text-gray-900">
                      {hasBeenStarted && totalPlanned > 0 ? (totalPlanned - totalSent) : 
                       hasBeenStarted ? '0' : '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {hasBeenStarted ? 'Remaining' : 'No contacts'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-100/50 rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-gray-900">Status Distribution</h2>
                  <p className="text-gray-500 text-sm mt-1">Contact sequence status</p>
                </div>
              </div>
              <div className="space-y-4">
                {uniqueStatuses.slice(0, 5).map(status => {
                  const count = statusCounts[status] || 0
                  const percentage = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">{status}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sequence Timeline Modal */}
      <Dialog open={sequenceModalContact !== null} onOpenChange={(open) => !open && setSequenceModalContact(null)}>
        <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] overflow-hidden bg-white flex flex-col">
          <DialogHeader className="pb-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Calendar className="w-5 h-5 text-gray-600" />
                Email Sequence Timeline
              </DialogTitle>
            </div>
          </DialogHeader>
          
          {sequenceModalContact && (
            <div className="space-y-8 overflow-y-auto pr-2 pb-4 flex-1 mt-6">
              {/* Contact Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {sequenceModalContact.image_url ? (
                        <AvatarImage src={sequenceModalContact.image_url} />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-gray-600 font-medium">
                          {sequenceModalContact.first_name?.[0]}{sequenceModalContact.last_name?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {sequenceModalContact.first_name} {sequenceModalContact.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{sequenceModalContact.email}</p>
                      {(() => {
                        const schedule = generateContactSchedule(sequenceModalContact)
                        const sender = schedule[0]?.sender
                        return sender && sender !== 'No sender assigned' ? (
                          <p className="text-xs text-blue-600 mt-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            Sender: {sender}
                          </p>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Progress</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {(() => {
                        const schedule = generateContactSchedule(sequenceModalContact)
                        const completedSteps = schedule.filter(step => step.status === 'sent').length
                        const currentStep = completedSteps + 1 // Next step to be sent
                        return `Step ${currentStep} of ${schedule.length}`
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Updated Info */}
              <div className="text-xs text-gray-500 text-center py-2 border-t border-gray-100">
                Sequences last updated: {new Date(sequencesLastUpdated).toLocaleTimeString()}
                {sequencesRefreshing && <span className="ml-2 text-blue-600">• Refreshing...</span>}
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200"></div>
                
                <div className="space-y-6">
                  {generateContactSchedule(sequenceModalContact).map((step, index) => {
                    const isNext = step.status === 'pending' && !generateContactSchedule(sequenceModalContact).slice(0, index).some(s => s.status === 'pending')
                    
                    return (
                      <div key={`timeline-${step.step}-${index}`} className="relative flex items-start gap-4">
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full border-2 bg-white flex items-center justify-center ${
                          step.status === 'sent' 
                            ? 'border-green-500 bg-green-50' :
                          step.status === 'pending' 
                            ? 'border-gray-900 bg-gray-50' :
                          step.status === 'skipped' 
                            ? 'border-gray-300 bg-white' :
                          'border-gray-300 bg-white'
                        }`}>
                          {step.status === 'sent' ? (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-sm font-semibold text-gray-600">{step.step}</span>
                          )}
                        </div>
                        
                        {/* Step content */}
                        <div className={`flex-1 min-w-0 p-4 rounded-lg border ${
                          step.status === 'sent' 
                            ? 'bg-white border-gray-200' :
                          step.status === 'pending' && isNext 
                            ? 'bg-gray-50 border-gray-900' :
                          step.status === 'skipped' 
                            ? 'bg-white border-gray-200 opacity-60' :
                          'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{step.subject}</h4>
                              <p className="text-sm text-gray-500">Step {step.step} of {campaignSequences.length}</p>
                            </div>
                            
                            {/* Status badges */}
                            <div>
                              {step.status === 'sent' && (
                                <span className="text-sm font-medium text-green-600">Sent</span>
                              )}
                              {step.status === 'pending' && isNext && (
                                <span className="text-sm font-medium text-gray-900">Up Next</span>
                              )}
                              {step.status === 'skipped' && (
                                <span className="text-sm font-medium text-gray-400">Skipped</span>
                              )}
                              {step.status === 'upcoming' && (
                                <span className="text-sm font-medium text-gray-500">Upcoming</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Scheduled time and Sender */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {step.scheduledDate.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {step.scheduledDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })} {step.timezone && `(${step.timezone})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span className="font-medium">
                                {step.sender}
                              </span>
                            </div>
                          </div>

                          {/* Email Content Preview Button */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-0"
                              onClick={() => openEmailPreview(sequenceModalContact, step)}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              Preview Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">
                      {generateContactSchedule(sequenceModalContact).filter(s => s.status === 'sent').length}
                    </div>
                    <div className="text-sm text-gray-500">Sent</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">
                      {generateContactSchedule(sequenceModalContact).filter(s => s.status === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-500">Pending</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">
                      {generateContactSchedule(sequenceModalContact).filter(s => s.status === 'upcoming').length}
                    </div>
                    <div className="text-sm text-gray-500">Upcoming</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Content Preview Modal */}
      <Dialog open={emailPreviewModal !== null} onOpenChange={(open) => !open && setEmailPreviewModal(null)}>
        <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 flex-shrink-0 border-b border-gray-200/60">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Preview - Step {emailPreviewModal?.step?.step}
            </DialogTitle>
          </DialogHeader>
          
          {emailPreviewModal && (
            <div className="space-y-6 overflow-y-auto pr-2 pb-4 flex-1 mt-4">
              {/* Contact & Campaign Info */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {emailPreviewModal.contact.image_url ? (
                      <AvatarImage src={emailPreviewModal.contact.image_url} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                        {emailPreviewModal.contact.first_name?.[0]}{emailPreviewModal.contact.last_name?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {emailPreviewModal.contact.first_name} {emailPreviewModal.contact.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{emailPreviewModal.contact.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{emailPreviewModal.contact.title}</div>
                  <div className="text-sm text-gray-600">{emailPreviewModal.contact.company}</div>
                </div>
              </div>

              {/* Email Preview Card */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[calc(90vh-200px)]">
                {/* Email Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">From: [Your Email]</div>
                        <div className="text-sm text-gray-600">To: {emailPreviewModal.contact.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        emailPreviewModal.step.status === 'sent' ? 'bg-green-100 text-green-700 border-green-200' :
                        emailPreviewModal.step.status === 'pending' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        emailPreviewModal.step.status === 'skipped' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {emailPreviewModal.step.status === 'sent' ? '✓ Sent' :
                         emailPreviewModal.step.status === 'pending' ? '🔄 Pending' :
                         emailPreviewModal.step.status === 'skipped' ? '⏭️ Skipped' :
                         '⏳ Upcoming'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Subject Line */}
                <div className="px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {emailPreviewModal.step.subject}
                  </div>
                </div>

                {/* Email Content - Scrollable */}
                <div className="px-6 py-6 bg-white overflow-y-auto flex-1">
                  <div className="prose prose-sm max-w-none">
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {emailPreviewModal.step.content}
                    </div>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>📅 Scheduled: {emailPreviewModal.step.scheduledDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}</span>
                      <span>🌍 {emailPreviewModal.step.timezone}</span>
                    </div>
                    <span>Step {emailPreviewModal.step.step} of {campaignSequences.length}</span>
                  </div>
                </div>
              </div>

              {/* Personalization Info */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Smart Personalization</h4>
                    <p className="text-sm text-green-700 leading-relaxed">
                      This email is automatically personalized with <strong>{emailPreviewModal.contact.first_name}'s</strong> details including their name, company (<strong>{emailPreviewModal.contact.company}</strong>), and role (<strong>{emailPreviewModal.contact.title}</strong>). The content adapts to create a natural, personalized conversation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Sending in {emailPreviewModal.step.timezone || 'UTC'} timezone</span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setEmailPreviewModal(null)}
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Details Modal */}
      <Dialog open={contactDetailsModal !== null} onOpenChange={(open) => !open && setContactDetailsModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <User className="w-5 h-5 text-gray-600" />
              Contact Details
            </DialogTitle>
          </DialogHeader>
          
          {contactDetailsModal && (
            <div className="space-y-6 py-4">
              {/* Contact Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {contactDetailsModal.image_url ? (
                      <AvatarImage src={contactDetailsModal.image_url} />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600 font-medium text-lg">
                        {contactDetailsModal.first_name?.[0]}{contactDetailsModal.last_name?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {contactDetailsModal.first_name} {contactDetailsModal.last_name}
                    </h3>
                    <p className="text-gray-600">{contactDetailsModal.email}</p>
                    {contactDetailsModal.phone && (
                      <p className="text-sm text-gray-500 mt-1">{contactDetailsModal.phone}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`${getContactStatusBadgeColor(contactDetailsModal.status)} text-xs border rounded-full px-3 py-1`}>
                  {contactDetailsModal.status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Company</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.company || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Title</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.title || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.location || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Timezone</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.timezone || deriveTimezoneFromLocation(contactDetailsModal.location) || 'UTC'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sequence Step</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.sequence_step || 0} of 6</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sender</p>
                  <p className="font-medium text-gray-900">{contactDetailsModal.sender_email || '-'}</p>
                </div>
              </div>

              {/* LinkedIn Link */}
              {contactDetailsModal.linkedin && (
                <div className="pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => window.open(contactDetailsModal.linkedin, '_blank')}
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    View LinkedIn Profile
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {/* Hide View Sequence button when campaign is paused or warming */}
                {campaign.status !== 'Paused' && campaign.status !== 'Warming' && contactDetailsModal.email_status !== 'Paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setContactDetailsModal(null)
                      openSequenceModal(contactDetailsModal)
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Sequence
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-gray-600"
                  onClick={() => setContactDetailsModal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warmup Warning Dialog */}
      <Dialog open={showWarmupWarning} onOpenChange={setShowWarmupWarning}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border border-gray-200 p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Health Score Alert
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Some senders still need warming up
                </DialogDescription>
              </div>
            </div>
          </div>
          
          <div className="px-6 pb-4">
            <div className="bg-orange-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-orange-900 mb-3">Accounts Below 90% Health</p>
              <div className="space-y-2">
                {lowHealthSenders.map((sender, index) => {
                  const getScoreColor = (score: number) => {
                    if (score >= 80) return 'text-green-700 bg-green-100'
                    if (score >= 60) return 'text-yellow-700 bg-yellow-100'
                    return 'text-red-700 bg-red-100'
                  }
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2">{sender.email}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(sender.score)}`}>
                        {sender.score}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
              <p className="mb-2"><span className="font-medium">Continue Warmup:</span> Keep warming to improve health scores before going active.</p>
              <p>
                <span className="font-medium">
                  {pendingResumeStatus === "Completed" ? "Stop Anyway:" : "Resume Anyway:"}
                </span>{" "}
                {pendingResumeStatus === "Completed" 
                  ? "Stop the campaign now despite health scores." 
                  : "Go active now despite low health scores."
                }
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 p-6 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleWarmupDecision(false)
              }}
              disabled={warmupDecisionLoading}
              className="flex-1 h-10 rounded-xl"
            >
              {warmupDecisionLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                pendingResumeStatus === "Completed" ? "Stop Anyway" : "Resume Anyway"
              )}
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleWarmupDecision(true)
              }}
              disabled={warmupDecisionLoading}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {warmupDecisionLoading ? (
                <>
                  <div className="w-4 h-4 mr-1.5 border-2 border-white border-t-orange-200 rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-1.5" />
                  Continue Warmup
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warmup Status Dialog */}
      <Dialog open={showWarmupStatus} onOpenChange={setShowWarmupStatus}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border border-gray-100 p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Warmup in Progress
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Your campaign is currently warming up
                </DialogDescription>
              </div>
            </div>
          </div>
          
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-orange-900">Warming Status</span>
              </div>
              <p className="text-sm text-orange-800">
                Campaign is actively warming up to improve sender health scores. This helps establish sender reputation and improves deliverability.
              </p>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-3 mb-3">
              <p className="text-xs font-medium text-amber-900 mb-2">Current Health Scores</p>
              <div className="space-y-1.5">
                {Object.entries(senderHealthScores).map(([email, healthData]) => {
                  const getScoreColor = (score: number) => {
                    if (score >= 90) return 'text-green-700 bg-green-100'
                    if (score >= 80) return 'text-yellow-700 bg-yellow-100'
                    return 'text-orange-700 bg-orange-100'
                  }
                  
                  return (
                    <div key={email} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2">{email}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getScoreColor(healthData.score)}`}>
                        {healthData.score}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
              <p><span className="font-semibold">Warmup Progress:</span> Gradually increasing send volume to build sender reputation.</p>
              <p className="mt-1"><span className="font-semibold">Timeline:</span> Typically takes 2-4 weeks to reach optimal health scores.</p>
            </div>
          </div>
          
          <div className="flex gap-2 p-6 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setShowWarmupStatus(false)}
              className="flex-1 h-10 rounded-xl text-sm"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowWarmupStatus(false)
                setShowWarmupWarning(true)
              }}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Warmup Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}