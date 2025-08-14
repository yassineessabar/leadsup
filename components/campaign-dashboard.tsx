"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Calendar, ChevronDown, Eye, Play, Pause, MoreHorizontal, Plus, Zap, Search, Download, Upload, Mail, Phone, ChevronLeft, ChevronRight, Send, Trash2, Edit2, Check, X, Settings, Users, FileText, Filter, Building2, User, Target, Database, Linkedin, MapPin, Tag, UserCheck, Users2, UserCog, AlertTriangle, Clock, Cog, CheckCircle, XCircle, Bold, Italic, Underline, Type, Link, Image, Smile, Code, BarChart, ExternalLink, Inbox, Archive, Reply, Forward, Rocket, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import AddCampaignPopup from "./add-campaign-popup"
import { format } from "date-fns"
import AutomationSettings from "@/components/automation-settings"
import CampaignSenderSelection from "./campaign-sender-selection"
import { useScrapingUpdates } from "@/hooks/use-scraping-updates"

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

export default function CampaignDashboard({ campaign, onBack, onDelete, onStatusUpdate, onNameUpdate, initialTab = "contacts" }: CampaignDashboardProps) {
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
  
  // Track if settings have been saved
  const [hasSettingsSaved, setHasSettingsSaved] = useState(false)
  const [hasSequenceSaved, setHasSequenceSaved] = useState(false)
  
  // Scrapping functionality state
  const [isScrappingActive, setIsScrappingActive] = useState(false)
  const [scrappingDailyLimit, setScrappingDailyLimit] = useState(100)
  const [scrappingIndustry, setScrappingIndustry] = useState("")
  const [scrappingKeyword, setScrappingKeyword] = useState("")
  const [scrappingLocation, setScrappingLocation] = useState("")
  
  // Use real-time scraping updates hook
  const { 
    scrapingStatus, 
    scrapingProgress, 
    refetch: refetchScrapingStatus 
  } = useScrapingUpdates(campaign?.id)
  
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
  
  // Sequences state - Preset 6-email structure
  const [steps, setSteps] = useState(() => [
    // Sequence 1 - 3 emails
    { 
      id: 1, 
      type: 'email', 
      sequence: 1,
      sequenceStep: 1,
      title: 'Email 1',
      subject: 'Introduction - Let\'s connect', 
      content: 'Hi {{firstName}},<br/><br/>I hope this email finds you well! I wanted to reach out because I believe there might be a great opportunity for us to work together.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 0, // Send immediately
      variants: 1 
    },
    { 
      id: 2, 
      type: 'email', 
      sequence: 1,
      sequenceStep: 2,
      title: 'Email 2',
      subject: 'Introduction - Let\'s connect', 
      content: 'Hi {{firstName}},<br/><br/>I wanted to follow up on my previous email. I\'m still very interested in exploring how we might work together.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 4, // 4 days after Email 1
      variants: 1 
    },
    { 
      id: 3, 
      type: 'email', 
      sequence: 1,
      sequenceStep: 3,
      title: 'Email 3',
      subject: 'Introduction - Let\'s connect', 
      content: 'Hi {{firstName}},<br/><br/>This is my final follow-up in this sequence. I understand you\'re busy, but I believe this opportunity could be valuable for {{company}}.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 8, // 4 days after Email 2 (8 days total from Email 1)
      variants: 1 
    },
    // 90-day gap here
    // Sequence 2 - 3 more emails
    { 
      id: 4, 
      type: 'email', 
      sequence: 2,
      sequenceStep: 1,
      title: 'Email 4',
      subject: 'New opportunities - Let\'s reconnect', 
      content: 'Hi {{firstName}},<br/><br/>It\'s been a while since we last connected. I wanted to reach out with some exciting new developments that might interest you.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 98, // 90 days after Sequence 1 ends (8 + 90 = 98 days from start)
      variants: 1 
    },
    { 
      id: 5, 
      type: 'email', 
      sequence: 2,
      sequenceStep: 2,
      title: 'Email 5',
      subject: 'New opportunities - Let\'s reconnect', 
      content: 'Hi {{firstName}},<br/><br/>I hope my previous email caught your attention. The opportunities I mentioned are time-sensitive and I believe {{company}} would benefit greatly.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 102, // 4 days after Email 4
      variants: 1 
    },
    { 
      id: 6, 
      type: 'email', 
      sequence: 2,
      sequenceStep: 3,
      title: 'Email 6',
      subject: 'New opportunities - Let\'s reconnect', 
      content: 'Hi {{firstName}},<br/><br/>This is my final outreach in this campaign. I truly believe this could be a game-changer for {{company}} and would love to discuss it with you.<br/><br/>Best regards,<br/>{{senderName}}',
      timing: 106, // 4 days after Email 5
      variants: 1 
    }
  ])
  const [activeStepId, setActiveStepId] = useState(1)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showCodeView, setShowCodeView] = useState(false)
  const [showLaunchValidationModal, setShowLaunchValidationModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAdvancedPopup, setShowAdvancedPopup] = useState(false)
  const [launchValidationErrors, setLaunchValidationErrors] = useState([])
  const editorRef = useRef<HTMLDivElement>(null)
  const [testModalAccountId, setTestModalAccountId] = useState(null)
  const [testModalLoading, setTestModalLoading] = useState(false)
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
        
        targetTiming = maxTiming + 1
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
      targetTiming = steps.length > 0 ? Math.max(...steps.map(s => s.timing)) + 1 : 0
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
    setSteps(steps.map((step) => 
      step.sequence === sequenceNumber ? { ...step, subject } : step
    ))
  }

  const updateStepTiming = (stepId: number, timing: number) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, timing } : step)))
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
        },
        
        // Scraping settings
        scraping: {
          isActive: isScrappingActive,
          dailyLimit: scrappingDailyLimit,
          industry: scrappingIndustry,
          keyword: scrappingKeyword,
          location: scrappingLocation
        }
      }

      const response = await fetch(`/api/campaigns/${campaign.id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        }
        if (dataType === 'all' || dataType === 'settings') {
          setHasSettingsSaved(true)
        }
        
        const saveTypeText = dataType === 'all' ? 'Campaign Data' : 
                            dataType === 'sequences' ? 'Sequences' :
                            dataType === 'settings' ? 'Settings' :
                            dataType === 'senders' ? 'Sender Selection' : 'Data'
                            
        toast({
          title: `${saveTypeText} Saved`,
          description: `${saveTypeText} have been saved successfully`,
        })
      } else {
        toast({
          title: "Save Failed",
          description: result.error || "Failed to save campaign data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving campaign:", error)
      toast({
        title: "Error",
        description: "Failed to save campaign data",
        variant: "destructive"
      })
    }
  }

  // Individual save functions for backward compatibility
  const saveSequence = () => saveCampaignData('sequences')
  const saveSettings = () => saveCampaignData('settings')
  const saveAll = () => saveCampaignData('all')
  const saveSenders = () => saveCampaignData('senders')

  // Load campaign data on component mount
  const loadCampaignData = async () => {
    if (!campaign?.id) return
    
    setIsLoadingCampaignData(true)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/save`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        
        // Load sequences
        if (data.sequences && data.sequences.length > 0) {
          setSteps(data.sequences)
          setActiveStepId(data.sequences[0]?.id || 1)
        }
        
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
            // Update the signature editor content if it exists
            if (signatureEditorRef.current) {
              signatureEditorRef.current.innerHTML = signatureHtml
            }
          }
        }
        
        // Load sender accounts
        if (data.senders) {
          setSelectedSenderAccounts(data.senders)
        }
        
        // Load scraping settings with campaign data fallback
        if (data.scrapingSettings) {
          setIsScrappingActive(data.scrapingSettings.isActive || false)
          setScrappingDailyLimit(data.scrapingSettings.dailyLimit || 100)
          setScrappingIndustry(data.scrapingSettings.industry || '')
          setScrappingKeyword(data.scrapingSettings.keyword || '')
          setScrappingLocation(data.scrapingSettings.location || '')
        } else if (data.campaign) {
          // Pre-populate with campaign data if no scraping settings exist
          setScrappingIndustry(data.campaign.industry || '')
          setScrappingLocation(data.campaign.location || '')
          const keywords = data.campaign.keywords || []
          setScrappingKeyword(Array.isArray(keywords) ? keywords.join(', ') : keywords.toString())
          setScrappingDailyLimit(100) // Default daily limit
          setIsScrappingActive(false) // Default to inactive
        }
        
        // Load connected accounts
        if (data.connectedAccounts) {
          setConnectedGmailAccounts(data.connectedAccounts.gmail || [])
          setConnectedMicrosoft365Accounts(data.connectedAccounts.microsoft365 || [])
          setConnectedSmtpAccounts(data.connectedAccounts.smtp || [])
        }
        
        setCampaignDataLoaded(true)
      }
    } catch (error) {
      console.error('Error loading campaign data:', error)
      toast({
        title: "Error Loading Data",
        description: "Failed to load campaign data. Please refresh the page.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingCampaignData(false)
    }
  }
  
  // Load data when component mounts or campaign changes
  useEffect(() => {
    if (campaign?.id && !campaignDataLoaded) {
      loadCampaignData()
      // Also populate scrapping fields when campaign is first loaded
      populateScrapingFromCampaignData()
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

  // Function to populate Contact Scrapping fields from campaign data  
  const populateScrapingFromCampaignData = async () => {
    if (!campaign?.id) {
      console.log('⚠️ No campaign ID available for scrapping population')
      return
    }
    
    console.log('🔍 Fetching campaign data for Contact Scrapping fields...')
    
    try {
      const url = `/api/campaigns/${campaign.id}/save`
      console.log('🔍 Fetching from URL:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
      }
      
      const result = await response.json()
      
      console.log('📨 API Response for campaign data:', {
        success: result.success,
        hasCampaignData: !!result.data?.campaign,
        campaignFields: result.data?.campaign ? {
          id: result.data.campaign.id,
          industry: result.data.campaign.industry,
          location: result.data.campaign.location,
          keywords: result.data.campaign.keywords
        } : null
      })
      
      if (result.success && result.data && result.data.campaign) {
        const campaignData = result.data.campaign
        
        // Always populate from campaign data (override any existing values)
        if (campaignData.industry) {
          setScrappingIndustry(campaignData.industry)
          console.log('✅ Set scrapping industry:', campaignData.industry)
        }
        if (campaignData.location) {
          setScrappingLocation(campaignData.location)
          console.log('✅ Set scrapping location:', campaignData.location)
        }
        if (campaignData.keywords) {
          const keywords = campaignData.keywords || []
          const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords.toString()
          setScrappingKeyword(keywordString)
          console.log('✅ Set scrapping keywords:', keywordString)
        }
        
        console.log('✅ Contact Scrapping fields populated from campaign data')
      } else {
        console.log('❌ Failed to get campaign data from API response')
      }
    } catch (error) {
      console.error('❌ Error fetching campaign data for scrapping fields:', error)
      console.error('❌ Error details:', {
        message: error.message,
        type: error.constructor.name,
        campaignId: campaign?.id
      })
      
      // Don't let this error break the UI - just log it
      if (error.message?.includes('Failed to fetch')) {
        console.log('💡 This might be a network issue or the server might be down')
      }
    }
  }

  // Ensure Contact Scrapping fields are populated when user navigates to contacts tab
  useEffect(() => {
    if (activeTab === 'contacts' && campaign?.id) {
      populateScrapingFromCampaignData()
    }
  }, [activeTab, campaign?.id])

  // Auto-save functionality (only after data is loaded)
  useEffect(() => {
    if (!campaignDataLoaded) return
    
    const autoSaveTimer = setTimeout(() => {
      // Auto-save sequences when steps change
      if (steps.length > 0) {
        saveCampaignData('sequences')
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

  useEffect(() => {
    if (!campaignDataLoaded) return
    
    const autoSaveTimer = setTimeout(() => {
      saveCampaignData('senders')
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [selectedSenderAccounts, campaignDataLoaded])

  const previewSequence = () => {
    setShowPreviewModal(!showPreviewModal)
  }

  // Load leads (prospects) from database
  const loadLeadsData = async () => {
    setLeadsLoading(true)
    try {
      const response = await fetch('/api/prospects')
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
          toast({
            title: "No Available Prospects",
            description: `All prospects are already assigned to "${campaign?.name}" campaign.`,
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load prospects",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading leads:", error)
      toast({
        title: "Error",
        description: "Failed to load prospects data",
        variant: "destructive"
      })
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
          email_status: 'Unknown',
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
        body: JSON.stringify({
          contacts: prospectsToImport
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Bulk Import Successful",
          description: `${prospectsToImport.length} contacts imported successfully`
        })
        setShowImportModal(false)
        setSelectedLeads([])
        fetchContacts() // Refresh the contacts list
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('❌ Error importing all contacts:', error)
      toast({
        title: "Import Failed",
        variant: "destructive",
        description: error.message || "Failed to import all contacts",
      })
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
            email_status: 'Unknown',
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
            email_status: 'Unknown',
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
          email_status: 'Unknown',
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
        body: JSON.stringify({
          prospects: prospectsToImport
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const importedCount = result.imported || 0
        const updatedCount = result.updated || 0
        
        if (importedCount > 0 || updatedCount > 0) {
          toast({
            title: "Prospects Imported",
            description: importedCount > 0 
              ? `Successfully imported ${importedCount} new prospects to "${campaign.name}" campaign`
              : `Successfully assigned ${updatedCount} existing prospects to "${campaign.name}" campaign`,
          })
        } else {
          toast({
            title: "Import Completed",
            description: result.message || "Prospects have been processed successfully",
          })
        }
        
        setShowImportModal(false)
        setSelectedLeads([])
        setCsvFile(null)
        setManualContact({ name: '', email: '', phone: '', company: '' })
        
        // Refresh the prospects list
        fetchContacts()
        
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Failed to import prospects",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error importing prospects:", error)
      toast({
        title: "Error",
        description: "Failed to import prospects",
        variant: "destructive"
      })
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
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      })
    }
  }

  // Open import modal and load leads
  const openImportModal = () => {
    setShowImportModal(true)
    // Always load leads data when opening the modal since 'leads' is the default importType
    loadLeadsData()
  }

  const activeStep = steps.find((s) => s.id === activeStepId)

  // Initialize steps with default step if empty
  useEffect(() => {
    if (steps.length === 0) {
      setSteps([{
        id: 1,
        subject: "",
        content: "",
        variants: 1,
        timing: 1,
      }])
      setActiveStepId(1)
    }
  }, [steps.length])

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
    if (activeTab === 'contacts' && campaign?.id) {
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
          
          toast({
            title: "Success",
            description: "Gmail account connected successfully!",
            variant: "default"
          })
        } else if (event.data.type === 'GMAIL_AUTH_ERROR') {
          popup.close()
          clearInterval(checkClosed)
          setGmailAuthLoading(false)
          
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect Gmail account",
            variant: "destructive"
          })
        }
      })
      
    } catch (error) {
      console.error('Gmail OAuth error:', error)
      setGmailAuthLoading(false)
      toast({
        title: "Connection Error",
        description: "Failed to initiate Gmail connection",
        variant: "destructive"
      })
    }
  }

  // Microsoft 365 OAuth functions
  const initiateMicrosoft365OAuth = async () => {
    setMicrosoft365AuthLoading(true)
    
    try {
      // Step 1: Get OAuth URL from backend
      const response = await fetch('/api/microsoft365/oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
          
          toast({
            title: "Success",
            description: "Microsoft 365 account connected successfully!",
            variant: "default"
          })
        } else if (event.data.type === 'MICROSOFT365_AUTH_ERROR') {
          popup.close()
          clearInterval(checkClosed)
          setMicrosoft365AuthLoading(false)
          
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect Microsoft 365 account",
            variant: "destructive"
          })
        }
      })
      
    } catch (error) {
      console.error('Microsoft 365 OAuth error:', error)
      setMicrosoft365AuthLoading(false)
      toast({
        title: "Connection Error",
        description: "Failed to initiate Microsoft 365 connection",
        variant: "destructive"
      })
    }
  }

  // Load connected Microsoft 365 accounts
  const loadConnectedMicrosoft365Accounts = async () => {
    try {
      const response = await fetch('/api/microsoft365/accounts')
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
      const response = await fetch('/api/smtp/accounts')
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
        toast({
          title: "Connection Successful",
          description: "SMTP connection validated successfully!",
          variant: "default"
        })
      } else {
        toast({
          title: "Connection Failed", 
          description: data.error || "Failed to validate SMTP connection",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate SMTP connection",
        variant: "destructive"
      })
    } finally {
      setSmtpLoading(false)
    }
  }

  const saveSmtpAccount = async () => {
    if (!smtpFormData.name.trim() || !smtpFormData.email.trim() || 
        !smtpFormData.smtpHost.trim() || !smtpFormData.smtpUser.trim() || 
        !smtpFormData.smtpPassword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setSmtpLoading(true)
    try {
      const response = await fetch('/api/smtp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpFormData)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Account Connected",
          description: "SMTP account connected successfully!",
          variant: "default"
        })
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
          toast({
            title: "Connection Failed",
            description: data.error || "Failed to connect SMTP account",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect SMTP account",
        variant: "destructive"
      })
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
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive"
      })
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/smtp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your SMTP integration is working correctly.</p><p>If you received this email, your SMTP connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Test Successful",
          description: `Test email sent successfully to ${testModalEmail}!`,
          variant: "default"
        })
        setTestEmail(testModalEmail)
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email. Please try again.",
        variant: "destructive"
      })
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
        toast({
          title: "Campaign Deleted",
          description: result.message || `Campaign "${campaign.name}" has been deleted successfully`,
        })
        
        // Call onDelete to update parent state and navigate back
        if (onDelete) {
          onDelete(campaign.id)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete campaign",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      })
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const handleAdvancedCampaignComplete = async (campaignData: any) => {
    try {
      // Use the correct API endpoint that supports advanced fields
      console.log('🚀 Creating advanced campaign with data:', campaignData.formData)
      
      const response = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignData.formData) // Send the full form data with keywords, location, industry
      })

      const result = await response.json()

      if (result.success) {
        setShowAdvancedPopup(false)
        
        // Pre-fill Contact Scrapping fields with campaign data
        setScrappingIndustry(campaignData.formData.industry || '')
        setScrappingLocation(campaignData.formData.location || '')
        const keywords = campaignData.formData.keywords || []
        setScrappingKeyword(keywords.join(', '))
        
        // Populate email sequences with AI-generated content
        if (campaignData.aiAssets && campaignData.aiAssets.email_sequences) {
          const aiSequences = campaignData.aiAssets.email_sequences
          const newSteps = []
          
          // First Sequence - 3 emails with 3-day intervals
          for (let i = 0; i < 3 && i < aiSequences.length; i++) {
            const aiEmail = aiSequences[i]
            newSteps.push({
              id: i + 1,
              type: 'email',
              sequence: 1,
              sequenceStep: i + 1,
              title: `Email ${i + 1}`,
              subject: aiEmail.subject || `Email ${i + 1} Subject`,
              content: (aiEmail.content || '').replace(/\n/g, '<br/>'),
              timing: i * 3, // 0, 3, 6 days
              variants: 1
            })
          }
          
          // Second Sequence - 3 more emails after 60 days, with 3-day intervals
          for (let i = 0; i < 3; i++) {
            const aiEmailIndex = Math.min(i + 3, aiSequences.length - 1)
            const aiEmail = aiSequences[aiEmailIndex] || aiSequences[aiSequences.length - 1] || {}
            
            newSteps.push({
              id: i + 4,
              type: 'email',
              sequence: 2,
              sequenceStep: i + 1,
              title: `Email ${i + 4}`,
              subject: aiEmail.subject || `Follow-up ${i + 1}`,
              content: (aiEmail.content || `Hi {{firstName}},<br/><br/>Following up on our previous conversation about {{companyName}}.<br/><br/>Best regards,<br/>{{senderName}}`).replace(/\n/g, '<br/>'),
              timing: 60 + 6 + (i * 3), // 66, 69, 72 days from start
              variants: 1
            })
          }
          
          setSteps(newSteps)
        }
        
        toast({
          title: "Campaign Created",
          description: `Campaign "${campaignData.formData.campaignName}" has been created successfully`,
        })
        
        // Refresh the parent campaigns list
        window.dispatchEvent(new CustomEvent('campaigns-changed'))
        
        // Navigate to the new campaign or back to list
        if (onBack) {
          onBack()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create campaign",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast({
        title: "Error", 
        description: "Failed to create campaign",
        variant: "destructive"
      })
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
            setActiveTab('sender')
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
            setActiveTab('contacts')
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
            setActiveTab('settings')
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
            setActiveTab('sequence')
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
        toast({
          title: "Campaign Launched",
          description: `Campaign "${campaign.name}" is now active.`,
          variant: "default"
        })
      }
    } else if (campaign.status === 'Active') {
      // Pause the campaign
      if (onStatusUpdate) {
        onStatusUpdate(campaign.id, 'Paused')
        toast({
          title: "Campaign Paused",
          description: `Campaign "${campaign.name}" has been paused.`,
          variant: "default"
        })
      }
    } else if (campaign.status === 'Paused') {
      // Resume the campaign
      if (onStatusUpdate) {
        onStatusUpdate(campaign.id, 'Active')
        toast({
          title: "Campaign Resumed",
          description: `Campaign "${campaign.name}" is now active again.`,
          variant: "default"
        })
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

  // Scrapping functions
  const handleStartScrapping = async (mode: 'full' | 'profiles-only' | 'combined' = 'full') => {
    // Validate all fields are filled
    if (!scrappingIndustry || !scrappingKeyword || !scrappingLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields (Industry, Keyword, and Location) to start scrapping.",
        variant: "destructive"
      })
      return
    }

    if (!campaign?.id) {
      toast({
        title: "Error",
        description: "Campaign ID not found",
        variant: "destructive"
      })
      return
    }

    setIsScrappingActive(true)
    
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/scraping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          mode,
          keyword: scrappingKeyword,
          location: scrappingLocation, 
          industry: scrappingIndustry,
          dailyLimit: scrappingDailyLimit
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        const description = mode === 'profiles-only' 
          ? `Profile finding is now in progress. We'll search LinkedIn for matching profiles.`
          : mode === 'combined'
          ? `Combined scraping started. We'll first find LinkedIn profiles, then enrich each one with email data individually.`
          : `Email enrichment is now in progress. We'll find emails for existing profiles.`
        
        toast({
          title: mode === 'profiles-only' 
            ? "Profile Finding Started" 
            : mode === 'combined'
            ? "Combined Scraping Started"
            : "Email Enrichment Started",
          description
        })
        
        // Refetch scraping status to get updates
        setTimeout(() => refetchScrapingStatus(), 1000)
      } else {
        throw new Error(result.error || 'Failed to start scraping')
      }
    } catch (error) {
      console.error('Error starting scraping:', error)
      setIsScrappingActive(false)
      toast({
        title: mode === 'profiles-only' ? "Profile Finding Failed" : "Scraping Failed",
        description: error.message || "Failed to start the process",
        variant: "destructive"
      })
    }
  }

  const handleStopScrapping = async () => {
    if (!campaign?.id) return

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/scraping`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setIsScrappingActive(false)
        toast({
          title: "Scraping Stopped",
          description: "Contact scraping has been stopped."
        })
        setTimeout(() => refetchScrapingStatus(), 1000)
      }
    } catch (error) {
      console.error('Error stopping scraping:', error)
      toast({
        title: "Error",
        description: "Failed to stop scraping",
        variant: "destructive"
      })
    }
  }

  // Monitor scraping status changes
  useEffect(() => {
    if (scrapingStatus === 'running') {
      setIsScrappingActive(true)
    } else {
      setIsScrappingActive(false)
      
      if (scrapingStatus === 'completed') {
        toast({
          title: "Scraping Complete",
          description: `Successfully found ${scrapingProgress.totalContacts} contacts with emails from ${scrapingProgress.totalProfiles} profiles.`
        })
        fetchContacts() // Refresh contacts list
      } else if (scrapingStatus === 'failed') {
        toast({
          title: "Scraping Failed",
          description: "The scraping process encountered an error and was stopped.",
          variant: "destructive"
        })
      }
    }
  }, [scrapingStatus, scrapingProgress])

  // Refresh contacts when scraping progress changes (new contacts are being added)
  useEffect(() => {
    if (activeTab === 'contacts' && scrapingStatus === 'running' && scrapingProgress.totalContacts > 0) {
      // Refresh contacts when new contacts are being added during scraping
      fetchContacts()
    }
  }, [scrapingProgress.totalContacts, activeTab])

  // Load connected email accounts
  const loadConnectedAccounts = async () => {
    if (!campaign?.id) {
      console.log('⚠️ No campaign ID available, skipping account load')
      return
    }
    
    try {
      // Add cache-busting parameter and campaign ID to prevent stale data and get campaign-specific accounts
      const response = await fetch(`/api/gmail/accounts?campaign_id=${campaign.id}&t=${Date.now()}`)
      if (response.ok) {
        const text = await response.text()
        try {
          const accounts = JSON.parse(text)
          console.log(`📧 Loaded Gmail accounts for campaign ${campaign.id}:`, accounts.length)
          setConnectedEmailAccounts(accounts)
          setConnectedGmailAccounts(accounts) // Also set Gmail accounts for sender tab
        } catch (jsonError) {
          console.error('Failed to parse Gmail accounts response as JSON:', text.substring(0, 200))
        }
      }
    } catch (error) {
      console.error('Failed to load connected accounts:', error)
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
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive"
      })
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/gmail/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your Gmail integration is working correctly.</p><p>If you received this email, your Gmail connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Test Successful",
          description: `Test email sent successfully to ${testModalEmail}!`,
          variant: "default"
        })
        setTestEmail(testModalEmail) // Save for next time
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email. Please try again.",
        variant: "destructive"
      })
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
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive"
      })
      return
    }

    setTestModalLoading(true)
    try {
      const response = await fetch('/api/microsoft365/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: testModalAccountId,
          to: testModalEmail,
          subject: 'Test Email from LeadsUp',
          body: '<h2>Test Email</h2><p>This is a test email to verify your Microsoft 365 integration is working correctly.</p><p>If you received this email, your Microsoft 365 connection is working properly!</p>'
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Test Successful",
          description: `Test email sent successfully to ${testModalEmail}!`,
          variant: "default"
        })
        setTestEmail(testModalEmail) // Save for next time
        setShowTestModal(false)
        setTestModalEmail("")
        setTestModalAccountId(null)
      } else {
        throw new Error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email. Please try again.",
        variant: "destructive"
      })
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

      console.log(`🔍 Fetching contacts for campaign ${campaign?.id} (${campaign?.name})`)
      console.log(`📋 Query params:`, params.toString())
      
      const response = await fetch(`/api/contacts?${params.toString()}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      console.log(`📊 API Response:`, {
        contacts_count: data.contacts?.length || 0,
        total: data.total,
        hasMore: data.hasMore
      })
      
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
          status: 'Valid' // Default status since contacts from scraping are valid
        }))
        
        console.log(`📝 Contacts for campaign:`, mappedContacts)
        
        setContacts(mappedContacts)
        setTotalContacts(data.total || 0)
        setHasMore(data.hasMore || false)
      } else {
        console.log('❌ No contacts property in response:', data)
        setContacts([])
        setTotalContacts(0)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching campaign contacts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch campaign prospects",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
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
          body: JSON.stringify({ tags: updatedTags })
        })
      })

      await Promise.all(updatePromises)

      toast({
        title: "Campaign Assignment",
        description: `${selectedContacts.length} contacts assigned to campaign "${selectedCampaign.name}"`
      })

      setSelectedContacts([])
      fetchContacts()
    } catch (error) {
      console.error('Error assigning contacts to campaign:', error)
      toast({
        title: "Error",
        description: "Failed to assign contacts to campaign",
        variant: "destructive"
      })
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
        fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
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

  // Function to delete selected contacts or specific contact IDs
  const deleteSelectedContacts = async (contactIds = null) => {
    const idsToDelete = contactIds || selectedContacts
    
    if (!idsToDelete || idsToDelete.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to delete",
        variant: "destructive"
      })
      return
    }

    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} contact(s)?`)) return

    try {
      const deletePromises = idsToDelete.map(contactId =>
        fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)

      toast({
        title: "Contacts deleted",
        description: `${idsToDelete.length} contact(s) have been deleted successfully`
      })

      // Clear selection if we were deleting selected contacts
      if (!contactIds) {
        setSelectedContacts([])
      }
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

    toast({
      title: "Export completed",
      description: `${contactsToExport.length} contacts exported successfully`
    })
  }

  const handleCsvImport = async () => {
    if (!csvFile) return

    setCsvImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Import successful",
          description: `${result.imported} contacts imported successfully${result.errors ? ` (${result.total - result.imported} failed)` : ''}`
        })
        
        // Close modal and refresh contacts
        setShowContactImportModal(false)
        setCsvFile(null)
        fetchContacts()
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('CSV import error:', error)
      toast({
        title: "Import failed",
        description: error.message || "Failed to import contacts from CSV",
        variant: "destructive"
      })
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
      const response = await fetch('/api/gmail/api-status')
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
    
    toast({
      title: "Enable Gmail API",
      description: "Please enable the Gmail API in the opened tab, then click 'Refresh Status' to check again.",
      variant: "default"
    })
  }


  // Load connected accounts on mount and check API status
  useEffect(() => {
    loadConnectedAccounts()
    loadConnectedMicrosoft365Accounts()
    loadConnectedSmtpAccounts()
    checkGmailApiStatus()
  }, [])

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
      })

      if (response.ok) {
        // Update frontend state
        setConnectedGmailAccounts(prev => prev.filter(acc => acc.id !== accountId))
        setSelectedSenderAccounts(prev => prev.filter(id => id !== accountId))
        
        toast({
          title: "Account Disconnected",
          description: "Gmail account has been removed from this campaign",
        })
      } else {
        throw new Error('Failed to disconnect account')
      }
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Gmail account",
        variant: "destructive"
      })
    }
  }

  const disconnectMicrosoft365Account = async (accountId) => {
    try {
      const response = await fetch(`/api/microsoft365/accounts?id=${accountId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from UI state
        setConnectedMicrosoft365Accounts(prev => prev.filter(acc => acc.id !== accountId))
        toast({
          title: "Account Disconnected",
          description: "Microsoft 365 account has been removed successfully",
          variant: "default"
        })
      } else {
        const error = await response.json()
        toast({
          title: "Failed to Disconnect",
          description: error.error || "Failed to remove Microsoft 365 account",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error disconnecting Microsoft 365 account:', error)
      toast({
        title: "Connection Error",
        description: "Failed to remove Microsoft 365 account",
        variant: "destructive"
      })
    }
  }

  const disconnectSmtpAccount = async (accountId) => {
    try {
      const response = await fetch(`/api/smtp/accounts?id=${accountId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from UI state
        setConnectedSmtpAccounts(prev => prev.filter(acc => acc.id !== accountId))
        toast({
          title: "Account Disconnected",
          description: "SMTP account has been removed successfully",
          variant: "default"
        })
      } else {
        const error = await response.json()
        toast({
          title: "Failed to Disconnect",
          description: error.error || "Failed to remove SMTP account",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error disconnecting SMTP account:', error)
      toast({
        title: "Connection Error",
        description: "Failed to remove SMTP account",
        variant: "destructive"
      })
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className="w-full">
            {/* Header with Save Button */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Campaign Settings</h2>
                <p className="text-gray-600">Configure your campaign limits, timing, and signature</p>
              </div>
              <div className="flex items-center">
                <Button 
                  onClick={saveSettings} 
                  className="text-white shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Campaign Settings
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="space-y-6">
                {/* Daily Limits Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Daily Contacts Limit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Daily Contacts Limit
                    </label>
                    <input 
                      type="number" 
                      value={dailyContactsLimit}
                      onChange={(e) => setDailyContactsLimit(parseInt(e.target.value) || 35)}
                      className="w-full h-12 px-4 text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Daily Sequence Limit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Daily Sequence Limit
                    </label>
                    <input 
                      type="number" 
                      value={dailySequenceLimit}
                      onChange={(e) => setDailySequenceLimit(parseInt(e.target.value) || 100)}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Sending Schedule */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sending Schedule</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sending Days */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Days</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                          const isActive = activeDays.includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                                isActive 
                                  ? 'text-white shadow-md' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              style={isActive ? { backgroundColor: 'rgb(87, 140, 255)' } : {}}
                              onClick={() => {
                                if (isActive) {
                                  setActiveDays(prev => prev.filter(d => d !== day))
                                } else {
                                  setActiveDays(prev => [...prev, day])
                                }
                              }}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time Range */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Sending Hours</h4>
                      <div className="flex items-center gap-3">
                        <select 
                          value={sendingStartTime}
                          onChange={(e) => setSendingStartTime(e.target.value)}
                          className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none"
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
                        
                        <span className="text-gray-500 font-medium">to</span>
                        
                        <select 
                          value={sendingEndTime}
                          onChange={(e) => setSendingEndTime(e.target.value)}
                          className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none"
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

                {/* Email Signature Section */}
                <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', borderColor: 'rgba(87, 140, 255, 0.2)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Sender Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl focus:border-[rgb(87,140,255)] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Email Signature</h4>
                    
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div 
                        ref={signatureEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="p-8 min-h-[200px] outline-none"
                        dangerouslySetInnerHTML={{ __html: emailSignature }}
                        onInput={(e) => {
                          const target = e.currentTarget
                          setEmailSignature(target.innerHTML)
                        }}
                      />
                      
                      {/* Formatting Toolbar */}
                      <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            document.execCommand('bold', false)
                            if (signatureEditorRef.current) {
                              setEmailSignature(signatureEditorRef.current.innerHTML)
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors"
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
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors"
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
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors"
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
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors"
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
              setSelectedSenderAccounts(selectedSenders)
              // Auto-save the selection
              setTimeout(() => {
                saveCampaignData('senders')
              }, 1000)
            }}
            initialSelectedSenders={selectedSenderAccounts}
          />
        );

      case 'contacts':
        return (
          <div className="w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Campaign Contacts</h2>
                <p className="text-gray-600">Contacts assigned to "{campaign?.name}" campaign</p>
              </div>
            </div>

            {/* Contact Scrapping Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">LinkedIn Contact Scrapping</h3>
                    <p className="text-gray-600">Find and scrape LinkedIn profiles with email enrichment</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {scrapingStatus && scrapingStatus !== 'idle' && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Status: {scrapingStatus}</span>
                        {scrapingProgress.totalProfiles > 0 && (
                          <span>({scrapingProgress.totalProfiles} profiles found, {scrapingProgress.totalContacts} with emails)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <Input
                      placeholder="e.g., Technology, Marketing"
                      value={scrappingIndustry}
                      onChange={(e) => setScrappingIndustry(e.target.value)}
                      disabled={isScrappingActive}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                    <Input
                      placeholder="e.g., CEO, Founder, Manager"
                      value={scrappingKeyword}
                      onChange={(e) => setScrappingKeyword(e.target.value)}
                      disabled={isScrappingActive}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <Input
                      placeholder="e.g., San Francisco, CA"
                      value={scrappingLocation}
                      onChange={(e) => setScrappingLocation(e.target.value)}
                      disabled={isScrappingActive}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={scrappingDailyLimit}
                      onChange={(e) => setScrappingDailyLimit(parseInt(e.target.value) || 100)}
                      disabled={isScrappingActive}
                      min="1"
                      max="500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {!isScrappingActive ? (
                    <Button
                      onClick={() => handleStartScrapping('combined')}
                      disabled={!scrappingIndustry || !scrappingKeyword || !scrappingLocation}
                      style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                      className="text-white"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Start Profile Scraping & Email Enrichment
                    </Button>
                  ) : scrapingStatus === 'completed' ? (
                    <Button
                      onClick={() => handleStartScrapping('combined')}
                      disabled={!scrappingIndustry || !scrappingKeyword || !scrappingLocation}
                      style={{ backgroundColor: 'rgb(34, 197, 94)' }}
                      className="text-white"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      ✅ Scraping Complete - Run Again
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopScrapping}
                      variant="destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Stop Scrapping
                    </Button>
                  )}
                  <div className="text-xs text-gray-500">
                    {isScrappingActive 
                      ? scrapingProgress.totalProfiles > 0 && scrapingProgress.totalContacts === 0
                        ? `Finding profiles... Found ${scrapingProgress.totalProfiles} profiles so far`
                        : scrapingProgress.totalContacts > 0
                        ? `Enriching contacts... ${scrapingProgress.totalContacts} contacts enriched from ${scrapingProgress.totalProfiles} profiles`
                        : "Starting scraping process..."
                      : "Fill in all fields to start scrapping LinkedIn profiles and enriching them with emails"
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search campaign contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button onClick={openImportModal} size="sm" style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}>
                      <Plus className="w-4 h-4 mr-2" />
                      Import Contacts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                    {selectedContacts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteSelectedContacts}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete ({selectedContacts.length})
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
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

              {/* Contact Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectedContacts.length === contacts.length && contacts.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContacts(contacts.map(c => c.id))
                            } else {
                              setSelectedContacts([])
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avatar
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        LinkedIn
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                          Loading contacts...
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                          No contacts assigned to this campaign yet. Use the scraping tools below to find contacts.
                        </td>
                      </tr>
                    ) : (
                      contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
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
                          <td className="px-4 py-4">
                            <Avatar className="w-8 h-8">
                              {contact.image_url && (
                                <AvatarImage src={contact.image_url} alt={`${contact.first_name} ${contact.last_name}`} />
                              )}
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                {contact.first_name?.charAt(0)?.toUpperCase() || contact.last_name?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {contact.first_name || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {contact.last_name || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {contact.title || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-blue-600">
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="hover:underline">
                                {contact.email}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {contact.location ? (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{contact.location}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {contact.industry || '-'}
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
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4">
                            {contact.campaign_name ? (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {contact.campaign_name}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingContact(contact)
                                  setShowEditModal(true)
                                }}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteSelectedContacts([contact.id])}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalContacts > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalContacts)} of {totalContacts} contacts
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {currentPage} of {Math.ceil(totalContacts / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalContacts / pageSize)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>


            {/* Import Modal */}
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Contacts</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Import Type Selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 mb-3 block">
                      Choose Import Method
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setImportType('leads')
                          loadLeadsData()
                        }}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          importType === 'leads' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Database className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-medium">From Leads</div>
                        <div className="text-xs text-gray-500">Import from leads database</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportType('csv')}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          importType === 'csv' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Upload className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-medium">CSV Upload</div>
                        <div className="text-xs text-gray-500">Upload CSV file</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportType('manual')}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          importType === 'manual' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Plus className="w-6 h-6 mx-auto mb-2" />
                        <div className="font-medium">Manual Entry</div>
                        <div className="text-xs text-gray-500">Add single contact</div>
                      </button>
                    </div>
                  </div>

                  {/* Import Content based on type */}
                  {importType === 'leads' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">Select Leads to Import</h3>
                        <div className="flex space-x-2">
                          {allLeads.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectedLeads.length === allLeads.length ? unselectAllLeads : selectAllLeads}
                              disabled={leadsLoading}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              {selectedLeads.length === allLeads.length ? 'Unselect All' : 'Select All'}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadLeadsData}
                            disabled={leadsLoading}
                          >
                            {leadsLoading ? 'Loading...' : 'Refresh Leads'}
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        {leadsLoading ? (
                          <div className="p-8 text-center text-gray-500">
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="font-medium">Loading prospects...</div>
                          </div>
                        ) : allLeads.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <div className="font-medium">No prospects available</div>
                            <div className="text-sm">
                              Either no prospects exist or all are already assigned to campaigns.
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={loadLeadsData}
                              className="mt-2"
                            >
                              Try refreshing
                            </Button>
                          </div>
                        ) : (
                          allLeads.map((lead) => (
                            <div key={lead.id} className="flex items-center p-3 border-b border-gray-100 last:border-b-0">
                              <Checkbox
                                checked={selectedLeads.some(l => l.id === lead.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLeads([...selectedLeads, lead])
                                  } else {
                                    setSelectedLeads(selectedLeads.filter(l => l.id !== lead.id))
                                  }
                                }}
                              />
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {lead.name || lead.customer_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {lead.email} • {lead.company || lead.business_name || 'No company'}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {selectedLeads.length > 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                          {selectedLeads.length} lead(s) selected for import
                        </div>
                      )}
                    </div>
                  )}

                  {importType === 'csv' && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Upload CSV File</h3>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          className="hidden"
                          id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <div className="text-sm font-medium text-gray-900">Click to upload CSV</div>
                          <div className="text-xs text-gray-500">Supported format: name, email, phone, company</div>
                        </label>
                      </div>
                      {csvFile && (
                        <div className="text-sm text-gray-600 mt-2">
                          Selected file: {csvFile.name}
                        </div>
                      )}
                    </div>
                  )}

                  {importType === 'manual' && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Add Contact Manually</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                          <Input
                            value={manualContact.name}
                            onChange={(e) => setManualContact({...manualContact, name: e.target.value})}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                          <Input
                            type="email"
                            value={manualContact.email}
                            onChange={(e) => setManualContact({...manualContact, email: e.target.value})}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <Input
                            value={manualContact.phone}
                            onChange={(e) => setManualContact({...manualContact, phone: e.target.value})}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                          <Input
                            value={manualContact.company}
                            onChange={(e) => setManualContact({...manualContact, company: e.target.value})}
                            placeholder="Acme Corp"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Import Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportModal(false)}
                    >
                      Cancel
                    </Button>
                    {importType === 'leads' && allLeads.length > 0 && (
                      <Button
                        variant="secondary"
                        onClick={importAllContacts}
                        disabled={importLoading || allLeads.length === 0}
                        className="bg-blue-500 text-white hover:bg-blue-600"
                      >
                        {importLoading ? 'Importing...' : `Import All (${allLeads.length})`}
                      </Button>
                    )}
                    <Button
                      onClick={importContacts}
                      disabled={
                        importLoading || 
                        (importType === 'leads' && selectedLeads.length === 0) ||
                        (importType === 'csv' && !csvFile) ||
                        (importType === 'manual' && (!manualContact.name || !manualContact.email))
                      }
                    >
                      {importLoading ? 'Importing...' : 'Import Contacts'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Contact Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingContact.id ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <Input
                        value={editingContact.name || ''}
                        onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input
                        type="email"
                        value={editingContact.email || ''}
                        onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <Input
                        value={editingContact.phone || ''}
                        onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <Input
                        value={editingContact.company || ''}
                        onChange={(e) => setEditingContact({...editingContact, company: e.target.value})}
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingContact({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveContact}>
                      Save Contact
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'sequence':
        return (
          <div className="w-full">
            {/* Header with Save Button */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Email Sequence</h2>
                <p className="text-gray-600">Configure your email sequence steps and timing</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={saveAll} 
                  className="text-white shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ backgroundColor: 'rgb(87, 140, 255)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Save All Campaign Data
                </Button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sequence Timeline Sidebar */}
              <div className="lg:w-2/5">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-6 text-lg">Campaign Timeline</h3>
                  
                  {/* Sequence 1 */}
                  <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Initial Outreach</h4>
                        <div className="text-xs text-gray-500">
                          <div className="flex items-start gap-2">
                            <span className="flex-1 break-words">Subject: "{steps.find(s => s.sequence === 1)?.subject || 'No subject'}"</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 flex-shrink-0" style={{ color: 'rgb(87, 140, 255)' }}
                              onClick={() => {
                                const newSubject = prompt('Enter subject line for Initial Outreach sequence:', steps.find(s => s.sequence === 1)?.subject || '')
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
                                  {step.timing === 0 ? 'Send immediately' : `Day ${step.timing}`}
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
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  activeStepId === step.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
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
                          Add Email
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
                      title="Click to edit waiting period"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const seq1End = Math.max(...steps.filter(s => s.sequence === 1).map(s => s.timing))
                            const seq2Start = Math.min(...steps.filter(s => s.sequence === 2).map(s => s.timing))
                            const gap = seq2Start - seq1End
                            return `${gap} day waiting period`
                          })()}
                        </div>
                        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to edit
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
                        <span>Add Follow-up Sequence</span>
                      </Button>
                    </div>
                  )}

                  {/* Sequence 2 - only show if it has steps */}
                  {steps.filter(s => s.sequence === 2).length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-green-900 mb-2">Follow-up Outreach</h4>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>Subject: "{steps.find(s => s.sequence === 2)?.subject || 'No subject'}"</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 text-green-600 hover:bg-green-100"
                              onClick={() => {
                                const newSubject = prompt('Enter subject line for Follow-up sequence:', steps.find(s => s.sequence === 2)?.subject || '')
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
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    activeStepId === step.id
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-300 text-gray-600'
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
                            Add Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Editor */}
              <div className="lg:w-3/5">
                {steps.length > 0 && activeStepId && (
                  (() => {
                    const activeStep = steps.find(s => s.id === activeStepId)
                    if (!activeStep) return null
                    
                    return (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        {/* Step Header */}
                        <div className="border-b border-gray-100 p-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                              activeStep.sequence === 1 ? 'bg-blue-600' : 'bg-green-600'
                            }`}>
                              {activeStep.sequenceStep}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {activeStep.title}
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <span>{activeStep.sequence === 1 ? 'Initial Outreach' : 'Follow-up Outreach'}</span>
                                <span>•</span>
                                <span>{activeStep.timing === 0 ? 'Send immediately' : `Day ${activeStep.timing}`}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step Configuration */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                📧 Sequence Subject Line
                              </label>
                              <Input
                                value={activeStep.subject || ''}
                                onChange={(e) => updateSequenceSubject(activeStep.sequence, e.target.value)}
                                placeholder={`Enter subject for ${activeStep.sequence === 1 ? 'Initial Outreach' : 'Follow-up'} sequence...`}
                                className="w-full h-11 text-sm border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]"
                              />
                              <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                <span>Shared across all emails in the {activeStep.sequence === 1 ? 'Initial Outreach' : 'Follow-up'} sequence</span>
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                ⏰ {activeStep.sequence === 1 ? 'Send Delay' : 'Send Schedule'}
                              </label>
                              {activeStep.sequence === 1 ? (
                                <Select
                                  value={(() => {
                                    // Calculate relative timing from previous step
                                    const prevSteps = steps.filter(s => s.sequence === 1 && s.sequenceStep < activeStep.sequenceStep)
                                    const baseTime = prevSteps.length > 0 ? Math.max(...prevSteps.map(s => s.timing)) : 0
                                    const relativeTiming = activeStep.timing - baseTime
                                    return relativeTiming.toString()
                                  })()}
                                  onValueChange={(value) => {
                                    const newTiming = parseInt(value)
                                    const prevSteps = steps.filter(s => s.sequence === 1 && s.sequenceStep < activeStep.sequenceStep)
                                    const baseTime = prevSteps.length > 0 ? Math.max(...prevSteps.map(s => s.timing)) : 0
                                    updateStepTiming(activeStep.id, baseTime + newTiming)
                                  }}
                                >
                                  <SelectTrigger className="h-11 border-gray-200 focus:border-[rgb(87,140,255)] focus:ring-[rgb(87,140,255)]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">📨 Send immediately</SelectItem>
                                    <SelectItem value="3">📅 3 days after</SelectItem>
                                    <SelectItem value="4">📅 4 days after</SelectItem>
                                    <SelectItem value="5">📅 5 days after</SelectItem>
                                    <SelectItem value="7">📅 1 week after</SelectItem>
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
                                    <span>Minimum 90 days for follow-up sequence</span>
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
                                Email Content
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
                                  Preview
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
                                  Variables
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
                                Insert Signature
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Email Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="text-sm">
                              <span className="text-gray-600">Subject:</span>{' '}
                              <span className="font-medium">{previewSubject || 'No subject'}</span>
                            </div>
                          </div>
                          <div className="p-4 bg-white">
                            <div className="whitespace-pre-wrap text-sm text-gray-900">
                              {previewContent || 'No content'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Test Email Section */}
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Send Test Email</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Test Email Address
                              </label>
                              <Input
                                type="email"
                                value={testModalEmail}
                                onChange={(e) => setTestModalEmail(e.target.value)}
                                placeholder="test@example.com"
                                className="w-full"
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                onClick={sendTestEmailGeneric}
                                disabled={testModalLoading || !testModalEmail.trim()}
                                size="sm"
                              >
                                <Send className="w-4 h-4 mr-2" />
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
  if (isLoadingCampaignData) {
    return (
      <main style={{
        paddingLeft: '64px',
        paddingRight: '64px',
        paddingTop: '32px',
        backgroundColor: '#FAFBFC',
        fontFamily: 'Jost, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            color: '#6B7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Loading campaign data...
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
      <main style={{
        paddingLeft: '64px',
        paddingRight: '64px',
        paddingTop: '32px',
        backgroundColor: '#FAFBFC',
        fontFamily: 'Jost, sans-serif',
      minHeight: '100vh'
    }}>
      {/* Campaign Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ←
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleNameKeyPress}
                      onBlur={handleSaveName}
                      className="text-2xl font-bold text-gray-900 border-none p-0 h-auto bg-transparent focus:ring-0"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveName}
                      className="text-green-600 hover:text-green-700 p-1"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 group">
                    <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditingName}
                      className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-gray-600">Campaign Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCampaignDataLoaded(false)
                loadCampaignData()
              }}
              className="text-gray-500 hover:text-gray-700"
              title="Refresh campaign data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={
                campaign.status === 'Active' 
                  ? { backgroundColor: '#dcfce7', color: '#166534' }
                  : campaign.status === 'Draft'
                  ? { backgroundColor: '#f3f4f6', color: '#374151' }
                  : campaign.status === 'Paused'
                  ? { backgroundColor: '#fef3c7', color: '#92400e' }
                  : { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }
              }>
              {campaign.status}
            </span>
            {campaign.status !== 'Completed' && (
              <Button
                variant={campaign.status === 'Draft' ? 'default' : 'outline'}
                size="sm"
                onClick={handleLaunchPauseCampaign}
                className={campaign.status === 'Draft' 
                  ? 'animate-pulse bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg transform hover:scale-105 transition-all duration-200' 
                  : campaign.status === 'Active' 
                    ? 'text-yellow-600 hover:text-yellow-700' 
                    : 'text-green-600 hover:text-green-700'
                }
                style={campaign.status === 'Draft' ? {
                  background: 'linear-gradient(135deg, rgb(87, 140, 255) 0%, rgb(67, 120, 235) 100%)',
                  animation: 'vibrate 0.5s ease-in-out infinite alternate'
                } : undefined}
              >
                {campaign.status === 'Draft' ? (
                  <><Rocket className="w-4 h-4 mr-1" /> Launch</>
                ) : campaign.status === 'Active' ? (
                  <><Pause className="w-4 h-4 mr-1" /> Pause</>
                ) : (
                  <><Play className="w-4 h-4 mr-1" /> Resume</>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCampaign}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-[rgb(87,140,255)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={isActive ? { color: 'rgb(87, 140, 255)' } : {}}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Test Email Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address
              </label>
              <Input
                type="email"
                value={testModalEmail}
                onChange={(e) => setTestModalEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowTestModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={sendTestEmailGeneric}
                disabled={testModalLoading}
              >
                {testModalLoading ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Limit Warning Dialog */}
      <Dialog open={showDailyLimitWarning} onOpenChange={setShowDailyLimitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>High Daily Limit Warning</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  Setting a daily limit above 50 emails may impact your sender reputation and deliverability.
                </p>
                <p className="mb-2">
                  We recommend staying within 50 emails per day for optimal performance, especially for new accounts.
                </p>
                <p className="font-medium">
                  Are you sure you want to continue?
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDailyLimitWarning(false)
                  setWarningAccountId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleDailyLimitChange(warningAccountId, pendingDailyLimit)
                  setShowDailyLimitWarning(false)
                  setWarningAccountId(null)
                  setPendingDailyLimit(50)
                }}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Import Modal */}
      <Dialog open={showBulkImportModal} onOpenChange={setShowBulkImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" style={{ color: 'rgb(87, 140, 255)' }} />
              <span>Import Bulk Email Accounts</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* CSV Format Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">CSV Format Required:</p>
              <code className="block bg-white p-2 rounded text-xs text-gray-700 font-mono">
                email,password,smtp_host,smtp_port,imap_host,imap_port,provider_type
              </code>
              <p className="text-xs mt-2" style={{ color: 'rgb(87, 140, 255)' }}>
                📧 <strong>email:</strong> Your email address<br/>
                🔑 <strong>password:</strong> App password (Gmail/Yahoo) or regular password<br/>
                🏢 <strong>provider_type:</strong> gmail, outlook, yahoo, or other
              </p>
            </div>

            {/* Where to Find Information */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium mb-2">Where to Find This Info:</p>
              <div className="text-xs text-green-700 space-y-2">
                <div><strong>🔑 App Passwords:</strong><br/>
                Gmail: Google Account → Security → App passwords<br/>
                Yahoo: Yahoo Account → Account security → Generate app password</div>
                <div><strong>📧 SMTP/IMAP Settings:</strong><br/>
                Gmail: smtp.gmail.com:587, imap.gmail.com:993<br/>
                Outlook: smtp-mail.outlook.com:587, outlook.office365.com:993<br/>
                Yahoo: smtp.mail.yahoo.com:587, imap.mail.yahoo.com:993</div>
              </div>
            </div>

            {/* Example */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium mb-2">Example CSV:</p>
              <div className="bg-white p-2 rounded border text-xs text-gray-700 font-mono">
                <div>john@gmail.com,app-password,smtp.gmail.com,587,imap.gmail.com,993,gmail</div>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                💡 Get Gmail App Passwords: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'rgb(87, 140, 255)' }}>Google Settings</a>
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="bulk-email-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[rgb(87,140,255)]" style={{ color: 'rgb(87, 140, 255)' }}
                    >
                      <span>Upload a file</span>
                      <input
                        id="bulk-email-upload"
                        name="bulk-email-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setBulkEmailCsvFile(file)
                            // Parse CSV for preview
                            const text = await file.text()
                            const lines = text.split('\n').filter(line => line.trim())
                            const headers = lines[0].split(',').map(h => h.trim())
                            const preview = lines.slice(1, 6).map(line => {
                              const values = line.split(',').map(v => v.trim())
                              const account = {}
                              headers.forEach((header, index) => {
                                account[header] = values[index] || ''
                              })
                              return account
                            })
                            setBulkImportPreview(preview)
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV files up to 10MB</p>
                </div>
              </div>
              {bulkEmailCsvFile && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  {bulkEmailCsvFile.name}
                </div>
              )}
            </div>

            {/* Preview Table */}
            {bulkImportPreview.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview (First 5 accounts)</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SMTP Host</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkImportPreview.map((account, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{account.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={
                                account.provider_type === 'gmail' ? { backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' } :
                                account.provider_type === 'outlook' ? { backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)' } :
                                { backgroundColor: 'rgba(107, 114, 128, 0.1)', color: 'rgb(107, 114, 128)' }
                              }>
                              {account.provider_type || 'other'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{account.smtp_host}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Ready to import
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {bulkImportPreview.length} accounts will be imported
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkImportModal(false)
                  setBulkEmailCsvFile(null)
                  setBulkImportPreview([])
                }}
                disabled={bulkImportLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!bulkEmailCsvFile) {
                    toast({
                      title: "No file selected",
                      description: "Please select a CSV file to import",
                      variant: "destructive"
                    })
                    return
                  }

                  setBulkImportLoading(true)
                  try {
                    const text = await bulkEmailCsvFile.text()
                    const lines = text.split('\n').filter(line => line.trim())
                    const headers = lines[0].split(',').map(h => h.trim())
                    
                    const accounts = lines.slice(1).map(line => {
                      const values = line.split(',').map(v => v.trim())
                      const account = {}
                      headers.forEach((header, index) => {
                        account[header] = values[index] || ''
                      })
                      return account
                    })

                    // Process each account based on provider type
                    let successCount = 0
                    for (const account of accounts) {
                      if (account.provider_type === 'gmail') {
                        // Add to Gmail accounts
                        connectedGmailAccounts.push({
                          id: Date.now() + Math.random(),
                          email: account.email,
                          profile_picture: null,
                          warmup_status: 'inactive',
                          health_score: 75,
                          daily_limit: 50
                        })
                        successCount++
                      } else if (account.provider_type === 'outlook') {
                        // Add to Microsoft 365 accounts
                        connectedMicrosoft365Accounts.push({
                          id: Date.now() + Math.random(),
                          email: account.email,
                          profile_picture: null,
                          health_score: 85,
                          daily_limit: 50
                        })
                        successCount++
                      } else {
                        // Add to SMTP accounts
                        connectedSmtpAccounts.push({
                          id: Date.now() + Math.random(),
                          email: account.email,
                          name: account.email.split('@')[0],
                          smtp_host: account.smtp_host,
                          smtp_port: account.smtp_port,
                          health_score: 75,
                          daily_limit: 50
                        })
                        successCount++
                      }
                    }

                    toast({
                      title: "Import Successful",
                      description: `Successfully imported ${successCount} email accounts`,
                    })

                    setShowBulkImportModal(false)
                    setBulkEmailCsvFile(null)
                    setBulkImportPreview([])
                  } catch (error) {
                    console.error('Error importing accounts:', error)
                    toast({
                      title: "Import Failed",
                      description: "Failed to import email accounts. Please check your CSV format.",
                      variant: "destructive"
                    })
                  } finally {
                    setBulkImportLoading(false)
                  }
                }}
                disabled={!bulkEmailCsvFile || bulkImportLoading}
                style={{ backgroundColor: 'rgb(87, 140, 255)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(67, 120, 235)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(87, 140, 255)'}
              >
                {bulkImportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Accounts
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMTP/IMAP Connection Modal */}
      <Dialog open={showSmtpModal} onOpenChange={setShowSmtpModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5" style={{ color: 'rgb(87, 140, 255)' }} />
              <span>Connect SMTP/IMAP Account</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                <input
                  type="text"
                  value={smtpFormData.name}
                  onChange={(e) => setSmtpFormData({...smtpFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={smtpFormData.email}
                  onChange={(e) => setSmtpFormData({...smtpFormData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">SMTP Host</label>
                <input
                  type="text"
                  value={smtpFormData.smtpHost}
                  onChange={(e) => setSmtpFormData({...smtpFormData, smtpHost: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">SMTP Port</label>
                <input
                  type="number"
                  value={smtpFormData.smtpPort}
                  onChange={(e) => setSmtpFormData({...smtpFormData, smtpPort: parseInt(e.target.value) || 587})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="smtpSecure"
                checked={smtpFormData.smtpSecure}
                onChange={(e) => setSmtpFormData({...smtpFormData, smtpSecure: e.target.checked})}
                className="h-4 w-4 focus:ring-[rgb(87,140,255)] border-gray-300 rounded" style={{ color: 'rgb(87, 140, 255)' }}
              />
              <label htmlFor="smtpSecure" className="text-sm font-medium text-gray-700">
                Use secure connection (TLS/SSL)
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Username</label>
                <input
                  type="text"
                  value={smtpFormData.smtpUser}
                  onChange={(e) => setSmtpFormData({...smtpFormData, smtpUser: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="Username or email"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
                <input
                  type="password"
                  value={smtpFormData.smtpPassword}
                  onChange={(e) => setSmtpFormData({...smtpFormData, smtpPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(87,140,255)] focus:border-[rgb(87,140,255)]"
                  placeholder="App password or account password"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Common Settings:</strong><br/>
                • Gmail: smtp.gmail.com, Port 587, TLS enabled<br/>
                • Outlook: smtp-mail.outlook.com, Port 587, TLS enabled<br/>
                • For Gmail: Use App Password (not regular password)
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
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
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveSmtpAccount}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Connect Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gmail App Password Help Modal */}
      <Dialog open={showGmailAppPasswordModal} onOpenChange={setShowGmailAppPasswordModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span>Gmail App Password Required</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-3">
                Gmail requires an App Password instead of your regular password for SMTP connections.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Follow these steps:</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>1</span>
                  <span>Enable 2-Factor Authentication in your Google Account</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>2</span>
                  <span>Go to Google Account Settings → Security → App passwords</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>3</span>
                  <span>Generate an app password for "Mail"</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>4</span>
                  <span>Use that 16-character password instead of your regular password</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[rgb(87,140,255)] focus:ring-offset-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open App Passwords
              </a>
              <Button
                variant="outline"
                onClick={() => setShowGmailAppPasswordModal(false)}
                className="flex-1"
              >
                Got it, thanks!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Launch Validation Modal */}
      <Dialog open={showLaunchValidationModal} onOpenChange={setShowLaunchValidationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span>Campaign Not Ready</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please complete the following steps before launching your campaign:
            </p>
            <div className="space-y-3">
              {launchValidationErrors.map((error, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{error.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{error.description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-gray-200" style={{ color: 'rgb(87, 140, 255)' }}
                        onClick={error.action}
                      >
                        {error.buttonText}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowLaunchValidationModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.isOpen} onOpenChange={(open) => !open && setDeleteConfirm({ isOpen: false, type: 'sequence', item: null, onConfirm: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {deleteConfirm.type === 'sequence' ? 'Delete Sequence' : 'Delete Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.item?.name}</span>?
            </p>
            {deleteConfirm.type === 'sequence' && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                This will permanently delete the entire sequence and all its emails. This action cannot be undone.
              </p>
            )}
            {deleteConfirm.type === 'step' && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                This will permanently delete this email from the sequence. This action cannot be undone.
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ isOpen: false, type: 'sequence', item: null, onConfirm: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm.onConfirm?.()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {deleteConfirm.type === 'sequence' ? 'Sequence' : 'Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Campaign
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the campaign <strong>"{campaign?.name}"</strong>?
              <br />
              <span className="text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCampaign}
            >
              Delete Campaign
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
    </main>
    </>
  )
}
