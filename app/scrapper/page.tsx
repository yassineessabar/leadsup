"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Target, 
  Search, 
  Users, 
  MapPin, 
  Building2, 
  Briefcase, 
  Linkedin, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  type?: string
  status?: string
}

interface ScrapedContact {
  id?: number
  first_name: string
  last_name: string
  email?: string
  title?: string
  company?: string
  location?: string
  linkedin?: string
  image_url?: string
}

export default function ScrapperPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [selectedCampaign, setSelectedCampaign] = useState<string>("")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [isScrapingActive, setIsScrapingActive] = useState(false)
  const [scrapedContacts, setScrapedContacts] = useState<ScrapedContact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [company, setCompany] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [industry, setIndustry] = useState("")
  const [scrapingProgress, setScrapingProgress] = useState(0)
  const [totalToScrape, setTotalToScrape] = useState(100)

  // Get campaign from URL parameter
  useEffect(() => {
    const campaignId = searchParams.get('campaign')
    if (campaignId) {
      setSelectedCampaign(campaignId)
    }
  }, [searchParams])

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns', {
          credentials: 'include'
        })
        const data = await response.json()
        
        if (data.success && data.data) {
          setCampaigns(data.data)
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      }
    }

    fetchCampaigns()
  }, [])

  const handleStartScraping = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign first",
        variant: "destructive"
      })
      return
    }

    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required", 
        description: "Please enter a search query or keywords",
        variant: "destructive"
      })
      return
    }

    setIsScrapingActive(true)
    setScrapingProgress(0)
    setScrapedContacts([])

    // Simulate scraping process
    const mockScraping = () => {
      const interval = setInterval(() => {
        setScrapingProgress(prev => {
          const newProgress = prev + Math.random() * 10
          
          // Add mock scraped contacts
          if (newProgress > prev + 5) {
            const mockContact: ScrapedContact = {
              first_name: `Contact ${Math.floor(newProgress / 10)}`,
              last_name: `Last${Math.floor(newProgress / 10)}`,
              email: `contact${Math.floor(newProgress / 10)}@example.com`,
              title: jobTitle || "Software Engineer",
              company: company || "Tech Company",
              location: location || "San Francisco, CA",
              linkedin: `https://linkedin.com/in/contact${Math.floor(newProgress / 10)}`,
              image_url: `https://ui-avatars.com/api/?name=Contact+${Math.floor(newProgress / 10)}&background=3b82f6&color=fff`
            }
            
            setScrapedContacts(prev => [...prev, mockContact])
          }

          if (newProgress >= totalToScrape) {
            clearInterval(interval)
            setIsScrapingActive(false)
            toast({
              title: "Scraping Complete",
              description: `Successfully scraped ${Math.floor(newProgress / 10)} contacts`
            })
            return totalToScrape
          }
          
          return newProgress
        })
      }, 500)
    }

    mockScraping()
  }

  const handleStopScraping = () => {
    setIsScrapingActive(false)
    toast({
      title: "Scraping Stopped",
      description: "Contact scraping has been paused"
    })
  }

  const handleImportContacts = async () => {
    if (scrapedContacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "No contacts to import",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      
      const contactsToImport = scrapedContacts.map(contact => ({
        ...contact,
        campaign_id: selectedCampaign
      }))

      const response = await fetch('/api/contacts/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contacts: contactsToImport })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Import Successful",
          description: `${scrapedContacts.length} contacts imported successfully`
        })
        
        // Redirect back to leads with success
        router.push('/?tab=leads')
      } else {
        throw new Error(data.error || 'Import failed')
      }
    } catch (error) {
      console.error('Error importing contacts:', error)
      toast({
        title: "Import Failed", 
        description: error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedCampaignName = campaigns.find(c => c.id === selectedCampaign)?.name || "Unknown Campaign"

  return (
    <div className="min-h-screen bg-gray-50/30 p-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm mb-6">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/?tab=leads')}
                className="text-gray-600 hover:text-gray-900 p-2 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-light text-gray-900 tracking-tight">Auto Scrapper</h1>
                  <p className="text-gray-600 text-sm">Automatically find and import LinkedIn contacts</p>
                </div>
              </div>
            </div>
            
            {selectedCampaign && (
              <Badge className="bg-blue-100 text-blue-700 rounded-xl px-3 py-1 font-medium">
                Campaign: {selectedCampaignName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Search Configuration */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Search Configuration</h2>
              
              <div className="space-y-6">
                {/* Campaign Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Campaign
                  </label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="w-full border-gray-200/50 rounded-2xl bg-white/50 h-11">
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Query */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Keywords *
                  </label>
                  <Textarea
                    placeholder="e.g., software engineer, startup founder, marketing manager"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50"
                    rows={3}
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <Input
                    placeholder="e.g., San Francisco, CA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                  />
                </div>

                {/* Company Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <Input
                    placeholder="e.g., Google, Apple, Startup"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                  />
                </div>

                {/* Job Title Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title
                  </label>
                  <Input
                    placeholder="e.g., CEO, CTO, Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                  />
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <Input
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="border-gray-200/50 rounded-2xl focus:border-blue-600 focus:ring-blue-600 bg-white/50 h-11"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100/50">
                  {!isScrapingActive ? (
                    <Button
                      onClick={handleStartScraping}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Scraping
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopScraping}
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-2xl px-6 py-3 font-medium"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Scraping
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100/20 rounded-3xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Scraped Contacts</h2>
                <div className="flex items-center space-x-3">
                  <Badge className="bg-gray-100 text-gray-700 rounded-xl px-3 py-1 font-medium">
                    {scrapedContacts.length} found
                  </Badge>
                  {scrapedContacts.length > 0 && (
                    <Button
                      onClick={handleImportContacts}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-4 py-2 font-medium transition-all duration-200 hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Import All
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isScrapingActive && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Scraping Progress</span>
                    <span className="text-sm text-gray-600">{Math.floor(scrapingProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(scrapingProgress, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="space-y-3">
                {scrapedContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-light text-gray-900 mb-2">
                      {isScrapingActive ? 'Searching for contacts...' : 'Ready to Start Scraping'}
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      {isScrapingActive 
                        ? 'We\'re searching LinkedIn for contacts matching your criteria.'
                        : 'Configure your search parameters and click "Start Scraping" to begin finding contacts.'
                      }
                    </p>
                  </div>
                ) : (
                  scrapedContacts.map((contact, index) => (
                    <div key={index} className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {contact.image_url ? (
                            <img src={contact.image_url} alt={`${contact.first_name} ${contact.last_name}`} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-blue-600 font-medium text-sm">
                              {contact.first_name[0]}{contact.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</h4>
                              <p className="text-sm text-gray-500">{contact.email}</p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                            {contact.title && (
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {contact.title}
                              </div>
                            )}
                            {contact.company && (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {contact.company}
                              </div>
                            )}
                            {contact.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {contact.location}
                              </div>
                            )}
                            {contact.linkedin && (
                              <div className="flex items-center gap-1">
                                <Linkedin className="w-3 h-3" />
                                LinkedIn
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}