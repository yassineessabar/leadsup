// Target tab content component
import React, { useState, KeyboardEvent, useEffect } from 'react'
import { Upload, Check, Search, X, Plus, Bot, Zap, Pause, Play, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { INDUSTRY_OPTIONS, getTranslatedIndustries, getTranslatedIndustry } from '@/lib/industry-options'
import { LOCATION_OPTIONS, getTranslatedLocations, getTranslatedLocation } from '@/lib/location-options'
import { useI18n } from '@/hooks/use-i18n'

interface TargetTabProps {
  campaignId: string | number
  onContactsImported?: () => Promise<any>
}

export function TargetTab({
  campaignId,
  onContactsImported
}: TargetTabProps) {
  const { t, ready: translationsReady, currentLanguage } = useI18n()
  // CSV Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadStats, setUploadStats] = useState<{
    imported: number
    duplicates: number
    total: number
  } | null>(null)

  // Scraping state - now using ICP data
  const [icpIndustries, setICPIndustries] = useState<string[]>([])
  const [icpLocations, setICPLocations] = useState<string[]>([])
  const [scrappingKeywords, setScrappingKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [newICPIndustry, setNewICPIndustry] = useState("")
  const [newICPLocation, setNewICPLocation] = useState("")
  const [scrappingDailyLimit, setScrappingDailyLimit] = useState(100)
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [isStartingScraping, setIsStartingScraping] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [showScrapingConfirmation, setShowScrapingConfirmation] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  // Autocomplete state for industries
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false)
  const [filteredIndustries, setFilteredIndustries] = useState<string[]>([])
  
  // Autocomplete state for locations  
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [filteredLocations, setFilteredLocations] = useState<string[]>([])
  
  // Validation error states
  const [showIndustryError, setShowIndustryError] = useState(false)
  const [showLocationError, setShowLocationError] = useState(false)

  // Get translated options
  const translatedIndustries = getTranslatedIndustries(currentLanguage)
  const translatedLocations = getTranslatedLocations(currentLanguage)

  // Load campaign data when component mounts or campaignId changes
  useEffect(() => {
    if (campaignId) {
      fetchScrapingConfig()
    }
  }, [campaignId])

  // Fetch saved scraping configuration and ICP data
  const fetchScrapingConfig = async () => {
    try {
      setIsLoadingConfig(true)
      
      // Fetch campaign data
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'GET',
        credentials: 'include'
      })

      const campaignResult = await campaignResponse.json()
      const campaign = campaignResult.data?.campaign

      if (campaignResponse.ok && campaignResult.success && campaign) {
        
        // Populate keywords from campaign (prospect roles)
        if (campaign.keywords && Array.isArray(campaign.keywords)) {
          setScrappingKeywords(campaign.keywords)
          console.log('✅ Loaded keywords from campaign:', campaign.keywords)
        }
        
        // Load Target Audience data from dedicated campaign table fields
        console.log('🔍 Campaign target_industry field:', campaign.target_industry)
        console.log('🔍 Campaign target_location field:', campaign.target_location)
        console.log('🔍 Campaign keywords field:', campaign.keywords)
        
        if (campaign.target_industry) {
          const industries = campaign.target_industry.split(',').map((i: string) => i.trim()).filter((i: string) => i)
          setICPIndustries(industries)
          console.log('✅ Loaded target industries from campaign.target_industry:', industries)
        }
        
        if (campaign.target_location) {
          const locations = campaign.target_location.split(',').map((l: string) => l.trim()).filter((l: string) => l)
          setICPLocations(locations)
          console.log('✅ Loaded target locations from campaign.target_location:', locations)
        }
        
        // Set scraping status based on database value
        if (campaign.scrapping_status === 'Active') {
          setScrapingStatus('running')
        } else {
          setScrapingStatus('idle')
        }
        
        console.log('✅ Loaded campaign data:', {
          keywords: campaign.keywords,
          industry: campaign.industry,
          location: campaign.location,
          target_industry: campaign.target_industry,
          target_location: campaign.target_location
        })
      }

      // Only load ICP data from AI assets if no Target Audience data exists
      if (campaignResult.data?.aiAssets?.icps && !campaign?.target_industry && !campaign?.target_location) {
        const icps = campaignResult.data.aiAssets.icps
        
        // Extract industries and locations from all ICPs
        const allIndustries: string[] = []
        const allLocations: string[] = []
        
        icps.forEach((icp: any) => {
          // Handle both old format (arrays) and new format (comma-separated strings)
          if (icp.industries && Array.isArray(icp.industries)) {
            allIndustries.push(...icp.industries)
          } else if (icp.industry && typeof icp.industry === 'string') {
            // Split comma-separated string and clean up
            const industries = icp.industry.split(',').map((i: string) => i.trim()).filter((i: string) => i)
            allIndustries.push(...industries)
          }
          
          if (icp.locations && Array.isArray(icp.locations)) {
            allLocations.push(...icp.locations)
          } else if (icp.location && typeof icp.location === 'string') {
            // Split comma-separated string and clean up
            const locations = icp.location.split(',').map((l: string) => l.trim()).filter((l: string) => l)
            allLocations.push(...locations)
          }
        })
        
        // Remove duplicates and set state
        setICPIndustries([...new Set(allIndustries)])
        setICPLocations([...new Set(allLocations)])
        
        console.log('✅ Loaded ICP data from AI assets (fallback):', {
          industries: [...new Set(allIndustries)],
          locations: [...new Set(allLocations)]
        })
      } else if (campaign?.target_industry || campaign?.target_location) {
        console.log('ℹ️ Skipping AI assets load - using Target Audience data instead')
      }
      
    } catch (error) {
      console.error('Error fetching scraping configuration:', error)
      // Don't show error toast for this, just fail silently
    } finally {
      setIsLoadingConfig(false)
    }
  }

  // Load scraping configuration when component mounts
  useEffect(() => {
    if (campaignId) {
      fetchScrapingConfig()
    }
  }, [campaignId])

  // Listen for campaign creation events to auto-populate keywords
  useEffect(() => {
    const handleCampaignCreated = (event: CustomEvent) => {
      const { campaignId: eventCampaignId, keywords, location, industry } = event.detail
      
      // Only handle if this is for the current campaign
      if (eventCampaignId?.toString() === campaignId?.toString()) {
        console.log('🎯 Received campaign creation event, auto-populating Target tab:', {
          keywords,
          location,
          industry
        })
        
        // Auto-populate the scraping fields with campaign creation data
        if (keywords && keywords.length > 0) {
          setScrappingKeywords(keywords)
          console.log('✅ Auto-populated scraping keywords:', keywords)
        }
        
        if (location && (Array.isArray(location) ? location.length > 0 : location.trim())) {
          const locationStr = Array.isArray(location) ? location.join(', ') : location
          setScrappingLocation(locationStr)
          console.log('✅ Auto-populated scraping location:', locationStr)
        }
        
        if (industry && industry.trim()) {
          setScrappingIndustry(industry)
          console.log('✅ Auto-populated scraping industry:', industry)
        }
      }
    }

    // Add event listener for campaign creation
    window.addEventListener('campaign-created-with-keywords', handleCampaignCreated as EventListener)
    
    // Cleanup listener
    return () => {
      window.removeEventListener('campaign-created-with-keywords', handleCampaignCreated as EventListener)
    }
  }, [campaignId])

  // Show confirmation popup before saving
  const handleSaveScrapingClick = () => {
    if (icpIndustries.length === 0 || scrappingKeywords.length === 0 || icpLocations.length === 0) {
      toast.error("Please fill in all required fields")
      return
    }
    setShowScrapingConfirmation(true)
  }

  // Save scraping configuration
  const handleSaveScraping = async () => {
    setShowScrapingConfirmation(false)
    setIsStartingScraping(true)
    
    try {
      const scrapingData = {
        industries: icpIndustries, // Now using multiple industries from ICP
        keywords: scrappingKeywords,
        locations: icpLocations, // Now using multiple locations from ICP
        dailyLimit: scrappingDailyLimit,
        scrappingStatus: 'Active' // Set status to Active when starting scraping
      }

      const response = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignData: {
            scrapingConfig: scrapingData
          },
          saveType: 'scraping'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Scraping started! The scraper is now running in the background.")
        setScrapingStatus('running') // Set status to running after successful save
      } else {
        throw new Error(result.error || 'Failed to save scraping configuration')
      }
    } catch (error) {
      console.error('Error saving scraping configuration:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save scraping configuration')
    } finally {
      setIsStartingScraping(false)
    }
  }

  const handlePauseScraping = async () => {
    try {
      const scrapingData = {
        industries: icpIndustries, // Now using multiple industries from ICP
        keywords: scrappingKeywords,
        locations: icpLocations, // Now using multiple locations from ICP
        dailyLimit: scrappingDailyLimit,
        scrappingStatus: 'Inactive' // Set status to Inactive when pausing
      }

      const response = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignData: {
            scrapingConfig: scrapingData
          },
          saveType: 'scraping'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setScrapingStatus('idle')
        toast.success("Scraping paused. Click 'Start Scraping' to continue.")
      } else {
        throw new Error(result.error || 'Failed to pause scraping')
      }
    } catch (error) {
      console.error('Error pausing scraping:', error)
      toast.error('Failed to pause scraping')
    }
  }

  const handleStopScraping = () => {
    // This does nothing - just shows a message
    toast.info("No active scraping to stop.")
  }

  const isScrappingActive = scrapingStatus === 'running' || isStartingScraping

  // Keyword management functions
  const addKeyword = () => {
    if (keywordInput.trim() && !scrappingKeywords.includes(keywordInput.trim())) {
      setScrappingKeywords([...scrappingKeywords, keywordInput.trim()])
      setKeywordInput("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setScrappingKeywords(scrappingKeywords.filter(keyword => keyword !== keywordToRemove))
  }

  // ICP Industry management functions
  const addICPIndustry = () => {
    const trimmedIndustry = newICPIndustry.trim()
    
    // Check if the industry exists in our translated list (case-insensitive)
    const translatedIndex = translatedIndustries.findIndex(industry => 
      industry.toLowerCase() === trimmedIndustry.toLowerCase()
    )
    
    if (trimmedIndustry && translatedIndex !== -1) {
      // Get the original English key for storage
      const originalIndustry = INDUSTRY_OPTIONS[translatedIndex]
      
      if (!icpIndustries.includes(originalIndustry)) {
        setICPIndustries([...icpIndustries, originalIndustry])
        setNewICPIndustry("")
        setShowIndustryDropdown(false)
      }
    } else if (trimmedIndustry) {
      // Show error indicator for invalid industry
      setShowIndustryError(true)
      setTimeout(() => setShowIndustryError(false), 3000) // Hide after 3 seconds
    }
  }

  const removeICPIndustry = (industryToRemove: string) => {
    setICPIndustries(icpIndustries.filter(industry => industry !== industryToRemove))
  }

  // ICP Location management functions
  const addICPLocation = () => {
    const trimmedLocation = newICPLocation.trim()
    
    // Check if the location exists in our translated list (case-insensitive)
    const translatedIndex = translatedLocations.findIndex(location => 
      location.toLowerCase() === trimmedLocation.toLowerCase()
    )
    
    if (trimmedLocation && translatedIndex !== -1) {
      // Get the original English key for storage
      const originalLocation = LOCATION_OPTIONS[translatedIndex]
      
      if (!icpLocations.includes(originalLocation)) {
        setICPLocations([...icpLocations, originalLocation])
        setNewICPLocation("")
        setShowLocationDropdown(false)
      }
    } else if (trimmedLocation) {
      // Show error indicator for invalid location
      setShowLocationError(true)
      setTimeout(() => setShowLocationError(false), 3000) // Hide after 3 seconds
    }
  }

  const removeICPLocation = (locationToRemove: string) => {
    setICPLocations(icpLocations.filter(location => location !== locationToRemove))
  }

  // Autocomplete helper functions for industries
  const handleIndustryInputChange = (value: string) => {
    setNewICPIndustry(value)
    
    if (value.length > 0) {
      const filtered = translatedIndustries.filter(industry => 
        industry.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredIndustries(filtered)
      setShowIndustryDropdown(true)
    } else {
      setShowIndustryDropdown(false)
      setFilteredIndustries([])
    }
  }

  const selectIndustryFromDropdown = (translatedIndustry: string) => {
    // Find the original English industry from the translated one
    const translatedIndex = translatedIndustries.findIndex(industry => industry === translatedIndustry)
    const originalIndustry = INDUSTRY_OPTIONS[translatedIndex]
    
    if (originalIndustry && !icpIndustries.includes(originalIndustry)) {
      setICPIndustries([...icpIndustries, originalIndustry])
    }
    setNewICPIndustry("")
    setShowIndustryDropdown(false)
    setFilteredIndustries([])
  }

  // Autocomplete helper functions for locations
  const handleLocationInputChange = (value: string) => {
    setNewICPLocation(value)
    
    if (value.length > 0) {
      const filtered = translatedLocations.filter(location => 
        location.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredLocations(filtered)
      setShowLocationDropdown(true)
    } else {
      setShowLocationDropdown(false)
      setFilteredLocations([])
    }
  }

  const selectLocationFromDropdown = (translatedLocation: string) => {
    // Find the original English location from the translated one
    const translatedIndex = translatedLocations.findIndex(location => location === translatedLocation)
    const originalLocation = LOCATION_OPTIONS[translatedIndex]
    
    if (originalLocation && !icpLocations.includes(originalLocation)) {
      setICPLocations([...icpLocations, originalLocation])
    }
    setNewICPLocation("")
    setShowLocationDropdown(false)
    setFilteredLocations([])
  }

  const handleKeywordKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB')
        return
      }

      setUploadedFile(file)
      setUploadSuccess(false)
      setUploadStats(null)
      console.log('CSV file selected:', file.name)
    }
  }

  const handleCsvUpload = async () => {
    if (!uploadedFile) {
      toast.error('Please select a CSV file first')
      return
    }

    setIsUploading(true)
    
    try {
      // Get campaign name for tagging
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!campaignResponse.ok) {
        throw new Error(`Failed to fetch campaign data: ${campaignResponse.status}`)
      }
      
      const campaignResult = await campaignResponse.json()
      const campaignName = campaignResult.data?.campaign?.name || 'Unknown Campaign'
      
      const text = await uploadedFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV file must have at least a header and one data row",
          variant: "destructive"
        })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
      const contacts = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        
        if (values.length !== headers.length) continue

        const contact: any = {}
        
        headers.forEach((header, index) => {
          const value = values[index]
          if (!value) return

          switch (header) {
            case 'first_name':
            case 'firstname':
            case 'first name':
              contact.first_name = value
              break
            case 'last_name':
            case 'lastname':
            case 'last name':
              contact.last_name = value
              break
            case 'email':
              contact.email = value
              break
            case 'title':
            case 'job_title':
            case 'position':
              contact.title = value
              break
            case 'company':
            case 'company_name':
              contact.company = value
              break
            case 'industry':
              contact.industry = value
              break
            case 'location':
            case 'city':
              contact.location = value
              break
            case 'linkedin':
            case 'linkedin_url':
              contact.linkedin = value
              break
            case 'website':
              contact.website = value
              break
          }
        })

        if (contact.email || (contact.first_name && contact.last_name)) {
          contact.campaign_id = campaignId
          contact.tags = campaignName
          contacts.push(contact)
        }
      }

      if (contacts.length === 0) {
        toast({
          title: "No Valid Contacts",
          description: "No valid contacts found in the CSV file",
          variant: "destructive"
        })
        return
      }


      // Import contacts via API
      const response = await fetch('/api/contacts/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contacts })
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('❌ Failed to parse response as JSON:', jsonError)
        throw new Error(`Server returned invalid response (status: ${response.status})`)
      }

      if (response.ok && data.success) {
        setUploadSuccess(true)
        setUploadStats({
          imported: data.imported || contacts.length,
          duplicates: data.duplicates || 0,
          total: data.total || contacts.length
        })
        toast({
          title: "Import Successful",
          description: `${data.imported || contacts.length} contacts imported successfully${data.scheduled > 0 ? `, ${data.scheduled} sequences scheduled` : ''}`
        })
        
        // Refresh campaign validation
        if (onContactsImported) {
          console.log('🔄 Triggering validation refresh...')
          try {
            await onContactsImported()
            console.log('✅ Validation refresh completed')
          } catch (error) {
            console.error('❌ Validation refresh failed:', error)
          }
        } else {
          console.log('⚠️ No onContactsImported callback provided')
        }
        
        // Reset file input
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
        setUploadedFile(null)
      } else {
        throw new Error(data.error || 'Import failed')
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import CSV file",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!translationsReady) {
    return (
      <div className="min-h-screen bg-[rgb(243,243,241)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
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
              <h1 className="text-3xl font-light text-gray-900 mb-2">{t('campaignManagement.targetTab.title')}</h1>
              <p className="text-gray-600 text-lg">
                {t('campaignManagement.targetTab.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="scraping" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white border border-gray-100/50 rounded-2xl p-1">
            <TabsTrigger 
              value="import" 
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              {t('campaignManagement.targetTab.tabs.importContacts')}
            </TabsTrigger>
            <TabsTrigger 
              value="scraping"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              {t('campaignManagement.targetTab.tabs.autoScraping')}
            </TabsTrigger>
          </TabsList>

          {/* CSV Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
              <CardHeader className="p-8 pb-6">
                <CardTitle className="text-2xl font-medium text-gray-900">{t('campaignManagement.targetTab.import.title')}</CardTitle>
                <CardDescription className="mt-2 text-gray-600">
                  {t('campaignManagement.targetTab.import.subtitle')}
                </CardDescription>
              </CardHeader>
            
              <CardContent className="p-8 pt-0">
                <div className="space-y-6">
                  <div className={`rounded-2xl p-8 border-2 border-dashed text-center transition-colors ${
                    uploadSuccess 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                  {uploadSuccess ? (
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  )}
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {uploadSuccess ? t('campaignManagement.targetTab.import.uploadSuccessful') : t('campaignManagement.targetTab.import.uploadCSVFile')}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-6">
                    {uploadSuccess 
                      ? t('campaignManagement.targetTab.import.contactsImportedSuccessfully')
                      : t('campaignManagement.targetTab.import.importFromCSV')
                    }
                  </p>
                  
                  {!uploadSuccess && (
                    <div className="flex items-center justify-center gap-4">
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button
                        onClick={() => document.getElementById('csv-upload')?.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t('campaignManagement.targetTab.import.chooseFile')}
                      </Button>
                      
                      {uploadedFile && (
                        <Button
                          onClick={handleCsvUpload}
                          disabled={isUploading}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              {t('campaignManagement.targetTab.import.uploading')}
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {t('campaignManagement.targetTab.import.uploadCSV')}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {uploadedFile && !uploadSuccess && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Upload className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB • {t('campaignManagement.targetTab.scraping.readyToUpload')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadSuccess && uploadStats && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-green-200">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">{uploadStats.imported}</div>
                          <div className="text-gray-500">Imported</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600">{uploadStats.duplicates}</div>
                          <div className="text-gray-500">Duplicates</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-600">{uploadStats.total}</div>
                          <div className="text-gray-500">Total Processed</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">{t('campaignManagement.targetTab.csvFormat.title')}</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• {t('campaignManagement.targetTab.csvFormat.headerRow')}</li>
                    <li>• {t('campaignManagement.targetTab.csvFormat.requiredFields')}</li>
                    <li>• {t('campaignManagement.targetTab.csvFormat.optionalFields')}</li>
                    <li>• {t('campaignManagement.targetTab.csvFormat.encoding')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Auto Scraping Tab */}
          <TabsContent value="scraping" className="space-y-6">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
              <CardHeader className="p-8 pb-6">
                <CardTitle className="text-2xl font-medium text-gray-900">{t('campaignManagement.targetTab.scraping.title')}</CardTitle>
                <CardDescription className="mt-2 text-gray-600">
                  {t('campaignManagement.targetTab.scraping.subtitle')}
                </CardDescription>
              </CardHeader>
            
              <CardContent className="p-8 pt-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700">{t('campaignManagement.targetTab.scraping.targetIndustries')}</label>
                        {showIndustryError && (
                          <div className="relative group">
                            <Info className="w-4 h-4 text-red-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              {t('campaignManagement.targetTab.validation.selectFromDropdown')}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                            <Input
                              placeholder={t('campaignManagement.targetTab.scraping.industryPlaceholder')}
                              value={newICPIndustry}
                              onChange={(e) => handleIndustryInputChange(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addICPIndustry()}
                              onFocus={() => {
                                if (newICPIndustry.length > 0) {
                                  setShowIndustryDropdown(true)
                                }
                              }}
                              onBlur={() => {
                                // Delay hiding to allow clicking on dropdown items
                                setTimeout(() => setShowIndustryDropdown(false), 200)
                              }}
                              disabled={isScrappingActive || isLoadingConfig}
                            />
                            
                            {/* Autocomplete dropdown */}
                            {showIndustryDropdown && filteredIndustries.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                {filteredIndustries.map((industry, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                    onMouseDown={(e) => {
                                      e.preventDefault() // Prevent input blur
                                      selectIndustryFromDropdown(industry)
                                    }}
                                  >
                                    {industry}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={addICPIndustry}
                            disabled={!newICPIndustry.trim() || isScrappingActive}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-3"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {icpIndustries.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {icpIndustries.map((industry, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                              >
                                {getTranslatedIndustry(industry, currentLanguage)}
                                <button
                                  onClick={() => removeICPIndustry(industry)}
                                  disabled={isScrappingActive || isLoadingConfig}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('campaignManagement.targetTab.scraping.keywords')}</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder={t('campaignManagement.targetTab.scraping.keywordsExample')}
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyPress={handleKeywordKeyPress}
                            disabled={isScrappingActive || isLoadingConfig}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={addKeyword}
                            disabled={!keywordInput.trim() || isScrappingActive}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-3"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {scrappingKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {scrappingKeywords.map((keyword, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                              >
                                {keyword}
                                <button
                                  onClick={() => removeKeyword(keyword)}
                                  disabled={isScrappingActive || isLoadingConfig}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700">{t('campaignManagement.targetTab.scraping.targetLocations')}</label>
                        {showLocationError && (
                          <div className="relative group">
                            <Info className="w-4 h-4 text-red-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              {t('campaignManagement.targetTab.validation.selectFromDropdown')}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                            <Input
                              placeholder={t('campaignManagement.targetTab.scraping.locationPlaceholder')}
                              value={newICPLocation}
                              onChange={(e) => handleLocationInputChange(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addICPLocation()}
                              onFocus={() => {
                                if (newICPLocation.length > 0) {
                                  setShowLocationDropdown(true)
                                }
                              }}
                              onBlur={() => {
                                // Delay hiding to allow clicking on dropdown items
                                setTimeout(() => setShowLocationDropdown(false), 200)
                              }}
                              disabled={isScrappingActive || isLoadingConfig}
                            />
                            
                            {/* Autocomplete dropdown */}
                            {showLocationDropdown && filteredLocations.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                {filteredLocations.map((location, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                    onMouseDown={(e) => {
                                      e.preventDefault() // Prevent input blur
                                      selectLocationFromDropdown(location)
                                    }}
                                  >
                                    {location}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={addICPLocation}
                            disabled={!newICPLocation.trim() || isScrappingActive}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white border-0 rounded-2xl px-3"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {icpLocations.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {icpLocations.map((location, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-green-100 text-green-800 hover:bg-green-200"
                              >
                                {getTranslatedLocation(location, currentLanguage)}
                                <button
                                  onClick={() => removeICPLocation(location)}
                                  disabled={isScrappingActive || isLoadingConfig}
                                  className="ml-2 text-green-600 hover:text-green-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('campaignManagement.targetTab.scraping.dailyLimit')}
                        <span className="text-xs text-gray-500 ml-1">{t('campaignManagement.targetTab.scraping.freePlanLimit')}</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={scrappingDailyLimit}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value) || 100
                          if (newLimit > 100) {
                            // Show upgrade dialog for premium feature
                            setShowUpgradeDialog(true)
                            // Reset to 100 for free tier
                            setScrappingDailyLimit(100)
                          } else {
                            setScrappingDailyLimit(newLimit)
                          }
                        }}
                        disabled={isScrappingActive || isLoadingConfig}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isStartingScraping ? (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                        disabled={true}
                      >
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('campaignManagement.targetTab.scraping.startingScraping')}
                        </div>
                      </Button>
                    ) : scrapingStatus === 'running' ? (
                      <div className="flex items-center gap-3">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white border-0 rounded-2xl px-6 py-3"
                          disabled={true}
                        >
                          <div className="flex items-center">
                            <div className="animate-pulse w-2 h-2 bg-white rounded-full mr-2"></div>
                            {t('campaignManagement.targetTab.scraping.scrapingStarted')}
                          </div>
                        </Button>
                        <Button
                          onClick={handlePauseScraping}
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600 text-white border-0 rounded-2xl px-4 py-2"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          {t('campaignManagement.targetTab.scraping.pause')}
                        </Button>
                      </div>
                    ) : scrapingStatus === 'completed' ? (
                      <Button
                        onClick={handleSaveScrapingClick}
                        disabled={icpIndustries.length === 0 || scrappingKeywords.length === 0 || icpLocations.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {t('campaignManagement.targetTab.scraping.resumeScraping')}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSaveScrapingClick}
                        disabled={icpIndustries.length === 0 || scrappingKeywords.length === 0 || icpLocations.length === 0}
                        className={`bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3 transition-all duration-200 ${
                          icpIndustries.length > 0 && scrappingKeywords.length > 0 && icpLocations.length > 0 
                            ? 'animate-bounce hover:animate-none' 
                            : ''
                        }`}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {t('campaignManagement.targetTab.scraping.startScraping')}
                      </Button>
                    )}
                    <div className="text-xs text-gray-500">
                      {isStartingScraping 
                        ? t('campaignManagement.targetTab.scraping.startingProcess')
                        : scrapingStatus === 'running'
                        ? t('campaignManagement.targetTab.scraping.processRunning')
                        : t('campaignManagement.targetTab.scraping.fillRequiredFields')
                      }
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scraping Confirmation Dialog */}
      <Dialog open={showScrapingConfirmation} onOpenChange={setShowScrapingConfirmation}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-medium text-gray-900">
              {t('campaignManagement.targetTab.scraping.confirmationTitle')}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-2">
              {icpIndustries.join(', ')} • {icpLocations.join(', ')} • {scrappingDailyLimit}/day
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-6">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowScrapingConfirmation(false)}
                className="flex-1 rounded-2xl"
              >
                {t('campaignManagement.dialogs.delete.cancel')}
              </Button>
              <Button
                onClick={handleSaveScraping}
                disabled={isStartingScraping}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
              >
                {isStartingScraping ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {t('campaignManagement.targetTab.scraping.startingScraping')}
                  </>
                ) : (
                  t('campaignManagement.targetTab.scraping.confirmStart')
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-lg bg-white rounded-3xl border border-gray-100/50 p-0 overflow-hidden">
          <DialogHeader className="text-center p-8 pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <DialogTitle className="text-3xl font-light text-gray-900 tracking-tight mb-3">
              {t('campaignManagement.targetTab.upgrade.title')}
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-light text-base leading-relaxed">
              {t('campaignManagement.targetTab.upgrade.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-8 pb-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">{t('campaignManagement.targetTab.upgrade.freePlan')}</h4>
                  <p className="text-sm text-gray-500">{t('campaignManagement.targetTab.upgrade.freePlanLimit')}</p>
                </div>
                <div className="text-right">
                  <h4 className="font-medium text-blue-600 mb-1">{t('campaignManagement.targetTab.upgrade.proPlan')}</h4>
                  <p className="text-sm text-blue-600">{t('campaignManagement.targetTab.upgrade.proPlanLimit')}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">{t('campaignManagement.targetTab.upgrade.features.higherLimits')}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">{t('campaignManagement.targetTab.upgrade.features.advancedTargeting')}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">{t('campaignManagement.targetTab.upgrade.features.prioritySupport')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
                className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl py-3 font-medium transition-all duration-300"
              >
                {t('campaignManagement.targetTab.upgrade.maybeLater')}
              </Button>
              <Button
                onClick={() => {
                  setShowUpgradeDialog(false)
                  // Navigate to upgrade tab using the same pattern as the main app
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.set("tab", "upgrade")
                    window.history.pushState({}, "", url.toString())
                    
                    // Dispatch tab-switched event to notify the app
                    window.dispatchEvent(new CustomEvent('tab-switched', { detail: 'upgrade' }))
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 border-0 font-medium transition-all duration-300"
              >
                <Zap className="w-4 h-4 mr-2" />
                {t('campaignManagement.targetTab.upgrade.upgradeNow')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}