// Target tab content component
import React, { useState, KeyboardEvent, useEffect } from 'react'
import { Upload, Check, Search, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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

  // Scraping state (UI only - non-functional)
  const [scrappingIndustry, setScrappingIndustry] = useState("")
  const [scrappingKeywords, setScrappingKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [scrappingLocation, setScrappingLocation] = useState("")
  const [scrappingDailyLimit, setScrappingDailyLimit] = useState(100)
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [isStartingScraping, setIsStartingScraping] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)

  // Fetch saved scraping configuration
  const fetchScrapingConfig = async () => {
    try {
      setIsLoadingConfig(true)
      
      const response = await fetch(`/api/campaigns/${campaignId}/save`, {
        method: 'GET',
        credentials: 'include'
      })

      const result = await response.json()

      if (response.ok && result.success && result.data?.campaign) {
        const campaign = result.data.campaign
        
        // Populate form fields with saved data
        if (campaign.industry) {
          setScrappingIndustry(campaign.industry)
        }
        if (campaign.keywords && Array.isArray(campaign.keywords)) {
          setScrappingKeywords(campaign.keywords)
        }
        if (campaign.location) {
          setScrappingLocation(campaign.location)
        }
        
        console.log('✅ Loaded scraping configuration:', {
          industry: campaign.industry,
          keywords: campaign.keywords,
          location: campaign.location
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

  // Save scraping configuration
  const handleSaveScraping = async () => {
    if (!scrappingIndustry || scrappingKeywords.length === 0 || !scrappingLocation) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsStartingScraping(true)
    
    try {
      const scrapingData = {
        industry: scrappingIndustry,
        keywords: scrappingKeywords,
        location: scrappingLocation,
        dailyLimit: scrappingDailyLimit
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
        toast.success("Scraping configuration saved! We will start scraping and you'll see the leads in your campaign contacts.")
        setScrapingStatus('idle') // Reset status after successful save
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <Input
                        placeholder="e.g., Technology, Marketing"
                        value={scrappingIndustry}
                        onChange={(e) => setScrappingIndustry(e.target.value)}
                        disabled={isScrappingActive || isLoadingConfig}
                      />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <Input
                        placeholder="e.g., San Francisco, CA"
                        value={scrappingLocation}
                        onChange={(e) => setScrappingLocation(e.target.value)}
                        disabled={isScrappingActive || isLoadingConfig}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={scrappingDailyLimit}
                        onChange={(e) => setScrappingDailyLimit(parseInt(e.target.value) || 100)}
                        disabled={isScrappingActive || isLoadingConfig}
                        min="1"
                        max="500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isScrappingActive ? (
                      <>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                          disabled={true}
                        >
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isStartingScraping ? "Starting scraping..." : "Scraping is running..."}
                          </div>
                        </Button>
                        <Button
                          onClick={handleStopScraping}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-2xl px-3 py-1 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                      </>
                    ) : scrapingStatus === 'completed' ? (
                      <Button
                        onClick={handleSaveScraping}
                        disabled={!scrappingIndustry || scrappingKeywords.length === 0 || !scrappingLocation}
                        className="bg-green-600 hover:bg-green-700 text-white border-0 rounded-2xl px-6 py-3"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Save Configuration
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSaveScraping}
                        disabled={!scrappingIndustry || scrappingKeywords.length === 0 || !scrappingLocation}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-2xl px-6 py-3"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Save Configuration
                      </Button>
                    )}
                    <div className="text-xs text-gray-500">
                      {isScrappingActive 
                        ? "Scraping process is running in the background..."
                        : "Fill in industry, add keywords, and specify location to save scraping configuration"
                      }
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}