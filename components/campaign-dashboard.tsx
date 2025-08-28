"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDebouncedAutoSave } from "@/hooks/useDebounce"
import { useOptimizedPolling } from "@/hooks/useOptimizedPolling"

import { Calendar, ChevronDown, Eye, Play, Pause, MoreHorizontal, Plus, Zap, Search, Download, Upload, Mail, Phone, ChevronLeft, ChevronRight, Send, Trash2, Edit2, Check, X, Settings, Users, FileText, Filter, Building2, User, Target, Database, Linkedin, MapPin, Tag, UserCheck, Users2, UserCog, AlertTriangle, AlertCircle, Clock, Cog, CheckCircle, XCircle, Bold, Italic, Underline, Type, Link, Image, Smile, Code, ExternalLink, Archive, Reply, Forward, Rocket, Square, TrendingUp, Shield, ArrowUp, Brain, ShieldCheck, CheckCircle2, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import AddCampaignPopup from "./add-campaign-popup"
import { format } from "date-fns"
import AutomationSettings from "@/components/automation-settings"
import CampaignSenderSelection from "./campaign-sender-selection"
import { TargetTab } from "./campaign-dashboard-target"
import { DomainSetupModal } from "@/components/domain-setup-modal"
import { toast } from "sonner"
import { useI18n } from "@/hooks/use-i18n"

interface CampaignDashboardProps {
  campaign?: {
    id: number
    name: string
    type?: "Sequence" | "SMS"
    status: "Draft" | "Active" | "Paused" | "Completed"
  }
  onBack?: () => void
  onDelete?: (campaignId: number) => void
  onStatusUpdate?: (campaignId: number, newStatus: "Draft" | "Active" | "Paused" | "Completed") => void
  onNameUpdate?: (campaignId: number, newName: string) => void
  initialTab?: string
}

export default function CampaignDashboard({ campaign, onBack, onDelete, onStatusUpdate, onNameUpdate, initialTab = "target" }: CampaignDashboardProps) {
  const { t, ready: translationsReady } = useI18n()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)
  
  // Campaign name editing state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(campaign?.name || "")

  // Update editedName when campaign prop changes
  useEffect(() => {
    if (campaign?.name && !isEditingName) {
      setEditedName(campaign.name)
    }
  }, [campaign?.name, isEditingName])

  // Initialize guided flow for draft campaigns
  useEffect(() => {
    if (campaign?.status === 'Draft') {
      setIsGuidedFlow(true)
      
      // Check if we have saved state to restore
      const savedTab = campaign?.id ? localStorage.getItem(`campaign-${campaign.id}-last-tab`) : null
      const savedStep = campaign?.id ? localStorage.getItem(`campaign-${campaign.id}-guided-step`) : null
      
      if (savedTab && savedStep) {
        // Restore from saved state
        const stepIndex = parseInt(savedStep)
        if (stepIndex >= 0 && stepIndex < guidedFlowSteps.length) {
          setGuidedFlowStep(stepIndex)
          setActiveTab(savedTab)
        } else {
          // Fallback to current tab logic
          const currentStepIndex = guidedFlowSteps.findIndex(step => step.tab === activeTab)
          setGuidedFlowStep(currentStepIndex >= 0 ? currentStepIndex : 0)
          if (currentStepIndex < 0) {
            setActiveTab('target')
          }
        }
      } else {
        // Set the initial tab based on the current active tab or start from target
        const currentStepIndex = guidedFlowSteps.findIndex(step => step.tab === activeTab)
        setGuidedFlowStep(currentStepIndex >= 0 ? currentStepIndex : 0)
        // If we're starting fresh, go to the target tab
        if (currentStepIndex < 0) {
          setActiveTab('target')
        }
      }
    } else {
      setIsGuidedFlow(false)
      // Clear saved state when campaign is no longer draft
      if (campaign?.id) {
        localStorage.removeItem(`campaign-${campaign.id}-last-tab`)
        localStorage.removeItem(`campaign-${campaign.id}-guided-step`)
      }
    }
  }, [campaign?.status, activeTab])
  
  // Load sequences when component mounts or campaign changes
  useEffect(() => {
    if (campaign?.id) {
      console.log('🔄 Component mounted, loading sequences for campaign:', campaign.id)
      loadSequences()
      // Also validate requirements when component mounts
      validateCampaignRequirements()
    }
  }, [campaign?.id])
  
  // Validation functions
  const validateCampaignRequirements = async () => {
    if (!campaign?.id) return { hasContacts: false, hasAutoScraping: false, hasDomains: false }
    
    setValidationLoading(true)
    
    try {
      // Check if campaign has contacts or auto-scraping is active
      const contactsResponse = await fetch(`/api/contacts?campaign_id=${campaign.id}&limit=1`, {
        credentials: 'include'
      })
      const contactsResult = await contactsResponse.json()
      console.log('🔍 Validation check for campaign', campaign.id, ':', contactsResult)
      const hasContactsImported = contactsResult.contacts && contactsResult.contacts.length > 0
      console.log('📊 hasContactsImported:', hasContactsImported)
      
      // Check if auto-scraping is configured and active
      const campaignResponse = await fetch(`/api/campaigns/${campaign.id}/save`, {
        credentials: 'include'
      })
      const campaignResult = await campaignResponse.json()
      const hasActiveScraping = campaignResult.success && 
        campaignResult.data?.campaign?.scrapping_status === 'Active'
      
      // Check if domains are set up
      const domainsResponse = await fetch('/api/domains', {
        credentials: 'include'
      })
      const domainsResult = await domainsResponse.json()
      const hasDomainsSetup = domainsResult.success && 
        domainsResult.data && domainsResult.data.length > 0
      
      // Update state
      setHasContacts(hasContactsImported)
      setHasAutoScraping(hasActiveScraping)
      setHasDomains(hasDomainsSetup)
      
      console.log('📋 Validation results:', {
        hasContacts: hasContactsImported,
        hasAutoScraping: hasActiveScraping,
        hasDomains: hasDomainsSetup
      })
      
      // Return fresh values for immediate use
      return {
        hasContacts: hasContactsImported,
        hasAutoScraping: hasActiveScraping,
        hasDomains: hasDomainsSetup
      }
      
    } catch (error) {
      console.error('❌ Error validating requirements:', error)
      return { hasContacts: false, hasAutoScraping: false, hasDomains: false }
    } finally {
      setValidationLoading(false)
    }
  }
  
  const checkProgressionRequirements = (currentStep: number, nextStep?: number): { canProceed: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Target tab requirements (step 0) - need contacts or auto-scraping to proceed to sequence
    if (currentStep === 0) {
      if (!hasContacts && !hasAutoScraping) {
        errors.push(t('campaignManagement.validation.importOrScraping'))
      }
    }
    
    // Sender tab requirements (step 2) - need sender accounts which require domains
    if (currentStep === 2) {
      if (!selectedSenderAccounts || selectedSenderAccounts.length === 0) {
        if (!hasDomains) {
          errors.push('You must set up at least one domain before proceeding')
        } else {
          errors.push('You must select at least one sender account before proceeding')
        }
      }
    }
    
    return {
      canProceed: errors.length === 0,
      errors
    }
  }

  const checkProgressionRequirementsWithFreshData = (currentStep: number, nextStep?: number, freshValidation?: any): { canProceed: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Use fresh validation data if provided, otherwise fall back to state
    const currentHasContacts = freshValidation?.hasContacts ?? hasContacts
    const currentHasAutoScraping = freshValidation?.hasAutoScraping ?? hasAutoScraping
    const currentHasDomains = freshValidation?.hasDomains ?? hasDomains
    
    // Target tab requirements (step 0) - need contacts or auto-scraping to proceed to sequence
    if (currentStep === 0) {
      if (!currentHasContacts && !currentHasAutoScraping) {
        errors.push(t('campaignManagement.validation.importOrScraping'))
      }
    }
    
    // Sender tab requirements (step 2) - need sender accounts which require domains
    if (currentStep === 2) {
      if (!selectedSenderAccounts || selectedSenderAccounts.length === 0) {
        if (!currentHasDomains) {
          errors.push('You must set up at least one domain before proceeding')
        } else {
          errors.push('You must select at least one sender account before proceeding')
        }
      }
    }
    
    return {
      canProceed: errors.length === 0,
      errors
    }
  }
  
  // Track if settings have been saved
  const [hasSettingsSaved, setHasSettingsSaved] = useState(false)
  const [hasSequenceSaved, setHasSequenceSaved] = useState(false)
  const [isSavingSequences, setIsSavingSequences] = useState(false)
  
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'sequence' | 'step'
    item: { id: number; name?: string } | null
    onConfirm: (() => void) | null
  }>({
    isOpen: false,
    type: 'sequence',
    item: null,
    onConfirm: null
  })
  
  // Sequences state - Start empty and load from database
  const [steps, setSteps] = useState([])
  const [activeStepId, setActiveStepId] = useState(1)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showCodeView, setShowCodeView] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false)

  // Guided flow state for draft campaigns
  const [isGuidedFlow, setIsGuidedFlow] = useState(false)
  const [guidedFlowStep, setGuidedFlowStep] = useState(0)
  const [showSequenceConfirmDialog, setShowSequenceConfirmDialog] = useState(false)
  const [pendingNextStep, setPendingNextStep] = useState<number | null>(null)
  
  // Validation state for progression requirements
  const [hasContacts, setHasContacts] = useState(false)
  const [hasAutoScraping, setHasAutoScraping] = useState(false)
  const [hasDomains, setHasDomains] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Domain setup modal state (managed at parent level to prevent re-initialization)
  const [showDomainSetupModal, setShowDomainSetupModal] = useState(false)
  const [showDomainInstructions, setShowDomainInstructions] = useState(false)
  const [pendingDomainData, setPendingDomainData] = useState<any>(null)
  const [showSenderManagement, setShowSenderManagement] = useState(false)
  const [selectedDomainForSenders, setSelectedDomainForSenders] = useState<string>('')
  
  // Deliverability popup state
  const [showDeliverabilityDialog, setShowDeliverabilityDialog] = useState(false)
  const [lowDeliverabilityAccounts, setLowDeliverabilityAccounts] = useState<any[]>([])
  
  // Sender validation popup states
  const [showNoAccountSelectedDialog, setShowNoAccountSelectedDialog] = useState(false)
  const [showWarmupInfoDialog, setShowWarmupInfoDialog] = useState(false)
  
  // Define the guided flow steps
  const guidedFlowSteps = [
    { tab: 'target', title: t('campaignManagement.guidedFlow.steps.addTargetAudience'), description: t('campaignManagement.guidedFlow.descriptions.importContacts') },
    { tab: 'sequence', title: t('campaignManagement.guidedFlow.steps.createEmailSequences'), description: t('campaignManagement.guidedFlow.descriptions.designMessages') },
    { tab: 'sender', title: t('campaignManagement.guidedFlow.steps.selectSenderAccounts'), description: t('campaignManagement.guidedFlow.descriptions.chooseEmailAccounts') },
    { tab: 'settings', title: t('campaignManagement.guidedFlow.steps.configureSettings'), description: t('campaignManagement.guidedFlow.descriptions.setSendingSchedule') }
  ]
  const editorRef = useRef<HTMLDivElement>(null)
  const [testModalAccountId, setTestModalAccountId] = useState(null)
  const [testModalLoading, setTestModalLoading] = useState(false)

  // Guided flow navigation functions
  const handleGuidedNext = async () => {
    // Refresh validation before proceeding and get fresh values
    const freshValidation = await validateCampaignRequirements()
    
    // Calculate the next step
    const nextStep = guidedFlowStep < guidedFlowSteps.length - 1 ? guidedFlowStep + 1 : guidedFlowStep
    
    // If we're on the sequence tab, show confirmation dialog FIRST (before validation)
    if (guidedFlowSteps[guidedFlowStep]?.tab === 'sequence' && guidedFlowStep < guidedFlowSteps.length - 1) {
      setPendingNextStep(nextStep)
      setShowSequenceConfirmDialog(true)
      return
    }
    
    // For non-sequence tabs, check progression requirements using fresh validation data
    const validation = checkProgressionRequirementsWithFreshData(guidedFlowStep, nextStep, freshValidation)
    
    if (!validation.canProceed) {
      setValidationErrors(validation.errors)
      setShowValidationDialog(true)
      return
    }
    
    // Proceed normally for non-sequence tabs
    if (guidedFlowStep < guidedFlowSteps.length - 1) {
      setGuidedFlowStep(nextStep)
      setActiveTab(guidedFlowSteps[nextStep].tab)
      
      // Save the current progress to localStorage for state persistence
      if (campaign?.id) {
        localStorage.setItem(`campaign-${campaign.id}-last-tab`, guidedFlowSteps[nextStep].tab)
        localStorage.setItem(`campaign-${campaign.id}-guided-step`, nextStep.toString())
      }
    }
  }

  const handleGuidedPrevious = () => {
    if (guidedFlowStep > 0) {
      const prevStep = guidedFlowStep - 1
      setGuidedFlowStep(prevStep)
      setActiveTab(guidedFlowSteps[prevStep].tab)
      
      // Save the current progress to localStorage for state persistence
      if (campaign?.id) {
        localStorage.setItem(`campaign-${campaign.id}-last-tab`, guidedFlowSteps[prevStep].tab)
        localStorage.setItem(`campaign-${campaign.id}-guided-step`, prevStep.toString())
      }
    }
  }

  const handleLaunchCampaign = async () => {
    try {
      // Check sender health scores before launching
      if (campaign?.id) {
        setWarmupCheckLoading(true)
        
        // Get campaign senders
        const sendersResponse = await fetch(`/api/campaigns/${campaign.id}/senders`, {
          credentials: "include"
        })
        
        if (sendersResponse.ok) {
          const sendersResult = await sendersResponse.json()
          const senderAssignments = sendersResult.assignments || []
          
          if (senderAssignments.length > 0) {
            // Get sender emails (even though they're actually IDs, the API expects emails parameter)
            const senderEmails = senderAssignments.map((assignment: any) => assignment.email).filter(Boolean)
            
            if (senderEmails.length > 0) {
              // Fetch health scores
              const healthResponse = await fetch(`/api/sender-accounts/health-score?emails=${senderEmails.join(',')}&campaignId=${campaign.id}`, {
                credentials: "include"
              })
              
              if (healthResponse.ok) {
                const healthResult = await healthResponse.json()
                const healthScores = healthResult.healthScores || {}
                
                // Build account ID to email mapping from the health response
                const accountEmailMap: Record<string, string> = {}
                if (healthResult.accounts) {
                  healthResult.accounts.forEach((account: any) => {
                    accountEmailMap[account.id] = account.email
                  })
                }
                
                // Check for low health scores (below 90%)
                const lowScoreSenders: Array<{email: string, score: number}> = []
                Object.entries(healthScores).forEach(([accountId, data]: [string, any]) => {
                  if (data.score < 90) {
                    const email = accountEmailMap[accountId] || accountId
                    lowScoreSenders.push({ email, score: data.score })
                  }
                })
                
                setWarmupCheckLoading(false)
                
                if (lowScoreSenders.length > 0) {
                  // Show warmup warning popup
                  setLowHealthSenders(lowScoreSenders)
                  setShowWarmupWarning(true)
                  return // Don't launch yet
                }
              }
            }
          }
        }
        
        setWarmupCheckLoading(false)
        
        // If all health scores are good, launch the campaign
        if (onStatusUpdate) {
          console.log('🚀 Launching campaign:', campaign.id)
          onStatusUpdate(campaign.id, 'Active')
          setIsGuidedFlow(false)
          
          // Status update completed - no automatic redirect needed
          console.log('✅ Campaign launched successfully')
        }
      } else {
        console.error('❌ Cannot launch campaign - missing campaign ID')
      }
      
    } catch (error) {
      console.error('Error launching campaign:', error)
      setWarmupCheckLoading(false)
    }
  }
  const handleWarmupDecision = async (warmupChoice: string) => {
    setShowWarmupWarning(false)
    
    if (campaign?.id && onStatusUpdate) {
      switch (warmupChoice) {
        case 'auto_warmup':
          // Start sending gradually with automatic warmup
          console.log('🔥 Starting auto warmup for campaign:', campaign.id)
          onStatusUpdate(campaign.id, 'Active')
          setIsGuidedFlow(false)
          console.log('✅ Auto warmup campaign started successfully')
          break
          
        case 'warmup_only':
          // Warm up accounts without sending campaign emails
          console.log('🔥 Starting warmup only for campaign:', campaign.id)
          onStatusUpdate(campaign.id, 'Warming')
          setIsGuidedFlow(false)
          console.log('✅ Warmup only started successfully')
          break
          
        case 'no_warmup':
          // Start sending immediately
          console.log('⚠️ Launching campaign immediately without warmup')
          onStatusUpdate(campaign.id, 'Active')
          setIsGuidedFlow(false)
          console.log('✅ Campaign launched immediately without warmup')
          break
          
        default:
          console.error('❌ Unknown warmup choice:', warmupChoice)
      }
    }
  }

  const [testModalEmail, setTestModalEmail] = useState("")
  const [testEmail, setTestEmail] = useState("contact@leadsupbase.com")
  const [testPhone, setTestPhone] = useState("+1 (555) 123-4567")
  const [variables, setVariables] = useState({
    companyName: "The Bearded Bakers",
    firstName: "Joey",
    randomGreeting: "Hi",
    randomQuestion: "Want me to send it over?",
  })
  
  // Import contacts state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importType, setImportType] = useState('leads') // 'leads', 'csv', 'manual'
  const [selectedLeads, setSelectedLeads] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [manualContact, setManualContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  })
  const [importLoading, setImportLoading] = useState(false)

  // Warmup warning state
  const [showWarmupWarning, setShowWarmupWarning] = useState(false)
  const [lowHealthSenders, setLowHealthSenders] = useState<Array<{email: string, score: number}>>([])
  const [warmupCheckLoading, setWarmupCheckLoading] = useState(false)

  // Target tab dummy state for backwards compatibility
  const targetStatus = 'idle'
  const targetProgress = { totalContacts: 0 }

  // Gmail OAuth state
  const [gmailAuthLoading, setGmailAuthLoading] = useState(false)
  const [connectedEmailAccounts, setConnectedEmailAccounts] = useState([])
  const [selectedEmailAccount, setSelectedEmailAccount] = useState(null)
  const [connectedGmailAccounts, setConnectedGmailAccounts] = useState([])

  // Microsoft 365 OAuth state
  const [microsoft365AuthLoading, setMicrosoft365AuthLoading] = useState(false)
  const [connectedMicrosoft365Accounts, setConnectedMicrosoft365Accounts] = useState([])
  const [selectedMicrosoft365Account, setSelectedMicrosoft365Account] = useState(null)

  // SMTP/IMAP state
  const [showSmtpModal, setShowSmtpModal] = useState(false)
  const [smtpFormData, setSmtpFormData] = useState({
    name: '',
    email: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPassword: ''
  })
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [showConnectDropdown, setShowConnectDropdown] = useState(false)
  const [showGmailAppPasswordModal, setShowGmailAppPasswordModal] = useState(false)
  const [connectedSmtpAccounts, setConnectedSmtpAccounts] = useState([])
  const [selectedSmtpAccount, setSelectedSmtpAccount] = useState(null)
  
  // Bulk email import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [bulkEmailCsvFile, setBulkEmailCsvFile] = useState<File | null>(null)
  const [bulkImportLoading, setBulkImportLoading] = useState(false)
  const [bulkImportPreview, setBulkImportPreview] = useState([])
  
  // Campaign settings state
  const [dailyContactsLimit, setDailyContactsLimit] = useState(35)
  const [dailySequenceLimit, setDailySequenceLimit] = useState(100)
  const [activeDays, setActiveDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [sendingStartTime, setSendingStartTime] = useState('08:00 AM')
  const [sendingEndTime, setSendingEndTime] = useState('05:00 PM')
  const [selectedSenderAccounts, setSelectedSenderAccounts] = useState([])
  
  // Loading states
  const [isLoadingCampaignData, setIsLoadingCampaignData] = useState(true)
  const [campaignDataLoaded, setCampaignDataLoaded] = useState(false)
  
  // Email signature state
  const [firstName, setFirstName] = useState("Loop")
  const [lastName, setLastName] = useState("Review")
  const [companyName, setCompanyName] = useState("LeadsUp")
  const [companyWebsite, setCompanyWebsite] = useState("https://www.leadsup.com")
  const [emailSignature, setEmailSignature] = useState(`<br/><br/>Best regards,<br/><strong>${firstName} ${lastName}</strong><br/>${companyName}<br/><a href="${companyWebsite}" target="_blank">${companyWebsite}</a>`)
  const signatureEditorRef = useRef<HTMLDivElement>(null)
  
  // Daily limit warning state
  const [showDailyLimitWarning, setShowDailyLimitWarning] = useState(false)
  const [warningAccountId, setWarningAccountId] = useState(null)
  const [pendingDailyLimit, setPendingDailyLimit] = useState(50)
  
  // Gmail API status state
  const [gmailApiEnabled, setGmailApiEnabled] = useState(null) // null = checking, true = enabled, false = disabled
  const [checkingApiStatus, setCheckingApiStatus] = useState(false)

  // Contact table state (from LeadsTab)
  const [contacts, setContacts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContacts, setSelectedContacts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showContactImportModal, setShowContactImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImportLoading, setCsvImportLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingContact, setEditingContact] = useState({})
  const [filterCount, setFilterCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [locationFilter, setLocationFilter] = useState("")
  const [keywordFilter, setKeywordFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")

  const pageSize = 20

  // Sequence status colors for contact table
  const sequenceStatusColors = {
    'Valid': 'bg-green-100 text-green-800',
    'Invalid': 'bg-red-100 text-red-800',
    'Risky': 'bg-yellow-100 text-yellow-800',
    'Unknown': 'bg-gray-100 text-gray-800',
    'Disposable': 'bg-orange-100 text-orange-800',
    'Not found': 'bg-gray-100 text-gray-600',
    'Skipped': 'text-[rgb(87,140,255)]',
    'Pending': 'text-[rgb(87,140,255)]'
  }

  const statusInlineStyles = {
    'Skipped': { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' },
    'Pending': { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }
  }

  const tabs = [
    {
      id: 'contacts',
      label: 'Contact', 
      icon: Users,
      color: 'rgb(37, 99, 235)'
    },
    {
      id: 'sequence',
      label: 'Sequence',
      icon: Mail,
      color: 'rgb(37, 99, 235)'
    },
    {
      id: 'sender',
      label: 'Sender',
      icon: Send,
      color: 'rgb(37, 99, 235)'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'rgb(37, 99, 235)'
    }
  ]

  // Sequences functions
  const addStep = (sequenceNumber?: number) => {
    // If no sequence specified, determine based on existing steps
    let targetSequence = sequenceNumber || 1
    let targetTiming = 1
    let targetSequenceStep = 1
    
    if (sequenceNumber) {
      // Find the existing steps in this sequence to determine timing and sequence step
      const existingStepsInSequence = steps.filter(s => s.sequence === sequenceNumber)
      if (existingStepsInSequence.length > 0) {
        // Get the highest timing and sequence step in this sequence
        const maxTiming = Math.max(...existingStepsInSequence.map(s => s.timing))
        const maxSequenceStep = Math.max(...existingStepsInSequence.map(s => s.sequenceStep))
        
        // For sequence 1, default to 3 days after the previous email
        targetTiming = sequenceNumber === 1 ? maxTiming + 3 : maxTiming + 1
        targetSequenceStep = maxSequenceStep + 1
      } else if (sequenceNumber === 2) {
        // If adding to sequence 2 and it doesn't exist, start after sequence 1
        const seq1Steps = steps.filter(s => s.sequence === 1)
        const maxSeq1Timing = seq1Steps.length > 0 ? Math.max(...seq1Steps.map(s => s.timing)) : 0
        targetTiming = maxSeq1Timing + 7 // Default 7 day gap
        targetSequenceStep = 1
      }
    } else {
      // Legacy behavior - add to the end
      const maxId = steps.length > 0 ? Math.max(...steps.map(s => s.id)) : 0
      targetSequence = steps.length > 0 ? steps[steps.length - 1].sequence : 1
      // If this is the first email, start at 0, otherwise add 3 days to the last timing
      if (steps.length === 0) {
        targetTiming = 0
      } else {
        const maxTiming = Math.max(...steps.map(s => s.timing))
        targetTiming = targetSequence === 1 ? maxTiming + 3 : maxTiming + 1
      }
      targetSequenceStep = steps.filter(s => s.sequence === targetSequence).length + 1
    }

    // Get the subject from existing steps in the same sequence
    const existingSequenceSteps = steps.filter(s => s.sequence === targetSequence)
    const sequenceSubject = existingSequenceSteps.length > 0 ? existingSequenceSteps[0].subject : ""

    const newStep = {
      id: Math.max(...steps.map(s => s.id), 0) + 1,
      subject: sequenceSubject,
      content: "",
      variants: 1,
      timing: targetTiming,
      sequence: targetSequence,
      sequenceStep: targetSequenceStep,
      title: `Email ${targetSequenceStep}`
    }
    
    setSteps([...steps, newStep])
    setActiveStepId(newStep.id)
  }

  const deleteStep = (stepId: number) => {
    const stepToDelete = steps.find(step => step.id === stepId)
    if (!stepToDelete) return
    
    setDeleteConfirm({
      isOpen: true,
      type: 'step',
      item: { 
        id: stepId, 
        name: stepToDelete.subject || `Step ${stepToDelete.sequence}-${stepToDelete.sequenceStep}`
      },
      onConfirm: () => confirmDeleteStep(stepId)
    })
  }
  
  const confirmDeleteStep = (stepId: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((step) => step.id !== stepId)
      setSteps(newSteps)
      if (stepId === activeStepId) {
        setActiveStepId(newSteps[0]?.id || 1)
      }
    }
    setDeleteConfirm({ isOpen: false, type: 'step', item: null, onConfirm: null })
  }

  const deleteSequence = (sequenceNumber: number) => {
    const sequenceSteps = steps.filter(step => step.sequence === sequenceNumber)
    if (sequenceSteps.length === 0) return
    
    setDeleteConfirm({
      isOpen: true,
      type: 'sequence',
      item: { 
        id: sequenceNumber, 
        name: `Sequence ${sequenceNumber} (${sequenceSteps.length} email${sequenceSteps.length > 1 ? 's' : ''})`
      },
      onConfirm: () => confirmDeleteSequence(sequenceNumber)
    })
  }
  
  const confirmDeleteSequence = (sequenceNumber: number) => {
    const sequenceSteps = steps.filter(step => step.sequence === sequenceNumber)
    if (sequenceSteps.length > 0) {
      // Remove all steps in this sequence
      const newSteps = steps.filter(step => step.sequence !== sequenceNumber)
      
      if (newSteps.length > 0) {
        setSteps(newSteps)
        // If active step was in deleted sequence, switch to first remaining step
        if (sequenceSteps.some(step => step.id === activeStepId)) {
          setActiveStepId(newSteps[0].id)
        }
      }
    }
    setDeleteConfirm({ isOpen: false, type: 'sequence', item: null, onConfirm: null })
  }

  const updateGap = (newGap: number) => {
    const seq1Steps = steps.filter(s => s.sequence === 1)
    const seq2Steps = steps.filter(s => s.sequence === 2)
    
    if (seq1Steps.length > 0 && seq2Steps.length > 0) {
      const seq1End = Math.max(...seq1Steps.map(s => s.timing))
      const newSeq2Start = seq1End + newGap
      
      // Update all sequence 2 steps to maintain their relative timing but with new gap
      const seq2MinTiming = Math.min(...seq2Steps.map(s => s.timing))
      const timingOffset = newSeq2Start - seq2MinTiming
      
      const updatedSteps = steps.map(step => {
        if (step.sequence === 2) {
          return { ...step, timing: step.timing + timingOffset }
        }
        return step
      })
      
      setSteps(updatedSteps)
    }
  }

  const selectStep = (stepId: number) => {
    setActiveStepId(stepId)
  }

  const addVariant = (stepId: number) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, variants: step.variants + 1 } : step)))
  }

  const updateStepContent = (content: string) => {
    setSteps(steps.map((step) => (step.id === activeStepId ? { ...step, content } : step)))
  }

  const insertVariableIntoContent = (variable: string) => {
    const activeStep = steps.find(s => s.id === activeStepId)
    if (!activeStep) return
    
    const currentContent = activeStep.content || ''
    const newContent = currentContent + variable
    updateStepContent(newContent)
  }

  const applyFormatting = (command: string, value?: string) => {
    if (!editorRef.current || showCodeView) return
    
    editorRef.current.focus()
    document.execCommand(command, false, value)
    
    // Update content after formatting
    const htmlContent = editorRef.current.innerHTML
    updateStepContent(htmlContent)
  }

  const formatBold = () => applyFormatting('bold')
  const formatItalic = () => applyFormatting('italic')
  const formatUnderline = () => applyFormatting('underline')
  
  const insertLink = () => {
    if (!editorRef.current || showCodeView) return
    
    editorRef.current.focus()
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    const url = prompt('Enter the URL:', 'https://')
    if (!url) return
    
    // If there's selected text, use it as link text
    if (selectedText) {
      const linkElement = document.createElement('a')
      linkElement.href = url
      linkElement.textContent = selectedText
      linkElement.target = '_blank'
      linkElement.rel = 'noopener noreferrer'
      
      range.deleteContents()
      range.insertNode(linkElement)
    } else {
      // If no text selected, create link with URL as text
      const linkElement = document.createElement('a')
      linkElement.href = url
      linkElement.textContent = url
      linkElement.target = '_blank'
      linkElement.rel = 'noopener noreferrer'
      
      range.insertNode(linkElement)
    }
    
    // Clear selection and update content
    selection.removeAllRanges()
    updateStepContent(editorRef.current.innerHTML)
  }

  const toggleCodeView = () => {
    setShowCodeView(!showCodeView)
  }

  const formatCode = () => {
    if (!editorRef.current || showCodeView) return
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      
      if (selectedText) {
        const codeElement = document.createElement('code')
        codeElement.style.backgroundColor = '#f3f4f6'
        codeElement.style.padding = '2px 4px'
        codeElement.style.borderRadius = '3px'
        codeElement.style.fontFamily = 'monospace'
        codeElement.textContent = selectedText
        range.deleteContents()
        range.insertNode(codeElement)
        
        // Clear selection
        selection.removeAllRanges()
        
        // Update content
        updateStepContent(editorRef.current.innerHTML)
      }
    }
  }

  const insertVariableIntoEditor = (variable: string) => {
    if (!editorRef.current || showCodeView) return
    
    editorRef.current.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const textNode = document.createTextNode(variable)
      range.insertNode(textNode)
      
      // Move cursor after inserted text
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    updateStepContent(editorRef.current.innerHTML)
  }

  const updateStepSubject = (subject: string) => {
    setSteps(steps.map((step) => (step.id === activeStepId ? { ...step, subject } : step)))
  }

  const updateSequenceSubject = (sequenceNumber: number, subject: string) => {
    console.log(`🔄 Updating sequence ${sequenceNumber} subject to: "${subject}"`)
    setSteps(steps.map((step) => 
      step.sequence === sequenceNumber ? { ...step, subject } : step
    ))
  }

  const updateStepTiming = (stepId: number, timing: number) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, timing } : step)))
  }

  // Check deliverability of selected sender accounts
  const checkSelectedAccountsDeliverability = () => {
    if (!selectedSenderAccounts || selectedSenderAccounts.length === 0) {
      console.log('🔍 No sender accounts selected for deliverability check')
      return { hasLowDeliverability: false, lowDeliverabilityAccounts: [] }
    }
    
    // Get all connected accounts (Gmail, Microsoft365, SMTP)
    const allAccounts = [
      ...connectedGmailAccounts,
      ...connectedMicrosoft365Accounts,
      ...connectedSmtpAccounts
    ]
    
    console.log('🔍 All connected accounts:', allAccounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      health_score: acc.health_score
    })))
    
    // Find selected accounts with their data
    const selectedAccountsData = allAccounts.filter(account => 
      selectedSenderAccounts.includes(account.id)
    )
    
    console.log('🔍 Selected accounts data:', selectedAccountsData.map(acc => ({
      id: acc.id,
      email: acc.email,
      health_score: acc.health_score
    })))
    
    // Find accounts with deliverability < 95%
    const lowDeliverabilityAccounts = selectedAccountsData.filter(account => {
      const healthScore = account.health_score
      console.log(`🔍 Checking account ${account.email}: health_score = ${healthScore}`)
      // Only check accounts that have health_score data
      return healthScore !== undefined && healthScore !== null && healthScore < 95
    })
    
    console.log('🔍 Low deliverability accounts:', lowDeliverabilityAccounts.map(acc => ({
      email: acc.email,
      health_score: acc.health_score
    })))
    
    return {
      hasLowDeliverability: lowDeliverabilityAccounts.length > 0,
      lowDeliverabilityAccounts
    }
  }

  // Save sender accounts with validation and deliverability check
  const saveSenderAccounts = async (): Promise<boolean> => {
    console.log('🔧 saveSenderAccounts called')
    console.log('🔧 selectedSenderAccounts:', selectedSenderAccounts)
    console.log('🔧 campaign?.id:', campaign?.id)
    
    if (!campaign?.id) return false
    
    try {
      // 1. Check if at least one account is selected
      if (!selectedSenderAccounts || selectedSenderAccounts.length === 0) {
        console.log('🚨 No accounts selected, showing dialog')
        setShowNoAccountSelectedDialog(true)
        return false // Return false to indicate save was not completed
      }
      
      // 2. Check for critical deliverability (< 50%) - Critical improvement needed
      const allAccounts = [
        ...connectedGmailAccounts,
        ...connectedMicrosoft365Accounts,
        ...connectedSmtpAccounts
      ]
      
      const selectedAccountsData = allAccounts.filter(account => 
        selectedSenderAccounts.includes(account.id)
      )
      
      const criticalAccounts = selectedAccountsData.filter(account => {
        const healthScore = account.health_score
        return healthScore !== undefined && healthScore !== null && healthScore < 50
      })
      
      console.log('🔧 Critical accounts (< 50%):', criticalAccounts.length)
      
      if (criticalAccounts.length > 0) {
        console.log('🚨 Critical deliverability detected, showing enhancement dialog')
        // Show deliverability improvement popup for critical accounts
        setLowDeliverabilityAccounts(criticalAccounts)
        setShowDeliverabilityDialog(true)
        return false // Don't save yet, wait for user confirmation
      }
      
      // 3. Check if any selected accounts have health_score < 90% for warm-up info
      const needsWarmupAccounts = selectedAccountsData.filter(account => {
        const healthScore = account.health_score
        console.log(`🔧 Account ${account.email} health score: ${healthScore}`)
        return healthScore !== undefined && healthScore !== null && healthScore < 90
      })
      
      console.log('🔧 Accounts needing warm-up:', needsWarmupAccounts.length)
      
      // Save the sender accounts data first
      await saveCampaignData('senders')
      
      // Show appropriate success message
      if (needsWarmupAccounts.length > 0) {
        console.log('🚨 Showing warm-up info dialog')
        // Show warm-up info dialog for accounts < 90%
        setShowWarmupInfoDialog(true)
      } else {
        console.log('✅ All accounts healthy, showing success toast')
        // Show regular success message for accounts >= 90%
        toast.success('Sender accounts saved successfully!', {
          duration: 3000,
        })
      }
      
      return true // Return true to indicate save was completed successfully
    } catch (error) {
      console.error("❌ Error saving sender accounts:", error)
      toast.error('Failed to save sender accounts')
      return false
    }
  }
  
  // Save sender accounts after deliverability confirmation
  const proceedWithSenderSave = async () => {
    try {
      // Save the sender accounts data
      await saveCampaignData('senders')
      
      // Check if any selected accounts need warm-up (< 90%)
      const allAccounts = [
        ...connectedGmailAccounts,
        ...connectedMicrosoft365Accounts,
        ...connectedSmtpAccounts
      ]
      
      const selectedAccountsData = allAccounts.filter(account => 
        selectedSenderAccounts.includes(account.id)
      )
      
      const needsWarmupAccounts = selectedAccountsData.filter(account => {
        const healthScore = account.health_score
        return healthScore !== undefined && healthScore !== null && healthScore < 90
      })
      
      // Close the deliverability dialog first
      setShowDeliverabilityDialog(false)
      setLowDeliverabilityAccounts([])
      
      // Show appropriate message
      if (needsWarmupAccounts.length > 0) {
        // Show warm-up info dialog for accounts < 90%
        setShowWarmupInfoDialog(true)
      } else {
        // Show enhanced deliverability message
        toast.success('Sender accounts saved! We will enhance the warm-up process to improve deliverability for your selected accounts.', {
          duration: 6000,
        })
      }
    } catch (error) {
      console.error("❌ Error saving sender accounts:", error)
      toast.error('Failed to save sender accounts')
    }
  }

  // Comprehensive campaign save function
  const saveCampaignData = async (dataType = 'all') => {
    if (!campaign?.id) return

    try {
      const campaignData = {
        // Campaign basic info
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        
        // Sequences
        sequences: steps,
        
        // Settings
        settings: {
          dailyContactsLimit,
          dailySequenceLimit,
          activeDays,
          sendingStartTime,
          sendingEndTime,
          signature: {
            firstName,
            lastName,
            companyName,
            companyWebsite,
            emailSignature
          }
        },
        
        // Sender accounts
        senderAccounts: selectedSenderAccounts,
        
        // Connected accounts for reference
        connectedAccounts: {
          gmail: connectedGmailAccounts,
          microsoft365: connectedMicrosoft365Accounts,
          smtp: connectedSmtpAccounts
        }
      }

      await saveCampaignDataHelper(campaignData, dataType)
    } catch (error) {
      console.error("❌ Error saving campaign:", error)
    }
  }

  // Helper function for saving with custom sender selection
  const saveCampaignDataWithSenders = async (dataType = 'all', customSenderAccounts = null) => {
    if (!campaign?.id) return

    try {
      const campaignData = {
        // Campaign basic info
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        
        // Sequences
        sequences: steps,
        
        // Settings
        settings: {
          dailyContactsLimit,
          dailySequenceLimit,
          activeDays,
          sendingStartTime,
          sendingEndTime,
          signature: {
            firstName,
            lastName,
            companyName,
            companyWebsite,
            emailSignature
          }
        },
        
        // Sender accounts - use custom if provided, otherwise use state
        senderAccounts: customSenderAccounts !== null ? customSenderAccounts : selectedSenderAccounts,
        
        // Connected accounts for reference
        connectedAccounts: {
          gmail: connectedGmailAccounts,
          microsoft365: connectedMicrosoft365Accounts,
          smtp: connectedSmtpAccounts
        }
      }

      await saveCampaignDataHelper(campaignData, dataType)
    } catch (error) {
      console.error("❌ Error saving campaign:", error)
    }
  }

  // Shared helper function for the actual save logic
  const saveCampaignDataHelper = async (campaignData, dataType) => {
    console.log('📤 Sending campaign data:', JSON.stringify({
      sequences: campaignData.sequences,
      senderAccounts: campaignData.senderAccounts,
      saveType: dataType
    }, null, 2))
    
    if (dataType === 'senders') {
      console.log('🔍 Detailed sender save data:', {
        campaignDataSenderAccounts: campaignData.senderAccounts,
        saveType: dataType
      })
    }

    const response = await fetch(`/api/campaigns/${campaign.id}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        campaignData,
        saveType: dataType
      }),
    })

    const result = await response.json()

    if (result.success) {
      // Update saved states
      if (dataType === 'all' || dataType === 'sequences') {
        setHasSequenceSaved(true)
        console.log('✅ Sequences saved successfully')
      }
      if (dataType === 'all' || dataType === 'settings') {
        setHasSettingsSaved(true)
      }
      if (dataType === 'senders') {
        console.log('✅ Sender selection saved successfully:', campaignData.senderAccounts)
      }
      
      const saveTypeText = dataType === 'all' ? 'Campaign Data' : 
                          dataType === 'sequences' ? 'Sequences' :
                          dataType === 'settings' ? 'Settings' :
                          dataType === 'senders' ? 'Sender Selection' : 'Data'
                          
    } else {
      console.error('❌ Save failed:', result.error)
      throw new Error(result.error)
    }
  }

  // Individual save functions for backward compatibility
  const saveSequence = async () => {
    if (!campaign?.id || steps.length === 0 || isSavingSequences) return
    
    setIsSavingSequences(true)
    try {
      console.log('💾 Saving sequences using dedicated endpoint...', steps.length, 'steps')
      console.log('📤 Sending to sequences API:', JSON.stringify(steps, null, 2))
      
      const response = await fetch(`/api/campaigns/${campaign.id}/sequences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          sequences: steps
        }),
      })

      const result = await response.json()

      if (result.success) {
        setHasSequenceSaved(true)
        console.log('✅ Sequences saved successfully via dedicated endpoint')
      } else {
        console.error('❌ Save failed via sequences endpoint:', result.error)
      }
    } catch (error) {
      console.error("❌ Error saving sequences via dedicated endpoint:", error)
    } finally {
      setIsSavingSequences(false)
    }
  }
  const saveSettings = () => saveCampaignData('settings')
  const saveAll = () => saveCampaignData('all')
  const saveSenders = () => saveCampaignData('senders')

  // Load essential campaign data using quick API for fast loading
  const loadQuickCampaignData = async () => {
    if (!campaign?.id) return
    
    setIsLoadingCampaignData(true)
    try {
      // Use the new quick endpoint with caching
      const response = await fetch(`/api/campaigns/${campaign.id}/quick`, {
        credentials: "include"
      })
      
      if (!response.ok) {
        // Fallback to regular endpoint if quick endpoint fails
        console.log('Quick API not available, falling back to regular endpoint')
        await loadCampaignData()
        return
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        
        // Update counts for tabs
        if (data.counts) {
          console.log('📊 Campaign counts loaded:', data.counts)
        }
        
        // Campaign data loaded successfully
        
        setCampaignDataLoaded(true)
        
        // Load full data only for active tab
        if (activeTab === 'sequences') {
          loadSequences()
        } else if (activeTab === 'settings') {
          loadSettingsData()
        }
      }
    } catch (error) {
      console.error("Error loading quick campaign data:", error)
      // Fallback to regular loading
      await loadCampaignData()
    } finally {
      setIsLoadingCampaignData(false)
    }
  }
  
  // Load full campaign data when needed (tab-specific)
  const loadCampaignData = async () => {
    if (!campaign?.id) return
    
    setIsLoadingCampaignData(true)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/save`, {
        credentials: "include"
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        
        // Load settings
        if (data.settings) {
          setDailyContactsLimit(data.settings.dailyContactsLimit || 35)
          setDailySequenceLimit(data.settings.dailySequenceLimit || 100)
          setActiveDays(data.settings.activeDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
          setSendingStartTime(data.settings.sendingStartTime || '08:00 AM')
          setSendingEndTime(data.settings.sendingEndTime || '05:00 PM')
          
          // Load signature data
          if (data.settings.signature) {
            setFirstName(data.settings.signature.firstName || 'Loop')
            setLastName(data.settings.signature.lastName || 'Review')
            setCompanyName(data.settings.signature.companyName || 'LeadsUp')
            setCompanyWebsite(data.settings.signature.companyWebsite || 'https://www.leadsup.com')
            const signatureHtml = data.settings.signature.emailSignature || `<br/><br/>Best regards,<br/><strong>${data.settings.signature.firstName || 'Loop'} ${data.settings.signature.lastName || 'Review'}</strong><br/>${data.settings.signature.companyName || 'LeadsUp'}<br/><a href="${data.settings.signature.companyWebsite || 'https://www.leadsup.com'}" target="_blank">${data.settings.signature.companyWebsite || 'https://www.leadsup.com'}</a>`
            setEmailSignature(signatureHtml)
            if (signatureEditorRef.current) {
              signatureEditorRef.current.innerHTML = signatureHtml
            }
          }
        }
        
        // Load sender accounts
        if (data.senders) {
          setSelectedSenderAccounts(data.senders)
        }
        
        
        setCampaignDataLoaded(true)
      }
    } catch (error) {
      console.error('Error loading campaign data:', error)
    } finally {
      setIsLoadingCampaignData(false)
    }
  }

  // Lazy load sequences when needed
  const loadSequences = async () => {
    console.log('🔍 loadSequences called, campaign.id:', campaign?.id)
    if (!campaign?.id) {
      console.log('❌ No campaign ID, skipping sequence load')
      return
    }
    
    try {
      console.log('📡 Fetching sequences from API...')
      const response = await fetch(`/api/campaigns/${campaign.id}/sequences`, {
        credentials: "include"
      })
      const result = await response.json()
      
      console.log('📥 Sequences API response:', {
        success: result.success,
        dataLength: result.data?.length,
        data: result.data
      })
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ Setting sequences in state:', result.data.length, 'sequences')
        setSteps(result.data)
        setActiveStepId(result.data[0]?.id || 1)
      } else {
        // No sequences found in database, create a default sequence
        console.log('ℹ️ No existing sequences found, creating default sequence')
        const defaultSequence = [
          { 
            id: 1, 
            type: 'email', 
            sequence: 1,
            sequenceStep: 1,
            title: 'Email 1',
            subject: 'Introduction - Let\'s connect', 
            content: 'Hi {{firstName}},<br/><br/>I hope this email finds you well! I wanted to reach out because I believe there might be a great opportunity for us to work together.<br/><br/>Best regards,<br/>{{senderName}}',
            timing: 0,
            variants: 1 
          }
        ]
        setSteps(defaultSequence)
        setActiveStepId(1)
      }
    } catch (error) {
      console.error('❌ Error loading sequences:', error)
    }
  }

  // Lazy load connected accounts when needed
  const loadConnectedAccounts = async () => {
    if (!campaign?.id) return
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/accounts`, {
        credentials: "include"
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        setConnectedGmailAccounts(result.data.gmail || [])
        setConnectedMicrosoft365Accounts(result.data.microsoft365 || [])
        setConnectedSmtpAccounts(result.data.smtp || [])
      }
    } catch (error) {
      console.error('Error loading connected accounts:', error)
    }
  }

  // Load selected sender accounts
  const loadSelectedSenders = async () => {
    console.log('🔍 loadSelectedSenders called, campaign.id:', campaign?.id)
    if (!campaign?.id) {
      console.log('❌ No campaign ID, skipping sender selection load')
      return
    }
    
    try {
      console.log('📡 Fetching selected senders from API...')
      const response = await fetch(`/api/campaigns/${campaign.id}/senders`, {
        credentials: "include"
      })
      const result = await response.json()
      
      console.log('📥 Selected senders API response:', {
        success: result.success,
        assignmentsLength: result.assignments?.length,
        assignments: result.assignments
      })
      
      if (result.success && result.assignments && Array.isArray(result.assignments)) {
        // Extract the IDs of selected senders from assignments
        const selectedIds = result.assignments
          .filter(assignment => assignment.is_selected)
          .map(assignment => assignment.id)
        console.log('✅ Setting selected sender accounts:', selectedIds.length, 'accounts')
        setSelectedSenderAccounts(selectedIds)
      } else {
        console.log('ℹ️ No selected senders found, keeping current state')
      }
    } catch (error) {
      console.error('❌ Error loading selected senders:', error)
    }
  }

  // Handle tab changes with lazy loading
  const handleTabChange = async (tabId: string) => {
    console.log(`🔄 Tab changed to: ${tabId}`)
    
    // If leaving sequence tab, save immediately to prevent data loss
    if (activeTab === 'sequence' && tabId !== 'sequence' && steps.length > 0) {
      console.log('💾 Saving sequences before leaving sequence tab...')
      await saveSequence()
    }
    
    setActiveTab(tabId)
    
    // Update guided flow step if in guided mode
    if (isGuidedFlow) {
      const stepIndex = guidedFlowSteps.findIndex(step => step.tab === tabId)
      if (stepIndex >= 0) {
        setGuidedFlowStep(stepIndex)
      }
    }
    
    // Lazy load data when specific tabs are accessed
    if (tabId === 'sequence' || tabId === 'automation') {
      console.log('🔄 Loading sequences for sequence/automation tab...')
      loadSequences()
    }
    
    if (tabId === 'sender') {
      console.log('🔄 Loading sender data...')
      loadConnectedAccounts()
      loadSelectedSenders()
    }
    
    // Re-validate requirements when tab changes
    if (isGuidedFlow && campaign?.id) {
      validateCampaignRequirements()
    }
  }
  
  // Load data when component mounts or campaign changes - OPTIMIZED
  useEffect(() => {
    if (campaign?.id && !campaignDataLoaded) {
      // Use the new quick API for fast initial loading
      loadQuickCampaignData()
    }
  }, [campaign?.id])

  // Listen for create campaign event from sidebar
  useEffect(() => {
    const handleCreateCampaign = () => {
      setShowAdvancedPopup(true)
    }

    window.addEventListener('create-campaign', handleCreateCampaign)
    return () => window.removeEventListener('create-campaign', handleCreateCampaign)
  }, [])

  // Auto-save functionality (only after data is loaded)
  useEffect(() => {
    if (!campaignDataLoaded) return
    
    const autoSaveTimer = setTimeout(() => {
      // Auto-save sequences when steps change
      if (steps.length > 0) {
        console.log('🔄 Auto-saving sequences after change...', steps.length, 'steps')
        saveSequence()
      }
    }, 5000) // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [steps, campaignDataLoaded])

  useEffect(() => {
    if (!campaignDataLoaded) return
    
    const autoSaveTimer = setTimeout(() => {
      // Auto-save settings when they change
      saveCampaignData('settings')
    }, 3000) // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [dailyContactsLimit, dailySequenceLimit, activeDays, sendingStartTime, sendingEndTime, firstName, lastName, companyName, companyWebsite, emailSignature, campaignDataLoaded])

  // Note: Sender selections are now saved immediately in onSelectionChange callback

  const previewSequence = () => {
    setShowPreviewModal(!showPreviewModal)
  }

  // Load leads (prospects) from database
  const loadLeadsData = async () => {
    setLeadsLoading(true)
    try {
      const response = await fetch('/api/prospects', {
        credentials: "include"
      })
      const result = await response.json()
      
      if (response.ok && result.prospects) {
        // Map prospects to lead format for the import functionality
        const mappedLeads = result.prospects.map(prospect => ({
          id: prospect.id,
          name: `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() || 'Unknown',
          customer_name: `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() || 'Unknown',
          email: prospect.email_address,
          phone: prospect.phone,
          company: prospect.company_name,
          business_name: prospect.company_name,
          title: prospect.job_title,
          location: prospect.location,
          industry: prospect.industry,
          campaign_id: prospect.campaign_id
        }))
        
        // Filter out prospects that are already assigned to the current campaign
        // Show prospects that: 1) have no campaign assigned, OR 2) are assigned to a different campaign
        const availableLeads = mappedLeads.filter(lead => 
          lead.campaign_id !== campaign?.id?.toString()
        )
        
        console.log(`📊 Import filtering results:`, {
          total_prospects: mappedLeads.length,
          current_campaign_id: campaign?.id?.toString(),
          available_prospects: availableLeads.length,
          prospects_already_assigned_to_this_campaign: mappedLeads.length - availableLeads.length,
          sample_available: availableLeads.slice(0, 3).map(l => ({
            name: l.name,
            email: l.email,
            current_campaign_id: l.campaign_id
          }))
        })
        
        setAllLeads(availableLeads)
        
        if (availableLeads.length === 0 && mappedLeads.length > 0) {
        }
      } else {
      }
    } catch (error) {
      console.error("Error loading leads:", error)
    } finally {
      setLeadsLoading(false)
    }
  }

  // Select/Unselect all leads functions
  const selectAllLeads = () => {
    setSelectedLeads([...allLeads])
  }

  const unselectAllLeads = () => {
    setSelectedLeads([])
  }

  // Import all available leads (for bulk import)
  const importAllContacts = async () => {
    if (!campaign?.id || allLeads.length === 0) return

    setImportLoading(true)
    
    try {
      const prospectsToImport = allLeads.map(lead => {
        const nameParts = (lead.name || lead.customer_name || '').split(' ')
        return {
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          email_address: lead.email,
          phone: lead.phone,
          company_name: lead.company || lead.business_name,
          job_title: lead.title || '',
          location: lead.location || '',
          industry: lead.industry || '',
          campaign_id: campaign.id,
          email_status: 'Ready',
          tags: campaign.name,
          notes: 'Imported from leads table (bulk import)'
        }
      })

      console.log(`📥 Bulk importing ${prospectsToImport.length} contacts...`)

      const response = await fetch(`/api/campaigns/${campaign.id}/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({
          contacts: prospectsToImport
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowImportModal(false)
        setSelectedLeads([])
        fetchContacts() // Refresh the contacts list
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('❌ Error importing all contacts:', error)
    } finally {
      setImportLoading(false)
    }
  }

  // Import prospects from various sources
  const importContacts = async () => {
    if (!campaign?.id) return

    setImportLoading(true)
    
    try {
      let prospectsToImport = []
      
      if (importType === 'leads') {
        prospectsToImport = selectedLeads.map(lead => {
          const nameParts = (lead.name || lead.customer_name || '').split(' ')
          return {
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            email_address: lead.email,
            phone: lead.phone,
            company_name: lead.company || lead.business_name,
            job_title: lead.title || '',
            location: lead.location || '',
            industry: lead.industry || '',
            campaign_id: campaign.id,
            email_status: 'Ready',
            tags: campaign.name,
            notes: 'Imported from leads table'
          }
        })
      } else if (importType === 'csv' && csvFile) {
        // Handle CSV import
        const text = await csvFile.text()
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        
        prospectsToImport = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim())
          const contact = {}
          headers.forEach((header, index) => {
            contact[header.toLowerCase()] = values[index] || ''
          })
          const fullName = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
          const nameParts = fullName.split(' ')
          return {
            first_name: contact.first_name || nameParts[0] || '',
            last_name: contact.last_name || nameParts.slice(1).join(' ') || '',
            email_address: contact.email || contact.email_address,
            phone: contact.phone,
            company_name: contact.company || contact.company_name,
            job_title: contact.title || contact.job_title,
            location: contact.location,
            industry: contact.industry,
            campaign_id: campaign.id,
            email_status: 'Ready',
            tags: campaign.name,
            notes: 'Imported from CSV'
          }
        })
      } else if (importType === 'manual') {
        const nameParts = (manualContact.name || '').split(' ')
        prospectsToImport = [{
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          email_address: manualContact.email,
          phone: manualContact.phone,
          company_name: manualContact.company,
          campaign_id: campaign.id,
          email_status: 'Ready',
          tags: campaign.name,
          notes: 'Added manually'
        }]
      }

      // Use prospects API instead of contacts
      const response = await fetch(`/api/prospects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          prospects: prospectsToImport
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const importedCount = result.imported || 0
        const updatedCount = result.updated || 0
        
        if (importedCount > 0 || updatedCount > 0) {
        } else {
        }
        
        setShowImportModal(false)
        setSelectedLeads([])
        setCsvFile(null)
        setManualContact({ name: '', email: '', phone: '', company: '' })
        
        // Refresh the prospects list
        fetchContacts()
        
      } else {
      }
    } catch (error) {
      console.error("Error importing prospects:", error)
    } finally {
      setImportLoading(false)
    }
  }

  // Handle CSV file selection
  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    } else {
    }
  }

  // Open import modal and load leads
  const openImportModal = () => {
    setShowImportModal(true)
    // Always load leads data when opening the modal since 'leads' is the default importType
    loadLeadsData()
  }

  const activeStep = steps.find((s) => s.id === activeStepId)


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
    if (activeTab === 'target' && campaign?.id) {
      fetchContacts()
    }
  }, [locationFilter, keywordFilter, industryFilter, searchQuery, currentPage, campaign?.id, activeTab])

  // Gmail OAuth functions
  const initiateGmailOAuth = async () => {
    setGmailAuthLoading(true)
    
    try {
      // Step 1: Get OAuth URL from backend
      const response = await fetch('/api/gmail/oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ campaignId: campaign.id })
      })
      
      if (!response.ok) throw new Error('Failed to get OAuth URL')
      
      const { authUrl } = await response.json()
      
      // Step 2: Open OAuth window
      const popup = window.open(authUrl, 'gmail-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes')
      
      // Step 3: Listen for OAuth callback
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setGmailAuthLoading(false)
          // Refresh connected accounts with delay to ensure backend processing
          setTimeout(() => {
            loadConnectedAccounts()
            // Additional refresh to catch any race conditions
            setTimeout(() => {
              loadConnectedAccounts()
            }, 1000)
          }, 500)
        }
      }, 1000)
      
      // Handle message from popup
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
          popup.close()
          clearInterval(checkClosed)
          setGmailAuthLoading(false)
          
          // Add delay to allow backend processing, then refresh accounts multiple times to ensure consistency
          setTimeout(() => {
            loadConnectedAccounts()
            // Refresh again after a short delay to catch any race conditions
            setTimeout(() => {
              loadConnectedAccounts()
            }, 1000)
          }, 500)
          
        } else if (event.data.type === 'GMAIL_AUTH_ERROR') {
          popup.close()
          clearInterval(checkClosed)
          setGmailAuthLoading(false)
          
        }
      })
      
    } catch (error) {
      console.error('Gmail OAuth error:', error)
      setGmailAuthLoading(false)
    }
  }

  // Microsoft 365 OAuth functions
  const initiateMicrosoft365OAuth = async () => {
    setMicrosoft365AuthLoading(true)
    
    try {
      // Step 1: Get OAuth URL from backend
      const response = await fetch('/api/microsoft365/oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include"
      })
      
      if (!response.ok) throw new Error('Failed to get OAuth URL')
      
      const { authUrl } = await response.json()
      
      // Step 2: Open OAuth window
      const popup = window.open(authUrl, 'microsoft365-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes')
      
      // Step 3: Listen for OAuth callback
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setMicrosoft365AuthLoading(false)
          // Refresh connected accounts
          loadConnectedMicrosoft365Accounts()
        }
      }, 1000)
      
      // Handle message from popup
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'MICROSOFT365_AUTH_SUCCESS') {
          popup.close()
          clearInterval(checkClosed)
          setMicrosoft365AuthLoading(false)
          loadConnectedMicrosoft365Accounts()
          
        } else if (event.data.type === 'MICROSOFT365_AUTH_ERROR') {
          popup.close()
          clearInterval(checkClosed)
          setMicrosoft365AuthLoading(false)
          
        }
      })
      
    } catch (error) {
      console.error('Microsoft 365 OAuth error:', error)
      setMicrosoft365AuthLoading(false)
    }
  }

  // Load connected Microsoft 365 accounts
  const loadConnectedMicrosoft365Accounts = async () => {
    try {
      const response = await fetch('/api/microsoft365/accounts', {
        credentials: "include"
      })
      if (response.ok) {
        const text = await response.text()
        try {
          const accounts = JSON.parse(text)
          setConnectedMicrosoft365Accounts(accounts)
        } catch (jsonError) {
          console.error('Failed to parse Microsoft 365 accounts response as JSON:', text.substring(0, 200))
        }
      }
    } catch (error) {
      console.error('Failed to load connected Microsoft 365 accounts:', error)
    }
  }

  // SMTP/IMAP functions
  const openSmtpModal = () => {
    setShowSmtpModal(true)
  }

  const loadConnectedSmtpAccounts = async () => {
    try {
      const response = await fetch('/api/smtp/accounts', {
        credentials: "include"
      })
      if (response.ok) {
        const text = await response.text()
        try {
          const accounts = JSON.parse(text)
          setConnectedSmtpAccounts(accounts)
        } catch (jsonError) {
          console.error('Failed to parse SMTP accounts response as JSON:', text.substring(0, 200))
        }
      }
    } catch (error) {
      console.error('Failed to load connected SMTP accounts:', error)
    }
  }

  const handleSmtpFormChange = (field, value) => {
    setSmtpFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateSmtpConnection = async () => {
    setSmtpLoading(true)
    try {
      const response = await fetch('/api/smtp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({
          smtpHost: smtpFormData.smtpHost,
          smtpPort: smtpFormData.smtpPort,
          smtpSecure: smtpFormData.smtpSecure,
          smtpUser: smtpFormData.smtpUser,
          smtpPassword: smtpFormData.smtpPassword
        })
      })

      const data = await response.json()

      if (data.success) {
      } else {
      }
    } catch (error) {
    } finally {
      setSmtpLoading(false)
    }
  }

  const saveSmtpAccount = async () => {
    if (!smtpFormData.name.trim() || !smtpFormData.email.trim() || 
        !smtpFormData.smtpHost.trim() || !smtpFormData.smtpUser.trim() || 
        !smtpFormData.smtpPassword.trim()) {
      return
    }

    setSmtpLoading(true)
    try {
      const response = await fetch('/api/smtp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(smtpFormData)
      })

      const data = await response.json()

      if (data.success) {
        setShowSmtpModal(false)
        setSmtpFormData({
          name: '',
          email: '',
          smtpHost: '',
          smtpPort: 587,
          smtpSecure: true,
          smtpUser: '',
          smtpPassword: ''
        })
        loadConnectedSmtpAccounts()
      } else {
        // Check if it's a Gmail App Password error
        if (data.error && data.error.includes('Gmail App Password Required')) {
          setShowGmailAppPasswordModal(true)
        } else {
        }
      }
    } catch (error) {
    } finally {
      setSmtpLoading(false)
    }
  }

  const testSmtpConnection = (accountId) => {
    const account = connectedSmtpAccounts.find(acc => acc.id === accountId)
    setTestModalAccountId(accountId)
    setTestModalEmail(testEmail)
    setShowTestModal(true)
  }

  const sendTestSmtpEmail = async () => {
    if (!testModalEmail.trim()) {
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/smtp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your SMTP integration is working correctly.</p><p>If you received this email, your SMTP connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestEmail(testModalEmail)
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
    } finally {
      setTestModalLoading(false)
    }
  }

  // Delete campaign function
  const handleDeleteCampaign = () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteCampaign = async () => {
    if (!campaign?.id) return

    try {
      const response = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const result = await response.json()

      if (result.success) {
        
        // Call onDelete to update parent state and navigate back
        if (onDelete) {
          onDelete(campaign.id)
        }
      } else {
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const handleAdvancedCampaignComplete = async (campaignData: any) => {
    try {
      // Campaign has already been created in the popup with ID: campaignData.campaignId
      console.log('✅ Campaign creation completed. Campaign ID:', campaignData.campaignId)
      
      // Don't create a duplicate campaign - just close popup and refresh
      setShowAdvancedPopup(false)
      
      // Refresh the parent campaigns list to show the new campaign
      window.dispatchEvent(new CustomEvent('campaigns-changed'))
      
      // Navigate to the new campaign
      if (campaignData.campaignId) {
        router.push(`/campaigns/${campaignData.campaignId}`)
      } else if (onBack) {
        onBack()
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
    }
  }

  // Launch/Pause campaign function
  const handleLaunchPauseCampaign = () => {
    if (!campaign?.id) return
    
    // If campaign is Draft, validate before launching
    if (campaign.status === 'Draft') {
      // Check if required conditions are met
      // Updated to check for domain-based sender accounts instead of OAuth accounts
      const hasConnectedAccount = selectedSenderAccounts.length > 0
      const hasContacts = totalContacts > 0
      const errors = []
      
      console.log('🚀 Launch validation - selectedSenderAccounts:', selectedSenderAccounts)
      console.log('🚀 Launch validation - hasConnectedAccount:', hasConnectedAccount)
      
      if (!hasConnectedAccount) {
        errors.push({
          title: "No Sender Accounts Selected",
          description: "Select at least one sender account from your verified domains to send campaigns.",
          action: () => {
            setShowLaunchValidationModal(false)
            handleTabChange('sender')
          },
          buttonText: "Select Sender Accounts"
        })
      }
      
      if (!hasContacts) {
        errors.push({
          title: "No Contacts Added",
          description: "Add at least one contact to your campaign.",
          action: () => {
            setShowLaunchValidationModal(false)
            handleTabChange('target')
          },
          buttonText: "Add Contacts"
        })
      }
      
      if (!hasSettingsSaved) {
        errors.push({
          title: "Settings Not Saved",
          description: "Save your campaign settings before launching.",
          action: () => {
            setShowLaunchValidationModal(false)
            handleTabChange('settings')
          },
          buttonText: "Go to Settings"
        })
      }
      
      if (!hasSequenceSaved) {
        errors.push({
          title: "Sequence Not Saved",
          description: "Save your email sequence before launching.",
          action: () => {
            setShowLaunchValidationModal(false)
            handleTabChange('sequence')
          },
          buttonText: "Go to Sequence"
        })
      }
      
      // If there are validation errors, show the modal
      if (errors.length > 0) {
        setLaunchValidationErrors(errors)
        setShowLaunchValidationModal(true)
        return
      }
      
      // Launch the campaign
      if (onStatusUpdate) {
        onStatusUpdate(campaign.id, 'Active')
      }
    } else if (campaign.status === 'Active') {
      // Pause the campaign
      if (onStatusUpdate) {
        onStatusUpdate(campaign.id, 'Paused')
      }
    } else if (campaign.status === 'Paused') {
      // Resume the campaign
      if (onStatusUpdate) {
        onStatusUpdate(campaign.id, 'Active')
      }
    }
  }

  // Campaign name editing functions
  const handleStartEditingName = () => {
    setIsEditingName(true)
    setEditedName(campaign?.name || "")
  }

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== campaign?.name && onNameUpdate) {
      onNameUpdate(campaign.id, editedName.trim())
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setIsEditingName(false)
    setEditedName(campaign?.name || "")
  }

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Open test modal
  const testGmailConnection = (accountId) => {
    const account = connectedEmailAccounts.find(acc => acc.id === accountId)
    setTestModalAccountId(accountId)
    setTestModalEmail(testEmail) // Pre-fill with saved test email
    setShowTestModal(true)
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testModalEmail.trim()) {
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/gmail/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your Gmail integration is working correctly.</p><p>If you received this email, your Gmail connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestEmail(testModalEmail) // Save for next time
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
    } finally {
      setTestModalLoading(false)
    }
  }

  // Test Microsoft 365 connection
  const testMicrosoft365Connection = (accountId) => {
    const account = connectedMicrosoft365Accounts.find(acc => acc.id === accountId)
    setTestModalAccountId(accountId)
    setTestModalEmail(testEmail) // Pre-fill with saved test email
    setShowTestModal(true)
  }

  // Determine if the current test modal account is Gmail, Microsoft 365, or SMTP
  const getCurrentTestAccountType = () => {
    if (connectedEmailAccounts.find(acc => acc.id === testModalAccountId)) {
      return 'gmail'
    }
    if (connectedMicrosoft365Accounts.find(acc => acc.id === testModalAccountId)) {
      return 'microsoft365'
    }
    if (connectedSmtpAccounts.find(acc => acc.id === testModalAccountId)) {
      return 'smtp'
    }
    return null
  }

  // Generic test email function that calls the appropriate service
  const sendTestEmailGeneric = async () => {
    const accountType = getCurrentTestAccountType()
    if (accountType === 'gmail') {
      await sendTestEmail()
    } else if (accountType === 'microsoft365') {
      await sendTestMicrosoft365Email()
    } else if (accountType === 'smtp') {
      await sendTestSmtpEmail()
    }
  }

  // Send test email via Microsoft 365
  const sendTestMicrosoft365Email = async () => {
    if (!testModalEmail.trim()) {
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/microsoft365/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your Microsoft 365 integration is working correctly.</p><p>If you received this email, your Microsoft 365 connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestEmail(testModalEmail) // Save for next time
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
    } finally {
      setTestModalLoading(false)
    }
  }

  // Contact table functions (fetch contacts for the campaign)
  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (campaign?.id) params.append('campaign_id', campaign.id.toString())
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
        // Map contacts to the expected format for the UI
        const mappedContacts = data.contacts.map(contact => ({
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
          email: contact.email,
          company: contact.company,
          title: contact.title,
          location: contact.location,
          linkedin: contact.linkedin,
          industry: contact.industry,
          image_url: contact.image_url,
          campaign_name: contact.campaign_name,
          status: 'Valid' // Default status for imported contacts
        }))
        
        setContacts(mappedContacts)
        setTotalContacts(data.total || 0)
        setHasMore(data.hasMore || false)
      } else {
        setContacts([])
        setTotalContacts(0)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching campaign contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns', {
        credentials: "include"
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setCampaigns(data.data)
      } else {
        setCampaigns([])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaigns([])
    }
  }

  const handleCampaignAssignment = async (campaignId) => {
    if (selectedContacts.length === 0) return

    try {
      const selectedCampaign = campaigns.find(c => c.id.toString() === campaignId)
      if (!selectedCampaign) return

      const updatePromises = selectedContacts.map(contactId => {
        const contact = contacts.find(c => c.id === contactId)
        if (!contact) return Promise.resolve()

        const existingTags = contact.tags || ''
        const newTag = selectedCampaign.name
        const updatedTags = existingTags 
          ? (existingTags.includes(newTag) ? existingTags : `${existingTags}, ${newTag}`)
          : newTag

        return fetch(`/api/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: "include",
          body: JSON.stringify({ tags: updatedTags })
        })
      })

      await Promise.all(updatePromises)

      setSelectedContacts([])
      fetchContacts()
    } catch (error) {
      console.error('Error assigning contacts to campaign:', error)
    }
  }

  const handleSelectContact = (contactId) => {
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
          credentials: "include"
        })
      )

      await Promise.all(deletePromises)

      setSelectedContacts([])
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contacts:', error)
    }
  }

  // Function to delete selected contacts or specific contact IDs
  const deleteSelectedContacts = async (contactIds = null) => {
    const idsToDelete = contactIds || selectedContacts
    
    if (!idsToDelete || idsToDelete.length === 0) {
      return
    }

    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} contact(s)?`)) return

    try {
      const deletePromises = idsToDelete.map(contactId =>
        fetch(`/api/contacts/${contactId}`, { 
          method: 'DELETE',
          credentials: "include"
        })
      )

      await Promise.all(deletePromises)

      // Clear selection if we were deleting selected contacts
      if (!contactIds) {
        setSelectedContacts([])
      }
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contacts:', error)
    }
  }

  const handleExportCSV = () => {
    const contactsToExport = selectedContacts.length > 0 
      ? contacts.filter(contact => selectedContacts.includes(contact.id))
      : contacts

    const headers = ['First Name', 'Last Name', 'Sequence', 'Title', 'Company', 'Industry', 'Location', 'LinkedIn', 'Tags', 'Sequence Status', 'Privacy', 'Notes']
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
        contact.tags || '',
        contact.email_status || '',
        contact.privacy || '',
        contact.note || ''
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

  }

  const handleCsvImport = async () => {
    if (!csvFile) return

    setCsvImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        credentials: "include",
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        
        // Close modal and refresh contacts
        setShowContactImportModal(false)
        setCsvFile(null)
        fetchContacts()
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('CSV import error:', error)
    } finally {
      setCsvImportLoading(false)
    }
  }

  const handleEditContact = (contact) => {
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
        body: JSON.stringify(editingContact)
      })

      const data = await response.json()

      if (response.ok) {
        
        setShowEditModal(false)
        setEditingContact({})
        fetchContacts()
      } else {
        throw new Error(data.error || 'Failed to save contact')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
    }
  }

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || ''
    const last = lastName?.charAt(0)?.toUpperCase() || ''
    return first + last || '??'
  }

  const formatDate = (dateString) => {
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

  const getTagsArray = (tags) => {
    if (!tags) return []
    return tags.split(',').map(tag => tag.trim()).filter(Boolean)
  }

  // Gmail API status functions
  const checkGmailApiStatus = async () => {
    setCheckingApiStatus(true)
    try {
      const response = await fetch('/api/gmail/api-status', {
        credentials: "include"
      })
      const data = await response.json()
      
      if (response.ok) {
        setGmailApiEnabled(data.enabled)
      } else {
        setGmailApiEnabled(false)
      }
    } catch (error) {
      console.error('Failed to check Gmail API status:', error)
      setGmailApiEnabled(false)
    } finally {
      setCheckingApiStatus(false)
    }
  }

  const enableGmailApi = () => {
    const projectId = '529005365476' // Your Google Cloud project ID
    const gmailApiUrl = `https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${projectId}`
    
    window.open(gmailApiUrl, '_blank')
    
  }

  // Load connected accounts ONLY when sender tab is active - LAZY LOADING
  useEffect(() => {
    if (activeTab === 'senders') {
      Promise.all([
        loadConnectedAccounts(),
        loadConnectedMicrosoft365Accounts(),
        loadConnectedSmtpAccounts(),
        checkGmailApiStatus()
      ]).catch(console.error)
    }
  }, [activeTab])

  // Contact table useEffect hooks
  useEffect(() => {
    fetchContacts()
  }, [currentPage])

  useEffect(() => {
    fetchCampaigns()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchContacts()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Combine all connected accounts for sender tab
  const allConnectedAccounts = [
    ...connectedGmailAccounts,
    ...connectedMicrosoft365Accounts,
    ...connectedSmtpAccounts
  ]

  // Calculate statistics for sender tab
  const totalAccounts = allConnectedAccounts.length
  const activeWarmupCount = connectedGmailAccounts.filter(acc => acc.warmup_status === 'active').length
  const needAttentionCount = connectedGmailAccounts.filter(acc => acc.warmup_status === 'error' || acc.health_score < 60).length
  const avgScore = totalAccounts > 0 
    ? Math.round(
        allConnectedAccounts.reduce((sum, acc) => {
          const score = acc.health_score || 75 // Default score if not available
          return sum + score
        }, 0) / totalAccounts
      )
    : 0

  // Handle daily limit changes
  const handleDailyLimitChange = (accountId, newLimit) => {
    // Update the daily limit for the account
    setConnectedGmailAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, daily_limit: newLimit } : acc
    ))
    setConnectedMicrosoft365Accounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, daily_limit: newLimit } : acc
    ))
    setConnectedSmtpAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, daily_limit: newLimit } : acc
    ))
  }

  // Disconnect account functions
  const disconnectGmailAccount = async (accountId) => {
    try {
      // Delete from database
      const response = await fetch(`/api/campaigns/${campaign.id}/gmail-accounts?accountId=${accountId}`, {
        method: 'DELETE',
        credentials: "include"
      })

      if (response.ok) {
        // Update frontend state
        setConnectedGmailAccounts(prev => prev.filter(acc => acc.id !== accountId))
        setSelectedSenderAccounts(prev => prev.filter(id => id !== accountId))
        
      } else {
        throw new Error('Failed to disconnect account')
      }
    } catch (error) {
    }
  }

  const disconnectMicrosoft365Account = async (accountId) => {
    try {
      const response = await fetch(`/api/microsoft365/accounts?id=${accountId}`, {
        method: 'DELETE',
        credentials: "include"
      })

      if (response.ok) {
        // Remove from UI state
        setConnectedMicrosoft365Accounts(prev => prev.filter(acc => acc.id !== accountId))
      } else {
        const error = await response.json()
      }
    } catch (error) {
      console.error('Error disconnecting Microsoft 365 account:', error)
    }
  }

  const disconnectSmtpAccount = async (accountId) => {
    try {
      const response = await fetch(`/api/smtp/accounts?id=${accountId}`, {
        method: 'DELETE',
        credentials: "include"
      })

      if (response.ok) {
        // Remove from UI state
        setConnectedSmtpAccounts(prev => prev.filter(acc => acc.id !== accountId))
      } else {
        const error = await response.json()
      }
    } catch (error) {
      console.error('Error disconnecting SMTP account:', error)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className="w-full animate-in fade-in duration-500">
            {/* Clean Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-light text-gray-900 tracking-tight">{t('campaignManagement.settings.title')}</h1>
                <p className="text-gray-500 mt-2 font-light">{t('campaignManagement.settings.subtitle')}</p>
              </div>
              <div className="flex items-center">
                <Button 
                  onClick={saveSettings} 
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('campaignManagement.settings.saveSettings')}
                </Button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Sending Schedule Section */}
              <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-gray-900">{t('campaignManagement.settings.sendingSchedule.title')}</h2>
                      <p className="text-gray-500 text-sm mt-1">{t('campaignManagement.settings.sendingSchedule.subtitle')}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sending Days */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-4">{t('campaignManagement.settings.sendingSchedule.activeDays')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                          const isActive = activeDays.includes(day)
                          const dayKey = day.toLowerCase()
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                                isActive 
                                  ? 'bg-gray-900 text-white shadow-sm hover:bg-gray-800' 
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                              }`}
                              onClick={() => {
                                if (isActive) {
                                  setActiveDays(prev => prev.filter(d => d !== day))
                                } else {
                                  setActiveDays(prev => [...prev, day])
                                }
                              }}
                            >
                              {t(`campaignManagement.settings.days.${dayKey}`)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time Range */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 mb-4">{t('campaignManagement.settings.sendingSchedule.sendingHours')}</h4>
                      <div className="flex items-center gap-4">
                        <select 
                          value={sendingStartTime}
                          onChange={(e) => setSendingStartTime(e.target.value)}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0')
                            const ampm = i >= 12 ? 'PM' : 'AM'
                            const displayHour = i === 0 ? '12' : i > 12 ? (i - 12).toString().padStart(2, '0') : hour
                            const time = `${displayHour}:00 ${ampm}`
                            return (
                              <option key={time} value={time}>{time}</option>
                            )
                          })}
                        </select>
                        
                        <span className="text-gray-400 font-medium text-sm">{t('campaignManagement.settings.sendingSchedule.to')}</span>
                        
                        <select 
                          value={sendingEndTime}
                          onChange={(e) => setSendingEndTime(e.target.value)}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0')
                            const ampm = i >= 12 ? 'PM' : 'AM'
                            const displayHour = i === 0 ? '12' : i > 12 ? (i - 12).toString().padStart(2, '0') : hour
                            const time = `${displayHour}:00 ${ampm}`
                            return (
                              <option key={time} value={time}>{time}</option>
                            )
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Sender Information Section */}
              <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-gray-900">{t('campaignManagement.settings.senderInformation.title')}</h2>
                      <p className="text-gray-500 text-sm mt-1">{t('campaignManagement.settings.senderInformation.subtitle')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-3">{t('campaignManagement.settings.senderInformation.firstName')}</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        placeholder={t('campaignManagement.settings.placeholders.firstName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-3">{t('campaignManagement.settings.senderInformation.lastName')}</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        placeholder={t('campaignManagement.settings.placeholders.lastName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-3">{t('campaignManagement.settings.senderInformation.company')}</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        placeholder={t('campaignManagement.settings.placeholders.company')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-3">{t('campaignManagement.settings.senderInformation.website')}</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-300"
                        placeholder={t('campaignManagement.settings.placeholders.website')}
                      />
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-6">{t('campaignManagement.settings.senderInformation.emailSignature')}</h4>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                      <div 
                        ref={signatureEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="p-6 min-h-[180px] outline-none bg-white m-1 rounded-xl"
                        dangerouslySetInnerHTML={{ __html: emailSignature }}
                        onInput={(e) => {
                          const target = e.currentTarget
                          setEmailSignature(target.innerHTML)
                        }}
                      />
                      
                      {/* Formatting Toolbar */}
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            document.execCommand('bold', false)
                            if (signatureEditorRef.current) {
                              setEmailSignature(signatureEditorRef.current.innerHTML)
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            document.execCommand('italic', false)
                            if (signatureEditorRef.current) {
                              setEmailSignature(signatureEditorRef.current.innerHTML)
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            document.execCommand('underline', false)
                            if (signatureEditorRef.current) {
                              setEmailSignature(signatureEditorRef.current.innerHTML)
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt('Enter URL:', 'https://')
                            if (url) {
                              document.execCommand('createLink', false, url)
                              if (signatureEditorRef.current) {
                                setEmailSignature(signatureEditorRef.current.innerHTML)
                              }
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        );
      
      case 'sender':
        return (
          <CampaignSenderSelection
            campaignId={campaign?.id || ''}
            onSelectionChange={(selectedSenders) => {
              console.log('🔄 Sender selection changed:', selectedSenders)
              console.log('🔄 Selected sender IDs:', selectedSenders)
              setSelectedSenderAccounts(selectedSenders)
              // Note: Manual save is now handled by the Save button in the bottom panel for guided mode
            }}
            initialSelectedSenders={selectedSenderAccounts}
            isGuidedMode={isGuidedFlow}
            showDomainSetupModal={showDomainSetupModal}
            onShowDomainSetupModal={setShowDomainSetupModal}
            showDomainInstructions={showDomainInstructions}
            onShowDomainInstructions={setShowDomainInstructions}
            pendingDomainData={pendingDomainData}
            showSenderManagement={showSenderManagement}
            onShowSenderManagement={setShowSenderManagement}
            selectedDomainForSenders={selectedDomainForSenders}
            onDomainSelected={(domainId) => {
              setSelectedDomainForSenders(domainId)
            }}
            onDomainAdded={(newDomain) => {
              console.log('✅ Domain added in campaign dashboard component handler:', newDomain)
              console.log('🔄 Setting pending domain data and showing instructions...')
              // Store domain data and show instructions
              setPendingDomainData(newDomain)
              setShowDomainInstructions(true)
              setSelectedDomainForSenders(newDomain.id) // Set the domain for sender management
              console.log('🔄 State updated - showDomainInstructions should now be true')
              // Refresh validation to check if domains are now available
              validateCampaignRequirements()
            }}
          />
        );

      case 'target':
        return (
          <TargetTab
            campaignId={campaign?.id || 0}
            onContactsImported={validateCampaignRequirements}
          />
        );


      case 'sequence':
        return (
          <div className="w-full animate-in fade-in duration-500">
            {/* Clean Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-light text-gray-900 tracking-tight">{t('campaignManagement.sequence.title')}</h1>
                <p className="text-gray-500 mt-2 font-light">{t('campaignManagement.sequence.subtitle')}</p>
              </div>
              <div className="flex items-center">
                <Button 
                  onClick={saveSequence} 
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl"
                  disabled={isSavingSequences}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isSavingSequences ? t('campaignManagement.sequence.saving') : t('campaignManagement.sequence.saveSequence')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Sequence Timeline Sidebar */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl border border-gray-100/50 p-8 min-w-0">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-gray-900">{t('campaignManagement.sequence.campaignTimeline.title')}</h2>
                      <p className="text-gray-500 text-sm mt-1">{t('campaignManagement.sequence.campaignTimeline.subtitle')}</p>
                    </div>
                  </div>
                  
                  {/* Sequence 1 */}
                  <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">{t('campaignManagement.sequence.sequences.initialOutreach')}</h4>
                        <div className="text-xs text-gray-500">
                          <div className="flex items-start gap-2">
                            <span className="flex-1 break-words">{t('campaignManagement.sequence.sequences.subject', { subject: steps.find(s => s.sequence === 1)?.subject || t('campaignManagement.sequence.sequences.noSubject') })}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 flex-shrink-0" style={{ color: 'rgb(87, 140, 255)' }}
                              onClick={() => {
                                const newSubject = prompt(t('campaignManagement.sequence.editor.editSubjectPrompt', { sequence: t('campaignManagement.sequence.sequences.initialOutreach') }), steps.find(s => s.sequence === 1)?.subject || '')
                                if (newSubject !== null) updateSequenceSubject(1, newSubject)
                              }}
                              title="Edit sequence subject"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {steps.filter(s => s.sequence === 2).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 opacity-70 hover:opacity-100"
                            onClick={() => deleteSequence(1)}
                            title="Delete entire sequence"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {steps.filter(step => step.sequence === 1).map((step, index) => (
                        <div key={step.id} className="relative group">
                          <div
                            onClick={() => selectStep(step.id)}
                            className={`p-4 rounded-lg cursor-pointer transition-all ${
                              activeStepId === step.id
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'bg-gray-50 hover:bg-blue-25'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className={`font-medium ${
                                  activeStepId === step.id ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {step.title}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {step.timing === 0 ? t('campaignManagement.sequence.steps.immediately') : t('campaignManagement.sequence.steps.day', { timing: step.timing })}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {/* Hover Actions */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  {steps.filter(s => s.sequence === 1).length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteStep(step.id)
                                      }}
                                      title="Remove this email"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                                  activeStepId === step.id
                                    ? 'bg-white border-2 border-blue-500 text-blue-700 shadow-sm'
                                    : 'bg-gray-50 border border-gray-300 text-gray-600 hover:bg-white hover:border-gray-400'
                                }`}>
                                  {step.sequenceStep}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Email Button for Sequence 1 */}
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => addStep(1)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('campaignManagement.sequence.buttons.addEmail')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Gap Indicator - only show if both sequences exist */}
                  {steps.filter(s => s.sequence === 1).length > 0 && steps.filter(s => s.sequence === 2).length > 0 && (
                    <div 
                      className="text-center my-6 py-4 border-t border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => {
                        const seq1End = Math.max(...steps.filter(s => s.sequence === 1).map(s => s.timing))
                        const seq2Start = Math.min(...steps.filter(s => s.sequence === 2).map(s => s.timing))
                        const currentGap = seq2Start - seq1End
                        const newGap = prompt(`Enter waiting period (days):`, currentGap.toString())
                        if (newGap && !isNaN(parseInt(newGap)) && parseInt(newGap) >= 0) {
                          updateGap(parseInt(newGap))
                        }
                      }}
                      title={t('campaignManagement.sequence.gap.clickToEdit')}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const seq1End = Math.max(...steps.filter(s => s.sequence === 1).map(s => s.timing))
                            const seq2Start = Math.min(...steps.filter(s => s.sequence === 2).map(s => s.timing))
                            const gap = seq2Start - seq1End
                            return t('campaignManagement.sequence.gap.waitingPeriod', { gap })
                          })()}
                        </div>
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('campaignManagement.sequence.gap.clickToEdit')}
                      </div>
                    </div>
                  )}

                  {/* Add Sequence 2 button - only show if sequence 2 doesn't exist */}
                  {steps.filter(s => s.sequence === 2).length === 0 && (
                    <div className="text-center my-8 py-6 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="default"
                        className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 px-4 py-2 w-full sm:w-auto whitespace-nowrap"
                        onClick={() => addStep(2)}
                      >
                        <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{t('campaignManagement.sequence.buttons.addFollowUpSequence')}</span>
                      </Button>
                    </div>
                  )}

                  {/* Sequence 2 - only show if it has steps */}
                  {steps.filter(s => s.sequence === 2).length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-green-900 mb-2">{t('campaignManagement.sequence.sequences.followUpOutreach')}</h4>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>{t('campaignManagement.sequence.sequences.subject', { subject: steps.find(s => s.sequence === 2)?.subject || t('campaignManagement.sequence.sequences.noSubject') })}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 text-green-600 hover:bg-green-100"
                              onClick={() => {
                                const newSubject = prompt(t('campaignManagement.sequence.editor.editSubjectPrompt', { sequence: t('campaignManagement.sequence.sequences.followUpOutreach') }), steps.find(s => s.sequence === 2)?.subject || '')
                                if (newSubject !== null) updateSequenceSubject(2, newSubject)
                              }}
                              title="Edit sequence subject"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 opacity-70 hover:opacity-100"
                          onClick={() => deleteSequence(2)}
                          title="Delete entire sequence"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {steps.filter(step => step.sequence === 2).map((step, index) => (
                          <div key={step.id} className="relative group">
                            <div
                              onClick={() => selectStep(step.id)}
                              className={`p-4 rounded-lg cursor-pointer transition-all ${
                                activeStepId === step.id
                                  ? 'bg-green-50 border-l-4 border-green-500'
                                  : 'bg-gray-50 hover:bg-green-25'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className={`font-medium ${
                                    activeStepId === step.id ? 'text-green-900' : 'text-gray-900'
                                  }`}>
                                    {step.title}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    Day {step.timing}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {/* Hover Actions */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                    {steps.filter(s => s.sequence === 2).length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteStep(step.id)
                                        }}
                                        title="Remove this email"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                                    activeStepId === step.id
                                      ? 'bg-white border-2 border-emerald-500 text-emerald-700 shadow-sm'
                                      : 'bg-gray-50 border border-gray-300 text-gray-600 hover:bg-white hover:border-gray-400'
                                  }`}>
                                    {step.sequenceStep}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Add Email Button for Sequence 2 */}
                        <div className="mt-4 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                            onClick={() => addStep(2)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('campaignManagement.sequence.buttons.addEmail')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Editor */}
              <div className="lg:col-span-3">
                {steps.length > 0 && activeStepId && (
                  (() => {
                    const activeStep = steps.find(s => s.id === activeStepId)
                    if (!activeStep) return null
                    
                    return (
                      <div className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
                        {/* Step Header */}
                        <div className="p-8 border-b border-gray-100/60">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm transition-all duration-300 ${
                              activeStep.sequence === 1 
                                ? 'bg-white border-2 border-blue-500 text-blue-700' 
                                : 'bg-white border-2 border-emerald-500 text-emerald-700'
                            }`}>
                              {activeStep.sequenceStep}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {activeStep.title}
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <span>{activeStep.sequence === 1 ? t('campaignManagement.sequence.sequences.initialOutreach') : t('campaignManagement.sequence.sequences.followUpOutreach')}</span>
                                <span>•</span>
                                <span>{activeStep.timing === 0 ? t('campaignManagement.sequence.steps.immediately') : t('campaignManagement.sequence.steps.day', { timing: activeStep.timing })}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step Configuration */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                 {t('campaignManagement.sequence.editor.sequenceSubjectLine')}
                              </label>
                              <Input
                                value={activeStep.subject || ''}
                                onChange={(e) => updateSequenceSubject(activeStep.sequence, e.target.value)}
                                placeholder={t('campaignManagement.sequence.editor.subjectPlaceholder')}
                                className="w-full h-11 text-sm border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
                              />
                              <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                <span>{t('campaignManagement.sequence.editor.sharedAcrossEmails', { sequence: activeStep.sequence === 1 ? t('campaignManagement.sequence.sequences.initialOutreach') : t('campaignManagement.sequence.sequences.followUpOutreach') })}</span>
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                 {activeStep.sequence === 1 ? t('campaignManagement.sequence.editor.sendDelay') : t('campaignManagement.sequence.editor.sendSchedule')}
                              </label>
                              {activeStep.sequence === 1 ? (
                                <Select
                                  value={(() => {
                                    // For first email in sequence, show actual timing
                                    if (activeStep.sequenceStep === 1) {
                                      return activeStep.timing.toString()
                                    }
                                    // Calculate relative timing from previous step for subsequent emails
                                    const prevSteps = steps.filter(s => s.sequence === 1 && s.sequenceStep < activeStep.sequenceStep)
                                    const baseTime = prevSteps.length > 0 ? Math.max(...prevSteps.map(s => s.timing)) : 0
                                    const relativeTiming = activeStep.timing - baseTime
                                    // Default to 3 days if timing is 0 (for emails after the first one)
                                    return relativeTiming === 0 && activeStep.sequenceStep > 1 ? "3" : relativeTiming.toString()
                                  })()}
                                  onValueChange={(value) => {
                                    const newTiming = parseInt(value)
                                    if (activeStep.sequenceStep === 1) {
                                      // For first email, set timing directly
                                      updateStepTiming(activeStep.id, newTiming)
                                    } else {
                                      // For subsequent emails, add to previous email's timing
                                      const prevSteps = steps.filter(s => s.sequence === 1 && s.sequenceStep < activeStep.sequenceStep)
                                      const baseTime = prevSteps.length > 0 ? Math.max(...prevSteps.map(s => s.timing)) : 0
                                      updateStepTiming(activeStep.id, baseTime + newTiming)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-11 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {activeStep.sequenceStep === 1 ? (
                                      <>
                                        <SelectItem value="0">🚀 Immediately</SelectItem>
                                        <SelectItem value="1">📅 After 1 day</SelectItem>
                                        <SelectItem value="2">📅 After 2 days</SelectItem>
                                        <SelectItem value="3">📅 After 3 days</SelectItem>
                                        <SelectItem value="7">📅 After 1 week</SelectItem>
                                      </>
                                    ) : (
                                      <>
                                        <SelectItem value="1">📅 1 day after previous</SelectItem>
                                        <SelectItem value="2">📅 2 days after previous</SelectItem>
                                        <SelectItem value="3">📅 3 days after previous</SelectItem>
                                        <SelectItem value="4">📅 4 days after previous</SelectItem>
                                        <SelectItem value="5">📅 5 days after previous</SelectItem>
                                        <SelectItem value="7">📅 1 week after previous</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="space-y-3">
                                  <Input
                                    type="number"
                                    value={activeStep.timing}
                                    onChange={(e) => updateStepTiming(activeStep.id, parseInt(e.target.value) || 0)}
                                    min="90"
                                    className="w-full h-11 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
                                    placeholder="Days from start"
                                  />
                                  <p className="text-xs text-gray-500 flex items-center space-x-1">
                                    <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                                    <span>{t('campaignManagement.sequence.editor.minimumDays')}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Email Editor */}
                        <div className="p-6">
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                {t('campaignManagement.sequence.editor.emailContent')}
                              </label>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowPreviewModal(true)
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t('campaignManagement.sequence.editor.preview')}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Simple Email Editor */}
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                              {/* Toolbar */}
                              <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={formatBold}
                                  title="Bold (**text**)"
                                  disabled={showCodeView}
                                  className={showCodeView ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  <Bold className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={formatItalic}
                                  title="Italic (*text*)"
                                  disabled={showCodeView}
                                  className={showCodeView ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  <Italic className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={formatUnderline}
                                  title="Underline (<u>text</u>)"
                                  disabled={showCodeView}
                                  className={showCodeView ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  <Underline className="w-4 h-4" />
                                </Button>
                                <div className="border-l border-gray-300 h-4 mx-2"></div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={insertLink}
                                  title="Insert Link"
                                  disabled={showCodeView}
                                  className={showCodeView ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  <Link className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={toggleCodeView}
                                  title={showCodeView ? "Switch to Rich Text View" : "Switch to HTML Code View"}
                                  className={showCodeView ? "" : ""}
                                  style={showCodeView ? { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' } : {}}
                                >
                                  <Code className="w-4 h-4" />
                                </Button>
                                <div className="flex-1"></div>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  {t('campaignManagement.sequence.editor.variables')}
                                </Button>
                              </div>
                              
                              {/* Content Editor */}
                              {showCodeView ? (
                                // HTML Source View
                                <Textarea
                                  value={activeStep.content || 'Hi {{firstName}},<br/><br/>I hope this email finds you well! I wanted to reach out because...<br/><br/>Best regards,<br/>{{senderName}}'}
                                  onChange={(e) => updateStepContent(e.target.value)}
                                  className="min-h-[300px] p-4 border-0 focus:ring-0 focus:outline-none resize-none text-sm font-mono leading-relaxed bg-gray-50"
                                  placeholder="HTML source code..."
                                />
                              ) : (
                                // Rich Text View
                                <div
                                  ref={editorRef}
                                  contentEditable
                                  onInput={(e) => {
                                    const htmlContent = e.currentTarget.innerHTML
                                    updateStepContent(htmlContent)
                                  }}
                                  onKeyDown={(e) => {
                                    // Handle Enter key to insert <br> instead of <div>
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      const selection = window.getSelection()
                                      if (selection && selection.rangeCount > 0) {
                                        const range = selection.getRangeAt(0)
                                        const br = document.createElement('br')
                                        range.insertNode(br)
                                        range.setStartAfter(br)
                                        range.collapse(true)
                                        selection.removeAllRanges()
                                        selection.addRange(range)
                                      }
                                    }
                                  }}
                                  className="min-h-[300px] p-4 border-0 focus:ring-0 focus:outline-none resize-none text-sm leading-relaxed"
                                  style={{
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word'
                                  }}
                                  data-step-id={activeStepId}
                                  suppressContentEditableWarning={true}
                                >
                                  {activeStep.content ? (
                                    <span dangerouslySetInnerHTML={{ __html: activeStep.content }} />
                                  ) : (
                                    <>
                                      Hi {'{{firstName}}'}, <br/><br/>
                                      I hope this email finds you well! I wanted to reach out because...<br/><br/>
                                      Best regards,<br/>
                                      {'{{senderName}}'}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Variable Helpers */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => insertVariableIntoEditor('{{firstName}}')}
                              >
                                {'{{firstName}}'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => insertVariableIntoEditor('{{lastName}}')}
                              >
                                {'{{lastName}}'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => insertVariableIntoEditor('{{company}}')}
                              >
                                {'{{company}}'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => insertVariableIntoEditor('{{email}}')}
                              >
                                {'{{email}}'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                onClick={() => insertVariableIntoEditor('{{senderName}}')}
                              >
                                {'{{senderName}}'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer text-xs hover:bg-gray-100 hover:border-gray-400 transition-colors bg-gray-50"
                                onClick={() => {
                                  // Insert the signature at the end of the current content
                                  const currentContent = activeStep?.content || ''
                                  const newContent = currentContent + emailSignature
                                  updateStepContent(newContent)
                                  if (editorRef.current) {
                                    editorRef.current.innerHTML = newContent
                                  }
                                }}
                              >
                                <FileText className="w-3 h-3 mr-1 inline" />
                                {t('campaignManagement.sequence.editor.insertSignature')}
                              </Badge>
                            </div>
                          </div>

                          {/* A/B Testing */}
                          {activeStep.variants > 1 && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  <span className="text-sm font-medium text-blue-900">
                                    A/B Testing Enabled
                                  </span>
                                </div>
                                <Badge style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>
                                  {activeStep.variants} Variants
                                </Badge>
                              </div>
                              <p className="text-sm text-blue-700 mt-2">
                                This step will split test across {activeStep.variants} different versions to optimize performance.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}
                
                {/* Empty State */}
                {steps.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Mail className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sequence Steps</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Get started by creating your first email step. You can add multiple steps to create a drip campaign.
                    </p>
                    <Button onClick={addStep} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Step
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Modal */}
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
              <DialogContent className="sm:max-w-[500px] rounded-3xl border border-gray-100 p-0 overflow-hidden">
                <div className="p-6 pb-0">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold text-gray-900">
                        Email Preview
                      </DialogTitle>
                      <p className="text-sm text-gray-500">
                        Preview and test your email
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 pb-4">
                  {(() => {
                    const activeStep = steps.find(s => s.id === activeStepId)
                    if (!activeStep) return null
                    
                    // Simple variable replacement for preview
                    const previewSubject = activeStep.subject
                      ?.replace(/\{\{firstName\}\}/g, variables.firstName)
                      ?.replace(/\{\{lastName\}\}/g, 'Doe')
                      ?.replace(/\{\{company\}\}/g, variables.companyName)
                      ?.replace(/\{\{senderName\}\}/g, `${firstName} ${lastName}`)
                    
                    const previewContent = activeStep.content
                      ?.replace(/\{\{firstName\}\}/g, variables.firstName)
                      ?.replace(/\{\{lastName\}\}/g, 'Doe')
                      ?.replace(/\{\{company\}\}/g, variables.companyName)
                      ?.replace(/\{\{email\}\}/g, 'john@example.com')
                      ?.replace(/\{\{senderName\}\}/g, `${firstName} ${lastName}`)
                    
                    return (
                      <div className="space-y-4">
                        {/* Email Preview */}
                        <div className="bg-gray-50/50 rounded-xl p-4">
                          <div className="mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{previewSubject || 'No subject'}</p>
                          </div>
                          <div className="border-t border-gray-200 pt-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content</span>
                            <div className="whitespace-pre-wrap text-sm text-gray-900 mt-1 max-h-32 overflow-y-auto">
                              {previewContent || 'No content'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Test Email Section */}
                        <div className="bg-blue-50/50 rounded-xl p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Send className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">Send Test Email</span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Input
                                type="email"
                                value={testModalEmail}
                                onChange={(e) => setTestModalEmail(e.target.value)}
                                placeholder="test@example.com"
                                className="w-full text-sm"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                onClick={sendTestEmailGeneric}
                                disabled={testModalLoading || !testModalEmail.trim()}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                              >
                                <Send className="w-3 h-3 mr-1.5" />
                                {testModalLoading ? 'Sending...' : 'Send Test'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </DialogContent>
            </Dialog>

          </div>
        );

      default:
        return null;
    }
  }

  // Show loading spinner while data is being fetched
  if (isLoadingCampaignData || !translationsReady) {
    return (
      <main className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">
            {!translationsReady ? 'Loading Campaign' : t('campaignManagement.loading.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {!translationsReady ? 'Setting up your campaign dashboard' : t('campaignManagement.loading.subtitle')}
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <style jsx>{`
        @keyframes vibrate {
          0% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          50% { transform: translateX(1px); }
          75% { transform: translateX(-1px); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Campaign Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="h-10 w-10 hover:bg-white/50 rounded-2xl"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={handleNameKeyPress}
                          onBlur={handleSaveName}
                          className="text-4xl font-light text-gray-900 tracking-tight border-none p-0 h-auto bg-transparent focus:ring-0 focus:outline-none"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveName}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl p-2"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                            <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl p-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer group" onClick={handleStartEditingName}>
                        <h1 className="text-4xl font-light text-gray-900 tracking-tight">{campaign.name}</h1>
                        <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500 font-light">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {(() => {
                        const typeValue = campaign?.type || 'Email'
                        const result = t('campaignManagement.header.campaignType', { type: typeValue })
                        // If translation fails (shows placeholder), use English fallback
                        if (result.includes('{type}')) {
                          return `${typeValue} Campaign`
                        }
                        return result
                      })()}
                    </span>
                    <Badge 
                      variant="outline"
                      className={`${
                        campaign?.status === 'Active' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : campaign?.status === 'Paused'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      } border rounded-full px-3 py-1`}
                    >
                      {campaign?.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Right side actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleDeleteCampaign}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-2xl px-4 py-2 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('campaigns.delete')}
                </Button>
              </div>
            </div>
          </div>


          {/* Navigation Tabs */}
          {!isGuidedFlow && (
            <div className="flex gap-2 overflow-x-auto pb-2">
            <Button 
              variant={activeTab === 'target' ? 'default' : 'outline'}
              onClick={isGuidedFlow ? undefined : () => handleTabChange('target')}
              disabled={isGuidedFlow}
              className={`${
                activeTab === 'target' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              } px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl whitespace-nowrap ${
                isGuidedFlow ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <Target className="w-4 h-4 mr-2" />
              {t('campaignManagement.tabs.target')}
            </Button>
            <Button 
              variant={activeTab === 'sequence' ? 'default' : 'outline'}
              onClick={isGuidedFlow ? undefined : () => handleTabChange('sequence')}
              disabled={isGuidedFlow}
              className={`${
                activeTab === 'sequence' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              } px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl whitespace-nowrap ${
                isGuidedFlow ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              {t('campaignManagement.tabs.sequence')}
            </Button>
            <Button 
              variant={activeTab === 'sender' ? 'default' : 'outline'}
              onClick={isGuidedFlow ? undefined : () => handleTabChange('sender')}
              disabled={isGuidedFlow}
              className={`${
                activeTab === 'sender' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              } px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl whitespace-nowrap ${
                isGuidedFlow ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <Send className="w-4 h-4 mr-2" />
              {t('campaignManagement.tabs.sender')}
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'}
              onClick={isGuidedFlow ? undefined : () => handleTabChange('settings')}
              disabled={isGuidedFlow}
              className={`${
                activeTab === 'settings' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              } px-5 py-2.5 font-medium transition-all duration-300 rounded-2xl whitespace-nowrap ${
                isGuidedFlow ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('campaignManagement.tabs.settings')}
            </Button>
          </div>
          )}

          {/* Tab Content */}
          <div className={`flex-1 ${isGuidedFlow ? 'pb-32' : ''}`}>
            {renderTabContent()}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirm.isOpen} onOpenChange={(open) => 
          setDeleteConfirm(prev => ({ ...prev, isOpen: open }))
        }>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>
                {deleteConfirm.type === 'sequence' ? t('campaignManagement.dialogs.delete.deleteSequence') : t('campaignManagement.dialogs.delete.deleteStep')}
              </DialogTitle>
              <DialogDescription>
                {deleteConfirm.type === 'sequence' 
                  ? t('campaignManagement.dialogs.delete.sequenceConfirmation', { name: deleteConfirm.item?.name })
                  : t('campaignManagement.dialogs.delete.stepConfirmation')
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
              >
                {t('button.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (deleteConfirm.onConfirm) {
                    deleteConfirm.onConfirm()
                  }
                  setDeleteConfirm({ isOpen: false, type: 'sequence', item: null, onConfirm: null })
                }}
                className="bg-red-600 hover:bg-red-700 rounded-2xl"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Campaign Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t('campaignManagement.dialogs.preview.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {steps
                .sort((a, b) => {
                  // Sort by timing first (ascending), then by sequence step as secondary sort
                  if (a.timing !== b.timing) {
                    return a.timing - b.timing;
                  }
                  return (a.sequenceStep || a.id) - (b.sequenceStep || b.id);
                })
                .map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{step.title}</h3>
                    <span className="text-sm text-gray-500">
                      {step.timing === 0 ? t('campaignManagement.dialogs.preview.immediately') : t('campaignManagement.dialogs.preview.waitDays', { timing: step.timing })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {t('campaignManagement.dialogs.preview.subject', { subject: step.subject })}
                  </div>
                  <div 
                    className="prose prose-sm max-w-none"
                    style={{ whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ 
                      __html: step.content?.replace(/\n/g, '<br/>') || '' 
                    }}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Campaign Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {t('campaignManagement.dialogs.deleteCampaign.title')}
              </DialogTitle>
              <DialogDescription>
                {t('campaignManagement.dialogs.deleteCampaign.confirmation', { name: campaign?.name })}
                <br />
                <span className="text-red-600 font-medium">{t('campaignManagement.dialogs.deleteCampaign.warning')}</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
              >
                {t('campaignManagement.dialogs.delete.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteCampaign}
                className="bg-red-600 hover:bg-red-700 rounded-2xl"
              >
                {t('campaignManagement.dialogs.deleteCampaign.deleteCampaign')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Advanced Campaign Popup */}
        <AddCampaignPopup 
          isOpen={showAdvancedPopup}
          onClose={() => setShowAdvancedPopup(false)}
          onComplete={handleAdvancedCampaignComplete}
        />

        {/* Guided Flow Bottom Frame */}
        {isGuidedFlow && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100/50 p-6 z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                {/* Progress indicator */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    {(() => {
                      const params = { current: guidedFlowStep + 1, total: guidedFlowSteps.length }
                      const result = t('campaignManagement.guidedFlow.progress.stepOf', params)
                      // If translation fails (shows placeholders), use English fallback
                      if (result.includes('{current}') || result.includes('{total}')) {
                        return `Step ${params.current} of ${params.total}`
                      }
                      return result
                    })()}
                  </div>
                  <div className="w-64">
                    <Progress 
                      value={((guidedFlowStep + 1) / guidedFlowSteps.length) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Current step info */}
                <div className="flex-1 mx-8 text-center">
                  <div className="text-lg font-medium text-gray-900">
                    {guidedFlowSteps[guidedFlowStep]?.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {guidedFlowSteps[guidedFlowStep]?.description}
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleGuidedPrevious}
                    disabled={guidedFlowStep === 0}
                    className="border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('campaignManagement.guidedFlow.buttons.previous')}
                  </Button>
                  
                  {guidedFlowStep === guidedFlowSteps.length - 1 ? (
                    <Button
                      onClick={handleLaunchCampaign}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      {t('campaignManagement.guidedFlow.buttons.launchCampaign')}
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        // For sequence tab, save sequences then handle the confirmation dialog
                        if (guidedFlowSteps[guidedFlowStep]?.tab === 'sequence') {
                          saveSequence() // Save sequences first
                          handleGuidedNext() // This will trigger confirmation dialog
                        } else if (guidedFlowSteps[guidedFlowStep]?.tab === 'sender') {
                          // For sender tab, save with validation checks
                          const saveSuccess = await saveSenderAccounts()
                          if (saveSuccess) {
                            handleGuidedNext() // Only proceed if save was successful
                          }
                        } else {
                          // For other tabs, treat as Save button for draft campaigns
                          saveCampaignData('all')
                          handleGuidedNext() // This will trigger validation
                        }
                      }}
                      disabled={validationLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 disabled:opacity-50"
                    >
                      {validationLoading ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t('campaignManagement.guidedFlow.buttons.checking')}
                        </>
                      ) : guidedFlowSteps[guidedFlowStep]?.tab === 'sequence' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {t('campaignManagement.guidedFlow.buttons.saveNext')}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {t('button.save')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warmup Warning Dialog */}
      <Dialog open={showWarmupWarning} onOpenChange={setShowWarmupWarning}>
        <DialogContent className="max-w-4xl rounded-3xl border border-gray-100 p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {t('senderManagement.warmupWarningDialog.title')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('senderManagement.warmupWarningDialog.description')}
                </DialogDescription>
              </div>
            </div>
          </div>
          
          <div className="px-6 pb-4">
            <div className="bg-orange-50/50 rounded-xl p-3 mb-3">
              <p className="text-xs font-medium text-orange-900 mb-2">{t('senderManagement.warmupWarningDialog.accountsBelowThreshold')}</p>
              <div className="space-y-1.5">
                {lowHealthSenders.map((sender, index) => {
                  const getScoreColor = (score: number) => {
                    if (score >= 80) return 'text-green-700 bg-green-100'
                    if (score >= 60) return 'text-yellow-700 bg-yellow-100'
                    return 'text-red-700 bg-red-100'
                  }
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2">{sender.email}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getScoreColor(sender.score)}`}>
                        {sender.score}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
              <p className="mb-2"><span className="font-semibold">{t('senderManagement.warmupWarningDialog.chooseApproach')}</span></p>
              <ul className="space-y-1 text-xs">
                <li>• {t('senderManagement.warmupWarningDialog.autoWarmupOption')}</li>
                <li>• {t('senderManagement.warmupWarningDialog.warmupOnlyOption')}</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-3 p-6 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => handleWarmupDecision('warmup_only')}
              className="flex-1 h-10 rounded-xl text-sm"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              {t('senderManagement.warmupWarningDialog.warmupOnlyButton')}
            </Button>
            <Button
              onClick={() => handleWarmupDecision('auto_warmup')}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              {t('senderManagement.warmupWarningDialog.autoWarmupButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Requirements Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {t('campaignManagement.validation.requirementsNotMet')}
            </DialogTitle>
            <DialogDescription>
              {t('campaignManagement.validation.pleaseComplete')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-4">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <XCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-amber-800">{error}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowValidationDialog(false)
                setValidationErrors([])
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('campaignManagement.validation.understand')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliverability Improvement Dialog - Sleek Design */}
      <Dialog open={showDeliverabilityDialog} onOpenChange={setShowDeliverabilityDialog}>
        <DialogContent className="max-w-sm bg-white rounded-3xl border-0 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="text-center p-8 pb-6">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-gray-600" />
            </div>
            <DialogTitle className="text-xl font-medium text-gray-900 mb-2">
              {t('senderManagement.healthScoreDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              {t('senderManagement.healthScoreDialog.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-8 pb-8">
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-medium text-gray-900 mb-1">
                  {lowDeliverabilityAccounts.length === 1 
                    ? t('senderManagement.healthScoreDialog.accountCount', { count: lowDeliverabilityAccounts.length })
                    : t('senderManagement.healthScoreDialog.accountCountPlural', { count: lowDeliverabilityAccounts.length })
                  }
                </div>
                <div className="text-sm text-gray-500">{t('senderManagement.healthScoreDialog.needEnhancement')}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeliverabilityDialog(false)
                  setLowDeliverabilityAccounts([])
                }}
                className="flex-1 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl py-3 font-medium"
              >
                {t('button.cancel')}
              </Button>
              <Button
                onClick={proceedWithSenderSave}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl py-3 border-0 font-medium"
              >
                {t('senderManagement.healthScoreDialog.enhanceButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sequence Confirmation Dialog */}
      <Dialog open={showSequenceConfirmDialog} onOpenChange={setShowSequenceConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('campaignManagement.dialogs.sequenceProgress.title')}</DialogTitle>
            <DialogDescription>
              {t('campaignManagement.dialogs.sequenceProgress.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSequenceConfirmDialog(false)
                setPendingNextStep(null)
              }}
            >
              {t('campaignManagement.dialogs.sequenceProgress.cancel')}
            </Button>
            <Button
              onClick={() => {
                setShowSequenceConfirmDialog(false)
                if (pendingNextStep !== null) {
                  // Proceed directly without validation - sequence confirmation allows progression
                  setGuidedFlowStep(pendingNextStep)
                  setActiveTab(guidedFlowSteps[pendingNextStep].tab)
                  
                  // Save the progress to localStorage
                  if (campaign?.id) {
                    localStorage.setItem(`campaign-${campaign.id}-last-tab`, guidedFlowSteps[pendingNextStep].tab)
                    localStorage.setItem(`campaign-${campaign.id}-guided-step`, pendingNextStep.toString())
                  }
                  setPendingNextStep(null)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('campaignManagement.dialogs.sequenceProgress.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Account Selected Dialog - Sleek Design */}
      <Dialog open={showNoAccountSelectedDialog} onOpenChange={setShowNoAccountSelectedDialog}>
        <DialogContent className="max-w-sm bg-white rounded-3xl border-0 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="text-center p-8 pb-6">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-gray-600" />
            </div>
            <DialogTitle className="text-xl font-medium text-gray-900 mb-2">
              Select Sender Account
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Choose at least one account to proceed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-8 pb-8">
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-medium text-gray-900 mb-1">
                  0 accounts
                </div>
                <div className="text-sm text-gray-500">selected</div>
              </div>
            </div>

            <Button
              onClick={() => setShowNoAccountSelectedDialog(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-2xl py-3 border-0 font-medium"
            >
              Select Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warm-up Info Dialog - Sleek Design */}
      <Dialog open={showWarmupInfoDialog} onOpenChange={setShowWarmupInfoDialog}>
        <DialogContent className="max-w-sm bg-white rounded-3xl border-0 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="text-center p-8 pb-6">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-gray-600" />
            </div>
            <DialogTitle className="text-xl font-medium text-gray-900 mb-2">
              Warm-up Started
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              We'll optimize your accounts for better deliverability.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-8 pb-8">
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-medium text-gray-900 mb-1">
                  Optimization
                </div>
                <div className="text-sm text-gray-500">in progress</div>
              </div>
            </div>

            <Button
              onClick={() => setShowWarmupInfoDialog(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-2xl py-3 border-0 font-medium"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Domain Setup Modal */}
      <DomainSetupModal
        isOpen={showDomainSetupModal}
        onClose={() => setShowDomainSetupModal(false)}
        onDomainAdded={(newDomain) => {
          console.log('✅ Domain added in campaign dashboard modal handler:', newDomain)
          // Store domain data and show instructions
          setPendingDomainData(newDomain)
          setShowDomainInstructions(true)
          setShowDomainSetupModal(false)
          // Refresh validation to check if domains are now available
          validateCampaignRequirements()
        }}
      />
    </>
  )
}
