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

interface TargetTabProps {
  campaignId: string | number
}

export function TargetTab({
  campaignId
}: TargetTabProps) {
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

  // Industry and Location options (same as in add-campaign-popup)
  const INDUSTRY_OPTIONS = [
    "Accounting", "Advertising & Marketing", "Aerospace & Defense", "Agriculture", "Airlines", "Alternative Energy",
    "Automotive", "Banking", "Biotechnology", "Broadcasting", "Business Services", "Chemicals", "Construction",
    "Consumer Products", "Consulting", "Cosmetics", "E-commerce", "Education", "Electronics", "Energy",
    "Entertainment", "Environmental", "Fashion", "Financial Services", "Food & Beverage", "Gaming",
    "Government", "Healthcare", "Hospitality", "Human Resources", "Information Technology", "Insurance",
    "Internet", "Investment Banking", "Legal", "Logistics", "Manufacturing", "Media", "Mining",
    "Non-profit", "Oil & Gas", "Pharmaceuticals", "Real Estate", "Recruiting", "Retail", "Security",
    "Software", "Sports", "Telecommunications", "Transportation", "Travel", "Utilities", "Venture Capital",
    // Technology subcategories
    "Artificial Intelligence", "Machine Learning", "Data Analytics", "Cloud Computing", "Cybersecurity",
    "Mobile Development", "Web Development", "SaaS", "Enterprise Software", "Developer Tools", "API",
    "Blockchain", "Cryptocurrency", "Fintech", "Healthtech", "Edtech", "Proptech", "Insurtech",
    // Healthcare subcategories
    "Medical Devices", "Digital Health", "Telemedicine", "Health Insurance", "Pharmaceuticals",
    "Clinical Research", "Medical Equipment", "Dental", "Veterinary", "Mental Health",
    // Financial Services subcategories
    "Investment Management", "Private Equity", "Hedge Funds", "Asset Management", "Corporate Banking",
    "Retail Banking", "Credit Cards", "Payments", "Lending", "Wealth Management", "Trading",
    // Manufacturing subcategories
    "Industrial Automation", "3D Printing", "Robotics", "Supply Chain", "Quality Assurance",
    "Lean Manufacturing", "Industrial Design", "Materials Science", "Process Engineering",
    // Retail & E-commerce subcategories
    "Fashion Retail", "Electronics Retail", "Home & Garden", "Sporting Goods", "Luxury Goods",
    "Marketplace", "Subscription Commerce", "Direct-to-Consumer", "B2B Commerce", "Wholesale",
    // Professional Services
    "Management Consulting", "Strategy Consulting", "Technology Consulting", "HR Consulting",
    "Marketing Consulting", "Financial Consulting", "Legal Services", "Accounting Services",
    "Public Relations", "Market Research", "Executive Search", "Training & Development",
    // Media & Communications
    "Digital Marketing", "Content Marketing", "Social Media", "SEO/SEM", "Video Production",
    "Graphic Design", "Publishing", "Journalism", "Podcasting", "Influencer Marketing",
    // Construction & Real Estate
    "Commercial Real Estate", "Residential Real Estate", "Property Management", "Architecture",
    "Interior Design", "General Contracting", "Electrical", "Plumbing", "HVAC", "Roofing",
    // Transportation & Logistics
    "Shipping", "Warehousing", "Last-Mile Delivery", "Fleet Management", "Freight", "Aviation",
    "Maritime", "Rail Transport", "Trucking", "Supply Chain Management", "Courier Services",
    // Energy & Environment
    "Solar Energy", "Wind Energy", "Energy Storage", "Oil Refining", "Natural Gas", "Coal",
    "Nuclear Energy", "Environmental Consulting", "Waste Management", "Water Treatment",
    "Carbon Management", "Renewable Energy", "Energy Efficiency", "Smart Grid",
    // Food & Agriculture
    "Food Processing", "Organic Foods", "Restaurant", "Catering", "Food Delivery", "Grocery",
    "Farming", "Livestock", "Aquaculture", "Food Safety", "Nutrition", "Beverages", "Wine",
    // Entertainment & Sports
    "Music", "Film & TV", "Gaming", "Sports Teams", "Sports Equipment", "Fitness", "Wellness",
    "Event Management", "Theme Parks", "Casinos", "Streaming", "Live Events", "Talent Management"
  ]

  const LOCATION_OPTIONS = [
    "United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands",
    "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Poland",
    "Australia", "New Zealand", "Japan", "South Korea", "Singapore", "Hong Kong", "India", "China",
    "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru", "South Africa", "Nigeria",
    "Israel", "United Arab Emirates", "Saudi Arabia", "Turkey", "Russia", "Ukraine", "Czech Republic",
    "Europe", "North America", "Asia Pacific", "Latin America", "Middle East", "Africa", "Global"
  ]

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

      if (campaignResponse.ok && campaignResult.success && campaignResult.data?.campaign) {
        const campaign = campaignResult.data.campaign
        
        // Populate keywords from campaign (prospect roles)
        if (campaign.keywords && Array.isArray(campaign.keywords)) {
          setScrappingKeywords(campaign.keywords)
        }
        
        // Set scraping status based on database value
        if (campaign.scrapping_status === 'Active') {
          setScrapingStatus('running')
        } else {
          setScrapingStatus('idle')
        }
        
        console.log('✅ Loaded campaign keywords:', campaign.keywords)
      }

      // Load ICP data from AI assets (now included in campaign response)
      if (campaignResult.data?.aiAssets?.icps) {
        const icps = campaignResult.data.aiAssets.icps
        
        // Extract industries and locations from all ICPs
        const allIndustries: string[] = []
        const allLocations: string[] = []
        
        icps.forEach((icp: any) => {
          if (icp.industries && Array.isArray(icp.industries)) {
            allIndustries.push(...icp.industries)
          }
          if (icp.locations && Array.isArray(icp.locations)) {
            allLocations.push(...icp.locations)
          }
        })
        
        // Remove duplicates and set state
        setICPIndustries([...new Set(allIndustries)])
        setICPLocations([...new Set(allLocations)])
        
        console.log('✅ Loaded ICP data:', {
          industries: [...new Set(allIndustries)],
          locations: [...new Set(allLocations)]
        })
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
    
    // Check if the industry exists in our predefined list (case-insensitive)
    const isValidIndustry = INDUSTRY_OPTIONS.some(industry => 
      industry.toLowerCase() === trimmedIndustry.toLowerCase()
    )
    
    if (trimmedIndustry && isValidIndustry && !icpIndustries.includes(trimmedIndustry)) {
      // Find the exact match from the list to maintain proper casing
      const exactMatch = INDUSTRY_OPTIONS.find(industry => 
        industry.toLowerCase() === trimmedIndustry.toLowerCase()
      )
      
      setICPIndustries([...icpIndustries, exactMatch!])
      setNewICPIndustry("")
      setShowIndustryDropdown(false)
    } else if (trimmedIndustry && !isValidIndustry) {
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
    
    // Check if the location exists in our predefined list (case-insensitive)
    const isValidLocation = LOCATION_OPTIONS.some(location => 
      location.toLowerCase() === trimmedLocation.toLowerCase()
    )
    
    if (trimmedLocation && isValidLocation && !icpLocations.includes(trimmedLocation)) {
      // Find the exact match from the list to maintain proper casing
      const exactMatch = LOCATION_OPTIONS.find(location => 
        location.toLowerCase() === trimmedLocation.toLowerCase()
      )
      
      setICPLocations([...icpLocations, exactMatch!])
      setNewICPLocation("")
      setShowLocationDropdown(false)
    } else if (trimmedLocation && !isValidLocation) {
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
      const filtered = INDUSTRY_OPTIONS.filter(industry => 
        industry.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredIndustries(filtered)
      setShowIndustryDropdown(true)
    } else {
      setShowIndustryDropdown(false)
      setFilteredIndustries([])
    }
  }

  const selectIndustryFromDropdown = (industry: string) => {
    if (!icpIndustries.includes(industry)) {
      setICPIndustries([...icpIndustries, industry])
    }
    setNewICPIndustry("")
    setShowIndustryDropdown(false)
    setFilteredIndustries([])
  }

  // Autocomplete helper functions for locations
  const handleLocationInputChange = (value: string) => {
    setNewICPLocation(value)
    
    if (value.length > 0) {
      const filtered = LOCATION_OPTIONS.filter(location => 
        location.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredLocations(filtered)
      setShowLocationDropdown(true)
    } else {
      setShowLocationDropdown(false)
      setFilteredLocations([])
    }
  }

  const selectLocationFromDropdown = (location: string) => {
    if (!icpLocations.includes(location)) {
      setICPLocations([...icpLocations, location])
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
      const formData = new FormData()
      formData.append('csvFile', uploadedFile)

      const response = await fetch(`/api/campaigns/${campaignId}/contacts/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setUploadSuccess(true)
        setUploadStats({
          imported: result.importedCount,
          duplicates: result.duplicateCount,
          total: result.totalProcessed
        })
        toast.success(`Successfully imported ${result.importedCount} contacts!`)
        
        // Reset file input
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
        setUploadedFile(null)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload CSV file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(243,243,241)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">Target Audience</h1>
              <p className="text-gray-600 text-lg">
                Import contacts or set up automated scraping to build your target list
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
              Import Contacts
            </TabsTrigger>
            <TabsTrigger 
              value="scraping"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              Auto Scraping
            </TabsTrigger>
          </TabsList>

          {/* CSV Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden">
              <CardHeader className="p-8 pb-6">
                <CardTitle className="text-2xl font-medium text-gray-900">Import Contacts</CardTitle>
                <CardDescription className="mt-2 text-gray-600">
                  Upload your contact list from a CSV file
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
                    {uploadSuccess ? 'Upload Successful!' : 'Upload CSV File'}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-6">
                    {uploadSuccess 
                      ? 'Your contacts have been imported successfully.'
                      : 'Import your contacts from a CSV file. Maximum 10,000 contacts.'
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
                        Choose File
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
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload CSV
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
                            {(uploadedFile.size / 1024).toFixed(1)} KB • Ready to upload
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
                  <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• First row must contain column headers</li>
                    <li>• Required fields: Email, First Name, Last Name</li>
                    <li>• Optional fields: Company, Title, Phone, LinkedIn URL</li>
                    <li>• UTF-8 encoding recommended</li>
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
                <CardTitle className="text-2xl font-medium text-gray-900">LinkedIn Contact Scraping</CardTitle>
                <CardDescription className="mt-2 text-gray-600">
                  Automatically find and scrape LinkedIn profiles with email enrichment
                </CardDescription>
              </CardHeader>
            
              <CardContent className="p-8 pt-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700">Target Industries (from ICPs)</label>
                        {showIndustryError && (
                          <div className="relative group">
                            <Info className="w-4 h-4 text-red-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              Please select from dropdown options
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                            <Input
                              placeholder="Type to search industries..."
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
                                {industry}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., CEO, Founder, Manager"
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
                        <label className="block text-sm font-medium text-gray-700">Target Locations (from ICPs)</label>
                        {showLocationError && (
                          <div className="relative group">
                            <Info className="w-4 h-4 text-red-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              Please select from dropdown options
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                            <Input
                              placeholder="Type to search locations..."
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
                                {location}
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
                        Daily Limit
                        <span className="text-xs text-gray-500 ml-1">(Free plan: up to 100/day)</span>
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
                          Starting scraping...
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
                            Scraping Started
                          </div>
                        </Button>
                        <Button
                          onClick={handlePauseScraping}
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600 text-white border-0 rounded-2xl px-4 py-2"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      </div>
                    ) : scrapingStatus === 'completed' ? (
                      <Button
                        onClick={handleSaveScrapingClick}
                        disabled={icpIndustries.length === 0 || scrappingKeywords.length === 0 || icpLocations.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume Scraping
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
                        Start Scraping
                      </Button>
                    )}
                    <div className="text-xs text-gray-500">
                      {isStartingScraping 
                        ? "Starting scraping process..."
                        : scrapingStatus === 'running'
                        ? "Scraping process is running in the background..."
                        : "Fill in industry, add keywords, and specify location to start scraping"
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
              Start Scraping
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
                Cancel
              </Button>
              <Button
                onClick={handleSaveScraping}
                disabled={isStartingScraping}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
              >
                {isStartingScraping ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  "Start"
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
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-light text-base leading-relaxed">
              Unlock higher daily scraping limits and premium features to supercharge your outreach campaigns.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-8 pb-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Free Plan</h4>
                  <p className="text-sm text-gray-500">Up to 100 contacts/day</p>
                </div>
                <div className="text-right">
                  <h4 className="font-medium text-blue-600 mb-1">Pro Plan</h4>
                  <p className="text-sm text-blue-600">Up to 1,000+ contacts/day</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">Higher daily scraping limits</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">Advanced targeting options</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-light">Priority customer support</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeDialog(false)}
                className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl py-3 font-medium transition-all duration-300"
              >
                Maybe Later
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
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}