"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Calendar, ChevronDown, Eye, Play, Pause, MoreHorizontal, Plus, Zap, Search, Download, Upload, Mail, Phone, ChevronLeft, ChevronRight, Send, Trash2, Edit2, Check, X, Settings, Users, FileText, Filter, Building2, User, Target, Database, Linkedin, MapPin, Tag, UserCheck, Users2, UserCog, AlertTriangle, Clock, Cog, CheckCircle, XCircle, Bold, Italic, Underline, Type, Link, Image, Smile, Code, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import AutomationSettings from "@/components/automation-settings"

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
  
  // Track if settings have been saved
  const [hasSettingsSaved, setHasSettingsSaved] = useState(false)
  const [hasSequenceSaved, setHasSequenceSaved] = useState(false)
  
  // Scrapping functionality state
  const [isScrappingActive, setIsScrappingActive] = useState(false)
  const [scrappingDailyLimit, setScrappingDailyLimit] = useState(100)
  const [scrappingIndustry, setScrappingIndustry] = useState("")
  const [scrappingKeyword, setScrappingKeyword] = useState("")
  const [scrappingLocation, setScrappingLocation] = useState("")
  
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
    smtpPort: '587',
    smtpSecure: 'false',
    smtpUser: '',
    smtpPassword: '',
    imapHost: '',
    imapPort: '993',
    imapSecure: 'true'
  })
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [showConnectDropdown, setShowConnectDropdown] = useState(false)
  const [connectedSmtpAccounts, setConnectedSmtpAccounts] = useState([])
  const [selectedSmtpAccount, setSelectedSmtpAccount] = useState(null)
  
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
    'Skipped': 'bg-blue-100 text-blue-800',
    'Pending': 'bg-purple-100 text-purple-800'
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
  const addStep = () => {
    const newStep = {
      id: steps.length + 1,
      subject: "",
      content: "",
      variants: 1,
      timing: 1,
    }
    setSteps([...steps, newStep])
    setActiveStepId(newStep.id)
  }

  const deleteStep = (stepId: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((step) => step.id !== stepId)
      setSteps(newSteps)
      if (stepId === activeStepId) {
        setActiveStepId(newSteps[0]?.id || 1)
      }
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


  const saveSequence = async () => {
    if (!campaign?.id) return

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/sequences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sequences: steps
        }),
      })

      const result = await response.json()

      if (result.success) {
        setHasSequenceSaved(true)
        toast({
          title: "Sequences Saved",
          description: "All sequence steps have been saved successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save sequences",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving sequences:", error)
      toast({
        title: "Error",
        description: "Failed to save sequences",
        variant: "destructive"
      })
    }
  }

  const previewSequence = () => {
    setShowPreviewModal(!showPreviewModal)
  }

  // Load leads from database
  const loadLeadsData = async () => {
    try {
      const response = await fetch('/api/leads')
      const result = await response.json()
      
      if (result.success) {
        setAllLeads(result.data || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load leads data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading leads:", error)
      toast({
        title: "Error",
        description: "Failed to load leads data",
        variant: "destructive"
      })
    }
  }

  // Import contacts from various sources
  const importContacts = async () => {
    if (!campaign?.id) return

    setImportLoading(true)
    
    try {
      let contactsToImport = []
      
      if (importType === 'leads') {
        contactsToImport = selectedLeads.map(lead => ({
          name: lead.name || lead.customer_name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company || lead.business_name,
          source: 'leads_table'
        }))
      } else if (importType === 'csv' && csvFile) {
        // Handle CSV import
        const text = await csvFile.text()
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        
        contactsToImport = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim())
          const contact = {}
          headers.forEach((header, index) => {
            contact[header.toLowerCase()] = values[index] || ''
          })
          return {
            name: contact.name || contact.first_name + ' ' + contact.last_name || '',
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
            source: 'csv_import'
          }
        })
      } else if (importType === 'manual') {
        contactsToImport = [{
          name: manualContact.name,
          email: manualContact.email,
          phone: manualContact.phone,
          company: manualContact.company,
          source: 'manual_entry'
        }]
      }

      const response = await fetch(`/api/campaigns/${campaign.id}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: contactsToImport,
          campaignTag: campaign.name
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Contacts Imported",
          description: `Successfully imported ${contactsToImport.length} contacts with "${campaign.name}" tag`,
        })
        
        setShowImportModal(false)
        setSelectedLeads([])
        setCsvFile(null)
        setManualContact({ name: '', email: '', phone: '', company: '' })
        
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Failed to import contacts",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error importing contacts:", error)
      toast({
        title: "Error",
        description: "Failed to import contacts",
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
    if (importType === 'leads') {
      loadLeadsData()
    }
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

  // Gmail OAuth functions
  const initiateGmailOAuth = async () => {
    setGmailAuthLoading(true)
    
    try {
      // Step 1: Get OAuth URL from backend
      const response = await fetch('/api/gmail/oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
          // Refresh connected accounts
          loadConnectedAccounts()
        }
      }, 1000)
      
      // Handle message from popup
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
          popup.close()
          clearInterval(checkClosed)
          setGmailAuthLoading(false)
          loadConnectedAccounts()
          
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
          smtpPort: '587',
          smtpSecure: 'false',
          smtpUser: '',
          smtpPassword: '',
          imapHost: '',
          imapPort: '993',
          imapSecure: 'true'
        })
        loadConnectedSmtpAccounts()
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect SMTP account",
          variant: "destructive"
        })
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
    if (!campaign?.id) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the campaign "${campaign.name}"? This action cannot be undone.`
    )
    
    if (confirmed && onDelete) {
      onDelete(campaign.id)
    }
  }

  // Launch/Pause campaign function
  const handleLaunchPauseCampaign = () => {
    if (!campaign?.id) return
    
    // If campaign is Draft, validate before launching
    if (campaign.status === 'Draft') {
      // Check if required conditions are met
      const hasConnectedAccount = allConnectedAccounts.length > 0
      const hasContacts = totalContacts > 0
      const errors = []
      
      if (!hasConnectedAccount) {
        errors.push({
          title: "No Email Account Connected",
          description: "Connect at least one email account to send campaigns.",
          action: () => {
            setShowLaunchValidationModal(false)
            setActiveTab('sender')
          },
          buttonText: "Go to Sender Settings"
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
  const handleStartScrapping = () => {
    // Validate at least one field is filled
    if (!scrappingIndustry && !scrappingKeyword && !scrappingLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least one field (Industry, Keyword, or Location) to start scrapping.",
        variant: "destructive"
      })
      return
    }

    setIsScrappingActive(true)
    const criteria = [
      scrappingIndustry && `Industry: ${scrappingIndustry}`,
      scrappingKeyword && `Keyword: ${scrappingKeyword}`,
      scrappingLocation && `Location: ${scrappingLocation}`
    ].filter(Boolean).join(', ')
    
    toast({
      title: "Scrapping Started",
      description: `Contact scrapping is now active with ${criteria}. Daily limit: ${scrappingDailyLimit} contacts.`
    })
  }

  const handleStopScrapping = () => {
    setIsScrappingActive(false)
    toast({
      title: "Scrapping Stopped",
      description: "Contact scrapping has been stopped."
    })
  }

  // Load connected email accounts
  const loadConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/gmail/accounts')
      if (response.ok) {
        const text = await response.text()
        try {
          const accounts = JSON.parse(text)
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

  // Contact table functions (from LeadsTab)
  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())

      const response = await fetch(`/api/contacts?${params.toString()}`)
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
    setConnectedGmailAccounts(prev => prev.filter(acc => acc.id !== accountId))
  }

  const disconnectMicrosoft365Account = async (accountId) => {
    setConnectedMicrosoft365Accounts(prev => prev.filter(acc => acc.id !== accountId))
  }

  const disconnectSmtpAccount = async (accountId) => {
    setConnectedSmtpAccounts(prev => prev.filter(acc => acc.id !== accountId))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
            marginBottom: '24px'
          }}>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>

              {/* Daily Limits Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px'
              }}>
                {/* Daily Contacts Limit */}
                <div>
                <label style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  fontFamily: 'Jost, sans-serif'
                }}>
                  Daily Contacts Limit
                  <a 
                    href="https://emelia.io/hub/how-many-people-to-connect-per-day-in-cold-mailing" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      color: '#000000',
                      textDecoration: 'none',
                      fontSize: '12px',
                      opacity: '0.8'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(37, 99, 235)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m9,9 0,0a3,3 0 0,1 6,0c0,2-3,3-3,3"/>
                      <path d="m9 17h.01"/>
                    </svg>
                  </a>
                </label>
                <input 
                  type="number" 
                  defaultValue="35"
                  style={{
                    backgroundColor: '#FAFBFC',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    height: '48px',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '14px',
                    color: '#000000',
                    fontWeight: '500',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(37, 99, 235)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                />
              </div>

                {/* Daily Sequence Limit */}
                <div>
                <label style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#000000',
                  display: 'block',
                  marginBottom: '8px',
                  fontFamily: 'Jost, sans-serif'
                }}>
                  Daily Sequence Limit
                </label>
                <input 
                  type="number" 
                  defaultValue="100"
                  style={{
                    backgroundColor: '#FAFBFC',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    height: '48px',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '14px',
                    color: '#000000',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(37, 99, 235)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                />
                </div>
              </div>

              {/* Sending Schedule */}
              <div>
                <label style={{
                  fontWeight: '600',
                  fontSize: '16px',
                  color: '#000000',
                  display: 'block',
                  marginBottom: '16px',
                  fontFamily: 'Jost, sans-serif'
                }}>
                  Sending Schedule
                </label>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '24px',
                  alignItems: 'start'
                }}>
                  {/* Sending Days */}
                  <div>
                    <h4 style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#000000',
                      marginBottom: '12px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Active Days
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                        const isWeekday = index < 5
                        return (
                          <button
                            key={day}
                            type="button"
                            style={{
                              backgroundColor: isWeekday ? 'rgb(37, 99, 235)' : '#F3F4F6',
                              color: isWeekday ? 'white' : '#6B7280',
                              border: isWeekday ? '2px solid rgb(37, 99, 235)' : '2px solid #E5E7EB',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontWeight: '600',
                              fontFamily: 'Jost, sans-serif',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: '40px',
                              textAlign: 'center',
                              boxShadow: isWeekday ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            onClick={(e) => {
                              const isCurrentlyActive = e.currentTarget.style.backgroundColor === 'rgb(37, 99, 235)'
                              if (isCurrentlyActive) {
                                e.currentTarget.style.backgroundColor = '#F3F4F6'
                                e.currentTarget.style.color = '#6B7280'
                                e.currentTarget.style.borderColor = '#E5E7EB'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                              } else {
                                e.currentTarget.style.backgroundColor = 'rgb(37, 99, 235)'
                                e.currentTarget.style.color = 'white'
                                e.currentTarget.style.borderColor = 'rgb(37, 99, 235)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'
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
                  <div style={{ minWidth: '300px' }}>
                    <h4 style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#000000',
                      marginBottom: '12px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Sending Hours
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      <button 
                        type="button"
                        style={{
                          backgroundColor: '#FAFBFC',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontFamily: 'Jost, sans-serif',
                          color: '#000000',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          minWidth: '100px',
                          transition: 'all 0.2s ease',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = 'rgb(37, 99, 235)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <span>08:00 AM</span>
                        <ChevronDown size={16} style={{ color: 'rgb(37, 99, 235)' }} />
                      </button>
                      
                      <span style={{ 
                        color: '#6B7280',
                        fontSize: '14px',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: '500'
                      }}>
                        to
                      </span>
                      
                      <button 
                        type="button"
                        style={{
                          backgroundColor: '#FAFBFC',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontFamily: 'Jost, sans-serif',
                          color: '#000000',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          minWidth: '100px',
                          transition: 'all 0.2s ease',
                          fontWeight: '500'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = 'rgb(37, 99, 235)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <span>05:00 PM</span>
                        <ChevronDown size={16} style={{ color: 'rgb(37, 99, 235)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Signature Section */}
              <div style={{
                backgroundColor: 'rgba(37, 99, 235, 0.03)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(37, 99, 235, 0.1)',
                marginBottom: '24px'
              }}>
                {/* Sender Name Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User style={{ width: '20px', height: '20px', color: 'white' }} />
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '500',
                    color: '#1F2937',
                    fontFamily: 'Jost, sans-serif'
                  }}>
                    Sender name
                  </h3>
                </div>

                {/* Name and Company Fields */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  marginBottom: '32px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      marginBottom: '8px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        // Update signature with new name
                        const updatedSignature = emailSignature.replace(
                          /<strong>.*?<\/strong>/,
                          `<strong>${e.target.value} ${lastName}</strong>`
                        )
                        setEmailSignature(updatedSignature)
                      }}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        fontSize: '16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        backgroundColor: '#FAFBFC',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(37, 99, 235)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      marginBottom: '8px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        // Update signature with new name
                        const updatedSignature = emailSignature.replace(
                          /<strong>.*?<\/strong>/,
                          `<strong>${firstName} ${e.target.value}</strong>`
                        )
                        setEmailSignature(updatedSignature)
                      }}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        fontSize: '16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        backgroundColor: '#FAFBFC',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(37, 99, 235)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      marginBottom: '8px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        fontSize: '16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        backgroundColor: '#FAFBFC',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(37, 99, 235)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6B7280',
                      marginBottom: '8px',
                      fontFamily: 'Jost, sans-serif'
                    }}>
                      Website
                    </label>
                    <input
                      type="text"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 16px',
                        fontSize: '16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        backgroundColor: '#FAFBFC',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(37, 99, 235)'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Signature Section */}
                <div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: '16px',
                    fontFamily: 'Jost, sans-serif'
                  }}>
                    Signature
                  </h3>
                  
                  <div style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'white'
                  }}>
                    {/* Signature Content */}
                    <div 
                      ref={signatureEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        padding: '32px',
                        minHeight: '200px',
                        backgroundColor: 'white',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#374151',
                        fontFamily: 'Arial, sans-serif',
                        outline: 'none'
                      }}
                      dangerouslySetInnerHTML={{ __html: emailSignature }}
                      onInput={(e) => {
                        const target = e.currentTarget
                        setEmailSignature(target.innerHTML)
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.backgroundColor = '#FAFBFC'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                      }}
                    />
                    
                    {/* Formatting Toolbar */}
                    <div style={{
                      borderTop: '1px solid #E5E7EB',
                      backgroundColor: '#FAFBFC',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('bold', false)
                          if (signatureEditorRef.current) {
                            setEmailSignature(signatureEditorRef.current.innerHTML)
                          }
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Bold style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('italic', false)
                          if (signatureEditorRef.current) {
                            setEmailSignature(signatureEditorRef.current.innerHTML)
                          }
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Italic style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document.execCommand('underline', false)
                          if (signatureEditorRef.current) {
                            setEmailSignature(signatureEditorRef.current.innerHTML)
                          }
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Underline style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Type style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>A</span>
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
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Link style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Image style={{ width: '16px', height: '16px' }} />
                      </button>
                      <button
                        type="button"
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Smile style={{ width: '16px', height: '16px' }} />
                      </button>
                      <div style={{ marginLeft: 'auto' }}>
                        <button
                          type="button"
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            backgroundColor: 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <Code style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingTop: '24px',
                borderTop: '1px solid rgba(37, 99, 235, 0.1)'
              }}>
                <button 
                  type="button"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: 'Jost, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E7EB'
                    e.currentTarget.style.color = '#374151'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6'
                    e.currentTarget.style.color = '#6B7280'
                  }}
                  onClick={() => {
                    const defaultSignature = `<br/><br/>Best regards,<br/><strong>${firstName} ${lastName}</strong><br/>${companyName}<br/><a href="${companyWebsite}" target="_blank">${companyWebsite}</a>`
                    setEmailSignature(defaultSignature)
                    if (signatureEditorRef.current) {
                      signatureEditorRef.current.innerHTML = defaultSignature
                    }
                  }}
                >
                  <X size={16} />
                  Reset to Default
                </button>
                
                <button 
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(59, 130, 246) 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 32px',
                    fontSize: '14px',
                    fontWeight: '600',
                    fontFamily: 'Jost, sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)'
                  }}
                  onClick={() => {
                    // Save settings logic
                    setHasSettingsSaved(true)
                    toast({
                      title: "Settings Saved",
                      description: "Campaign settings have been saved successfully",
                    })
                  }}
                >
                  <Check size={16} />
                  Save Campaign Settings
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'sender':
        // Check if there are any connected accounts
        if (allConnectedAccounts.length === 0) {
          // Empty state - show only centered Connect Account button
          return (
            <div className="w-full min-h-[600px] flex items-center justify-center">
              <Button
                variant="default"
                className="flex items-center space-x-2 text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowConnectDropdown(!showConnectDropdown)}
              >
                <Plus className="w-4 h-4" />
                <span>Connect Account</span>
              </Button>
              
              {/* Connect Account Dropdown */}
              {showConnectDropdown && (
                <div className="absolute mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowConnectDropdown(false)
                      initiateGmailOAuth()
                    }}
                  >
                    <div className="w-5 h-5">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png" 
                        alt="Gmail" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Connect a Gmail account</div>
                      <div className="text-xs text-gray-500">Google workspace email</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowConnectDropdown(false)
                      initiateMicrosoft365OAuth()
                    }}
                  >
                    <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                      <Mail className="w-3 h-3 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Connect a Microsoft 365 account</div>
                      <div className="text-xs text-gray-500">Outlook & Office 365</div>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setShowConnectDropdown(false)
                      openSmtpModal()
                    }}
                  >
                    <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                      <Mail className="w-3 h-3 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Connect with SMTP/IMAP</div>
                      <div className="text-xs text-gray-500">Other email providers</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )
        }

        // When there are connected accounts, show the full sender tab interface
        return (
          <div className="w-full bg-gray-50 min-h-screen">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
                  <p className="text-gray-600 mt-1">Manage your email accounts for sequence campaigns</p>
                </div>
                <div className="relative">
                  <Button
                    variant="default"
                    className="flex items-center space-x-2 text-white bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowConnectDropdown(!showConnectDropdown)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Connect Account</span>
                  </Button>
                  
                  {/* Connect Account Dropdown */}
                  {showConnectDropdown && (
                    <div className="absolute right-0 top-12 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowConnectDropdown(false)
                          initiateGmailOAuth()
                        }}
                      >
                        <div className="w-5 h-5">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png" 
                            alt="Gmail" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Connect a Gmail account</div>
                          <div className="text-xs text-gray-500">Google workspace email</div>
                        </div>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowConnectDropdown(false)
                          initiateMicrosoft365OAuth()
                        }}
                      >
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                          <Mail className="w-3 h-3 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Connect a Microsoft 365 account</div>
                          <div className="text-xs text-gray-500">Outlook & Office 365</div>
                        </div>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setShowConnectDropdown(false)
                          openSmtpModal()
                        }}
                      >
                        <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                          <Mail className="w-3 h-3 text-orange-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Connect with SMTP/IMAP</div>
                          <div className="text-xs text-gray-500">Other email providers</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                      <p className="text-2xl font-bold text-gray-900">{totalAccounts}</p>
                    </div>
                    <Mail className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Warmup</p>
                      <p className="text-2xl font-bold text-green-600">{activeWarmupCount}</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Need Attention</p>
                      <p className="text-2xl font-bold text-red-600">{needAttentionCount}</p>
                    </div>
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Score</p>
                      <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <BarChart className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Connected Accounts</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Limit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allConnectedAccounts.map((account) => {
                        // Get warmup status for Gmail accounts
                        const warmupAccount = connectedGmailAccounts.find(gmail => gmail.id === account.id)
                        const isGmail = connectedGmailAccounts.find(gmail => gmail.id === account.id)
                        const isMicrosoft = connectedMicrosoft365Accounts.find(ms => ms.id === account.id)
                        
                        return (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {account.profile_picture ? (
                                    <img 
                                      className="h-10 w-10 rounded-full object-cover" 
                                      src={account.profile_picture} 
                                      alt={account.email}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        if (isGmail) {
                                          target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png"
                                        } else if (isMicrosoft) {
                                          target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg/2203px-Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg.png"
                                        } else {
                                          target.src = "/placeholder-avatar.png"
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <Mail className="h-6 w-6 text-gray-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{account.email}</div>
                                  <div className="text-sm text-gray-500 flex items-center gap-1">
                                    {isGmail && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Google
                                      </span>
                                    )}
                                    {isMicrosoft && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        Microsoft 365
                                      </span>
                                    )}
                                    {!isGmail && !isMicrosoft && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        SMTP/IMAP
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {warmupAccount ? (
                                  <>
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      warmupAccount.warmup_status === 'active' 
                                        ? 'bg-green-100 text-green-800'
                                        : warmupAccount.warmup_status === 'paused'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : warmupAccount.warmup_status === 'error'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {warmupAccount.warmup_status === 'active' ? 'Active Warmup' : 
                                       warmupAccount.warmup_status === 'paused' ? 'Paused' : 
                                       warmupAccount.warmup_status === 'error' ? 'Error' : 'Connected'}
                                    </div>
                                  </>
                                ) : connectedMicrosoft365Accounts.find(acc => acc.id === account.id) ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Connected</span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Connected</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(() => {
                                // Get health score from any account type
                                let healthScore = null
                                if (warmupAccount?.health_score) {
                                  healthScore = warmupAccount.health_score
                                } else if (account.health_score) {
                                  healthScore = account.health_score
                                } else {
                                  // Set default health scores for non-Gmail accounts
                                  if (isMicrosoft) {
                                    healthScore = 85 // Microsoft 365 accounts typically have good reputation
                                  } else {
                                    healthScore = 75 // SMTP accounts default score
                                  }
                                }

                                return healthScore ? (
                                  <div className="flex items-center">
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      healthScore >= 80 
                                        ? 'bg-green-100 text-green-800'
                                        : healthScore >= 60
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {healthScore}%
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={account.daily_limit || 50}
                                  onChange={(e) => {
                                    const newLimit = parseInt(e.target.value)
                                    if (newLimit > 50) {
                                      setWarningAccountId(account.id)
                                      setPendingDailyLimit(newLimit)
                                      setShowDailyLimitWarning(true)
                                    } else {
                                      handleDailyLimitChange(account.id, newLimit)
                                    }
                                  }}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="1"
                                  max="200"
                                />
                                <span className="text-sm text-gray-500">emails/day</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    if (isGmail) {
                                      testGmailConnection(account.id)
                                    } else if (isMicrosoft) {
                                      testMicrosoft365Connection(account.id)
                                    } else {
                                      testSmtpConnection(account.id)
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                >
                                  <Zap className="w-4 h-4 mr-1" />
                                  Test
                                </button>
                                <button
                                  onClick={() => {
                                    if (isGmail) {
                                      disconnectGmailAccount(account.id)
                                    } else if (connectedMicrosoft365Accounts.find(acc => acc.id === account.id)) {
                                      disconnectMicrosoft365Account(account.id)
                                    } else {
                                      disconnectSmtpAccount(account.id)
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Campaign Contacts</h2>
                <p className="text-gray-600">Manage contacts for this campaign</p>
              </div>
              <Button onClick={() => setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Import Contacts
              </Button>
            </div>

            {/* Scrapping Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Scrapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <Input
                    placeholder="e.g., Technology, Healthcare"
                    value={scrappingIndustry}
                    onChange={(e) => setScrappingIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keyword</label>
                  <Input
                    placeholder="e.g., CEO, Marketing Manager"
                    value={scrappingKeyword}
                    onChange={(e) => setScrappingKeyword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <Input
                    placeholder="e.g., New York, California"
                    value={scrappingLocation}
                    onChange={(e) => setScrappingLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Limit</label>
                  <Input
                    type="number"
                    value={scrappingDailyLimit}
                    onChange={(e) => setScrappingDailyLimit(parseInt(e.target.value) || 100)}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              <div className="flex justify-center">
                {isScrappingActive ? (
                  <Button 
                    onClick={handleStopScrapping} 
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-300"
                    size="lg"
                  >
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent mr-2"></div>
                    Stop Scrapping
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStartScrapping} 
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Target className="w-5 h-5 mr-2" />
                    Start Scrapping
                  </Button>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
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
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          Loading contacts...
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No contacts found. Click "Import Contacts" to get started.
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
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                  {contact.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">{contact.email}</div>
                                {contact.phone && (
                                  <div className="text-xs text-gray-400">{contact.phone}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{contact.company || '-'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge 
                              variant={contact.status === 'active' ? 'default' : 'secondary'}
                              className={contact.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {contact.status || 'New'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-500">
                              {contact.lastContact ? format(new Date(contact.lastContact), 'MMM d, yyyy') : 'Never'}
                            </div>
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
                        onClick={() => setImportType('leads')}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadLeadsData}
                        >
                          Refresh Leads
                        </Button>
                      </div>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        {allLeads.map((lead) => (
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
                        ))}
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
                  variant="outline"
                  className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  onClick={() => {
                    const currentGap = (steps.find(s => s.sequence === 2)?.timing || 98) - 8
                    const newGap = prompt('Enter gap between sequences (in days):', currentGap.toString())
                    if (newGap && !isNaN(parseInt(newGap))) {
                      const gapDays = parseInt(newGap)
                      // Update all Sequence 2 emails to maintain their relative spacing
                      const seq2Steps = steps.filter(s => s.sequence === 2)
                      const seq2Base = seq2Steps[0]?.timing - (seq2Steps[0]?.timing - 8)
                      seq2Steps.forEach((step, index) => {
                        const newTiming = 8 + gapDays + (index * 4) // 8 days for Seq 1 + gap + relative position
                        updateStepTiming(step.id, newTiming)
                      })
                    }
                  }}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Configure Gap
                </Button>
                <Button 
                  onClick={addStep} 
                  variant="outline"
                  className="border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Email
                </Button>
                <Button 
                  onClick={saveSequence} 
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Save Campaign
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sequence Timeline Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <h3 className="font-semibold text-gray-900">Campaign Timeline</h3>
                  </div>
                  
                  {/* Sequence 1 */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-blue-900">Sequence 1</span>
                          <div className="text-xs text-blue-700">Initial Outreach</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                        onClick={() => {
                          const newSubject = prompt('Enter subject line for Sequence 1:', steps.find(s => s.sequence === 1)?.subject || '')
                          if (newSubject) updateSequenceSubject(1, newSubject)
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 mb-4 px-3 py-2 bg-gray-50 rounded-md">
                      <span className="font-medium">Subject:</span> "{steps.find(s => s.sequence === 1)?.subject || 'No subject'}"
                    </div>
                    
                    <div className="space-y-3">
                      {steps.filter(step => step.sequence === 1).map((step, index) => (
                        <div key={step.id} className="relative">
                          <div
                            onClick={() => selectStep(step.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              activeStepId === step.id
                                ? 'border-blue-400 bg-blue-50 shadow-sm'
                                : 'border-gray-100 hover:border-blue-200 hover:bg-blue-25'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                activeStepId === step.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border-2 border-gray-200 text-gray-600'
                              }`}>
                                {step.sequenceStep}
                              </div>
                              <div>
                                <div className={`text-sm font-medium ${
                                  activeStepId === step.id ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {step.title}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  {step.timing === 0 ? 'Send immediately' : `Send on day ${step.timing}`}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 hover:bg-white"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => deleteStep(step.id)}
                                  className="text-red-600"
                                  disabled={steps.length === 1}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {index < steps.filter(s => s.sequence === 1).length - 1 && (
                            <div className="flex justify-center my-2">
                              <div className="w-px h-4 bg-blue-200"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Gap Indicator */}
                  <div className="flex items-center justify-center my-8">
                    <div className="text-center">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                        <div className="px-4 py-2 bg-gray-100 rounded-full">
                          <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                          <span className="text-sm font-medium text-gray-700">
                            {(() => {
                              const seq1End = Math.max(...steps.filter(s => s.sequence === 1).map(s => s.timing))
                              const seq2Start = Math.min(...steps.filter(s => s.sequence === 2).map(s => s.timing))
                              const gap = seq2Start - seq1End
                              return `${gap} Days`
                            })()}
                          </span>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                      </div>
                      <div className="text-xs text-gray-500 font-medium">Waiting Period</div>
                    </div>
                  </div>

                  {/* Sequence 2 */}
                  <div>
                    <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-green-900">Sequence 2</span>
                          <div className="text-xs text-green-700">Follow-up Outreach</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-700 hover:text-green-900 hover:bg-green-100"
                        onClick={() => {
                          const newSubject = prompt('Enter subject line for Sequence 2:', steps.find(s => s.sequence === 2)?.subject || '')
                          if (newSubject) updateSequenceSubject(2, newSubject)
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 mb-4 px-3 py-2 bg-gray-50 rounded-md">
                      <span className="font-medium">Subject:</span> "{steps.find(s => s.sequence === 2)?.subject || 'No subject'}"
                    </div>
                    
                    <div className="space-y-3">
                      {steps.filter(step => step.sequence === 2).map((step, index) => (
                        <div key={step.id} className="relative">
                          <div
                            onClick={() => selectStep(step.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              activeStepId === step.id
                                ? 'border-green-400 bg-green-50 shadow-sm'
                                : 'border-gray-100 hover:border-green-200 hover:bg-green-25'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                activeStepId === step.id
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white border-2 border-gray-200 text-gray-600'
                              }`}>
                                {step.sequenceStep}
                              </div>
                              <div>
                                <div className={`text-sm font-medium ${
                                  activeStepId === step.id ? 'text-green-900' : 'text-gray-900'
                                }`}>
                                  {step.title}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  Send on day {step.timing}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 hover:bg-white"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => deleteStep(step.id)}
                                  className="text-red-600"
                                  disabled={steps.length === 1}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {index < steps.filter(s => s.sequence === 2).length - 1 && (
                            <div className="flex justify-center my-2">
                              <div className="w-px h-4 bg-green-200"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Editor */}
              <div className="lg:col-span-3">
                {steps.length > 0 && activeStepId && (
                  (() => {
                    const activeStep = steps.find(s => s.id === activeStepId)
                    if (!activeStep) return null
                    
                    return (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        {/* Step Header */}
                        <div className="border-b border-gray-100 p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                activeStep.sequence === 1 ? 'bg-blue-100' : 'bg-green-100'
                              }`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                  activeStep.sequence === 1 ? 'bg-blue-600' : 'bg-green-600'
                                }`}>
                                  {activeStep.sequenceStep}
                                </div>
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {activeStep.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Sequence {activeStep.sequence} • {activeStep.sequence === 1 ? 'Initial Outreach' : 'Follow-up Outreach'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Step Configuration */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                📧 Email Subject Line
                              </label>
                              <Input
                                value={activeStep.subject || ''}
                                onChange={(e) => updateSequenceSubject(activeStep.sequence, e.target.value)}
                                placeholder={`Enter subject for Sequence ${activeStep.sequence}...`}
                                className="w-full h-11 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                              />
                              <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                <span>Shared across all emails in Sequence {activeStep.sequence}</span>
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-3">
                                ⏰ {activeStep.sequence === 1 ? 'Send Delay' : 'Send Schedule'}
                              </label>
                              {activeStep.sequence === 1 ? (
                                <Select
                                  value={activeStep.timing.toString()}
                                  onValueChange={(value) => {
                                    const newTiming = parseInt(value)
                                    const prevSteps = steps.filter(s => s.sequence === 1 && s.sequenceStep < activeStep.sequenceStep)
                                    const baseTime = prevSteps.length > 0 ? Math.max(...prevSteps.map(s => s.timing)) : 0
                                    updateStepTiming(activeStep.id, baseTime + newTiming)
                                  }}
                                >
                                  <SelectTrigger className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400">
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
                                    className="w-full h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
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

                          {/* Sequence Information */}
                          <div className={`mt-6 p-4 rounded-xl border-2 ${
                            activeStep.sequence === 1 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  activeStep.sequence === 1 ? 'bg-blue-600' : 'bg-green-600'
                                }`}>
                                  <span className="text-white text-sm font-semibold">{activeStep.sequenceStep}</span>
                                </div>
                                <div>
                                  <div className={`text-sm font-semibold ${
                                    activeStep.sequence === 1 ? 'text-blue-900' : 'text-green-900'
                                  }`}>
                                    {activeStep.title}
                                  </div>
                                  <div className={`text-xs ${
                                    activeStep.sequence === 1 ? 'text-blue-700' : 'text-green-700'
                                  }`}>
                                    {activeStep.sequence === 1 ? 'Initial Outreach' : 'Follow-up Outreach'}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-right text-xs font-medium ${
                                activeStep.sequence === 1 ? 'text-blue-800' : 'text-green-800'
                              }`}>
                                {activeStep.sequence === 1 
                                  ? `${activeStep.timing === 0 ? 'Send immediately' : `Send on day ${activeStep.timing}`}`
                                  : `Send on day ${activeStep.timing}`
                                }
                              </div>
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
                                  className={showCodeView ? "bg-blue-100 text-blue-600" : ""}
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
                                  const signatureWithVariables = emailSignature.replace(
                                    /<strong>.*?<\/strong>/,
                                    '<strong>{{senderName}}</strong>'
                                  )
                                  const newContent = currentContent + signatureWithVariables
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
                                <Badge className="bg-blue-100 text-blue-800">
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

  return (
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
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              campaign.status === 'Active' 
                ? 'bg-green-100 text-green-800'
                : campaign.status === 'Draft'
                ? 'bg-gray-100 text-gray-800'  
                : campaign.status === 'Paused'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {campaign.status}
            </span>
            {campaign.status !== 'Completed' && (
              <Button
                variant={campaign.status === 'Draft' ? 'default' : 'outline'}
                size="sm"
                onClick={handleLaunchPauseCampaign}
                className={campaign.status === 'Draft' ? '' : campaign.status === 'Active' ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
              >
                {campaign.status === 'Draft' ? (
                  <><Play className="w-4 h-4 mr-1" /> Launch</>
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
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
                        className="mt-3 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
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
    </main>
  )
}
