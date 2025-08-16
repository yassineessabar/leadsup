// Target tab content component
import React, { useState } from 'react'
import { Upload, Search, Target, Plus, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface TargetTabProps {
  campaignId: string | number
  scrappingIndustry: string
  setScrappingIndustry: (value: string) => void
  scrappingKeywords: string[]
  setScrappingKeywords: (value: string[]) => void
  scrappingLocations: string[]
  setScrappingLocations: (value: string[]) => void
  scrappingDailyLimit: number
  setScrappingDailyLimit: (value: number) => void
  handleStartScrapping: (type: string) => void
  isScrappingActive: boolean
  scrapingStatus: string
}

export function TargetTab({
  campaignId,
  scrappingIndustry,
  setScrappingIndustry,
  scrappingKeywords,
  setScrappingKeywords,
  scrappingLocations,
  setScrappingLocations,
  scrappingDailyLimit,
  setScrappingDailyLimit,
  handleStartScrapping,
  isScrappingActive,
  scrapingStatus
}: TargetTabProps) {
  const [keywordInput, setKeywordInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [activeTargetTab, setActiveTargetTab] = useState('scraping')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadStats, setUploadStats] = useState<{
    imported: number
    duplicates: number
    total: number
  } | null>(null)

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

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !scrappingKeywords.includes(keywordInput.trim())) {
      setScrappingKeywords([...scrappingKeywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  const handleAddLocation = () => {
    if (locationInput.trim() && !scrappingLocations.includes(locationInput.trim())) {
      setScrappingLocations([...scrappingLocations, locationInput.trim()])
      setLocationInput('')
    }
  }

  const handleRemoveKeyword = (index: number) => {
    setScrappingKeywords(scrappingKeywords.filter((_, i) => i !== index))
  }

  const handleRemoveLocation = (index: number) => {
    setScrappingLocations(scrappingLocations.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Clean Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-light text-gray-900 tracking-tight">Target Audience</h1>
          <p className="text-gray-500 mt-2 font-light">Define your campaign target audience</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light text-gray-900">
            {scrappingKeywords.length > 0 ? `${scrappingKeywords.length} criteria` : '0'}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Defined</div>
        </div>
      </div>

      {/* Main Card */}
      <Card className="bg-white rounded-3xl border border-gray-100/50 overflow-hidden">
        <CardHeader className="p-8 pb-6">
          <CardTitle className="text-2xl font-medium flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            Define Your Target
          </CardTitle>
          <CardDescription className="mt-2 text-gray-500">
            Choose how you want to build your prospect list
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 pt-0">
          <Tabs value={activeTargetTab} onValueChange={setActiveTargetTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-gray-100/50 rounded-2xl">
              <TabsTrigger 
                value="import" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </TabsTrigger>
              <TabsTrigger 
                value="scraping" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Search className="w-4 h-4" />
                Auto Scraping
              </TabsTrigger>
            </TabsList>

            {/* Import CSV Tab */}
            <TabsContent value="import" className="mt-8">
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
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isScrappingActive || isUploading}
                        />
                        <Button
                          as="span"
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3"
                          disabled={isScrappingActive || isUploading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      </label>
                      
                      {uploadedFile && (
                        <Button
                          onClick={handleCsvUpload}
                          disabled={isUploading || isScrappingActive}
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
            </TabsContent>

            {/* Auto Scraping Tab */}
            <TabsContent value="scraping" className="mt-8">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Search className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Automatic Scraping</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Our system will search for qualified prospects based on your criteria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Role/Title */}
                  <div className="space-y-2">
                    <Label htmlFor="keywords" className="text-sm font-medium text-gray-700">
                      Role / Job Title
                    </Label>
                    <div className="space-y-2">
                      {/* Display existing keywords */}
                      <div className="flex flex-wrap gap-2">
                        {scrappingKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {keyword}
                            <button
                              onClick={() => handleRemoveKeyword(index)}
                              className="ml-1 hover:text-blue-900"
                              disabled={isScrappingActive}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Input for new keyword */}
                      <div className="flex gap-2">
                        <Input
                          id="keywords"
                          placeholder="e.g., Marketing Director"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddKeyword()
                            }
                          }}
                          disabled={isScrappingActive}
                          className="rounded-xl"
                        />
                        <Button
                          onClick={handleAddKeyword}
                          disabled={isScrappingActive || !keywordInput.trim()}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Industry Sector */}
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                      Industry Sector
                    </Label>
                    <Input
                      id="industry"
                      placeholder="e.g., SaaS Software"
                      value={scrappingIndustry}
                      onChange={(e) => setScrappingIndustry(e.target.value)}
                      disabled={isScrappingActive}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Country/Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                      Country / Location
                    </Label>
                    <div className="space-y-2">
                      {/* Display existing locations */}
                      <div className="flex flex-wrap gap-2">
                        {scrappingLocations.map((location, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {location}
                            <button
                              onClick={() => handleRemoveLocation(index)}
                              className="ml-1 hover:text-green-900"
                              disabled={isScrappingActive}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Input for new location */}
                      <div className="flex gap-2">
                        <Input
                          id="location"
                          placeholder="e.g., United States"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddLocation()
                            }
                          }}
                          disabled={isScrappingActive}
                          className="rounded-xl"
                        />
                        <Button
                          onClick={handleAddLocation}
                          disabled={isScrappingActive || !locationInput.trim()}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Maximum Volume */}
                  <div className="space-y-2">
                    <Label htmlFor="volume" className="text-sm font-medium text-gray-700">
                      Maximum Volume
                    </Label>
                    <Input
                      id="volume"
                      type="number"
                      min="1"
                      max="1000"
                      value={scrappingDailyLimit}
                      onChange={(e) => setScrappingDailyLimit(parseInt(e.target.value) || 100)}
                      disabled={isScrappingActive}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-gray-500">Daily limit for new contacts</p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <Button
                    onClick={() => handleStartScrapping('combined')}
                    disabled={
                      isScrappingActive || 
                      !scrappingIndustry || 
                      scrappingKeywords.length === 0 || 
                      scrappingLocations.length === 0
                    }
                    className={`w-full rounded-2xl py-3 font-medium transition-all duration-300 ${
                      isScrappingActive 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : scrapingStatus === 'completed'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isScrappingActive ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />
                        Processing...
                      </>
                    ) : scrapingStatus === 'completed' ? (
                      <>
                        <Search className="w-4 h-4 mr-2 inline-block" />
                        Run Again
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2 inline-block" />
                        Start Scraping
                      </>
                    )}
                  </Button>
                  {!scrappingIndustry || scrappingKeywords.length === 0 || scrappingLocations.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Please fill in all required fields to start scraping
                    </p>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}