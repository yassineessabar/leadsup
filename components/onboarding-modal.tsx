"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { UploadCloud, ExternalLink, Copy, Sparkles, ArrowRight, CheckCircle, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import Image from "next/image"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  userCompanyName: string
}

interface OnboardingData {
  companyLogo: string | null
  enabledPlatforms: string[]
  googleUrl: string
  trustpilotUrl: string
  facebookUrl: string
  videoTestimonialMessage?: string
  googlePlaceId?: string
  googleBusinessName?: string
}

export function OnboardingModal({ isOpen, onClose, onComplete, userCompanyName }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { updateLogo } = useCompanyLogo()

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    companyLogo: null,
    enabledPlatforms: ["Google", "Trustpilot"],
    googleUrl: "",
    trustpilotUrl: "",
    facebookUrl: "",
    videoTestimonialMessage: "",
    googlePlaceId: "",
    googleBusinessName: "",
  })

  // Integration step states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [integrationConnected, setIntegrationConnected] = useState(false)

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const logoUrl = reader.result as string
        setOnboardingData(prev => ({ ...prev, companyLogo: logoUrl }))

        // Update logo across all components using the hook
        const result = await updateLogo(logoUrl)
        if (result.success) {
          toast({
            title: "Logo uploaded!",
            description: "Your company logo has been uploaded and synchronized across all components."
          })
        } else {
          toast({
            title: "Logo uploaded!",
            description: "Your company logo has been uploaded successfully."
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }, [updateLogo])

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearchPlaces(searchQuery)
    }, 500) // 500ms debounce delay

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handlePlatformToggle = (platform: string, enabled: boolean) => {
    setOnboardingData(prev => ({
      ...prev,
      enabledPlatforms: enabled
        ? [...prev.enabledPlatforms, platform]
        : prev.enabledPlatforms.filter(p => p !== platform)
    }))
  }

  const handleGenerateUrl = async () => {
    setIsLoading(true)
    try {
      // Save onboarding data and generate URL
      const dataToSave = {
        company_logo_url: onboardingData.companyLogo,
        enabled_platforms: onboardingData.enabledPlatforms,
        google_review_link: onboardingData.googleUrl,
        trustpilot_review_link: onboardingData.trustpilotUrl,
        facebook_review_link: onboardingData.facebookUrl,
        video_testimonial_message: onboardingData.videoTestimonialMessage,
      }

      const response = await fetch('/api/review-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.review_url) {
          setGeneratedUrl(result.data.review_url)
          setCurrentStep(4)
          toast({
            title: "Review link generated!",
            description: "Your personalized review link is ready to use.",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate review link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedUrl)
    toast({
      title: "Link copied!",
      description: "Your review link has been copied to the clipboard.",
    })
  }

  const handleComplete = () => {
    onComplete()
    onClose()
  }

  // Google Places search functionality
  const handleSearchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/google-places/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success && data.results) {
        setSearchResults(data.results)
      } else {
        console.error("Search failed:", data.error)
        setSearchResults([])
        toast({
          title: "Search Failed",
          description: data.error || 'Unable to search for businesses. You can skip this step for now.',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error searching places:", error)
      setSearchResults([])
      toast({
        title: "Network Error",
        description: 'Unable to search for businesses. You can skip this step for now.',
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleConnectBusiness = async (placeId: string, businessName: string, address: string) => {
    setIsLoading(true)
    try {
      // Save Google integration
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'google',
          business_name: businessName,
          business_id: placeId,
          additional_data: {
            formatted_address: address,
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        setOnboardingData(prev => ({
          ...prev,
          googlePlaceId: placeId,
          googleBusinessName: businessName,
        }))
        setIntegrationConnected(true)

        // Try to import reviews automatically
        try {
          await fetch('/api/google-places/reviews')
          toast({
            title: "Business Connected!",
            description: `Successfully connected ${businessName} and started importing reviews.`
          })
        } catch {
          toast({
            title: "Business Connected!",
            description: `Successfully connected ${businessName}. Reviews will be imported shortly.`
          })
        }
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect your business. You can set this up later in the integrations tab.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error connecting business:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect your business. You can set this up later in the integrations tab.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const stepTitles = [
    "Welcome to Loop Reviews!",
    "Set Up Your Review Platforms",
    "Connect Your Google Business",
    "Your Review Link is Ready!"
  ]

  const stepDescriptions = [
    "Let's get your review collection system set up in just a few steps.",
    "Choose which platforms you want to collect reviews on and add your links.",
    "Connect your Google Business listing to import reviews automatically.",
    "Your personalized review link has been generated and is ready to share!"
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to right, rgb(87, 140, 255), rgb(67, 120, 235))' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{stepTitles[currentStep - 1]}</DialogTitle>
              <p className="text-gray-600 mt-1">{stepDescriptions[currentStep - 1]}</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? "bg-blue-500 text-white"
                      : step < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Welcome & Logo Upload */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Welcome, {userCompanyName}!</h3>
                    <p className="text-gray-600">
                      We're excited to help you collect more reviews and grow your business.
                      Let's start by uploading your company logo to personalize your review page.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Company Logo (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <Image
                        src={onboardingData.companyLogo || "/placeholder.svg?height=64&width=64&text=Logo"}
                        alt="Company Logo"
                        width={64}
                        height={64}
                        className="h-16 w-16 object-contain rounded-lg border"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="sr-only"
                        accept="image/*"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <UploadCloud className="w-4 h-4" />
                        Upload Logo
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Your logo will appear on your review page to maintain brand consistency.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Platform Selection & URLs */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Select Review Platforms</Label>
                    <p className="text-sm text-gray-600">
                      Choose which platforms you want to collect reviews on for positive feedback.
                    </p>
                    <div className="space-y-3">
                      {["Google", "Trustpilot", "Facebook", "Video Testimonial"].map((platform) => (
                        <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                          <Label htmlFor={`platform-${platform}`} className="font-medium">
                            {platform}
                          </Label>
                          <Switch
                            id={`platform-${platform}`}
                            checked={onboardingData.enabledPlatforms.includes(platform)}
                            onCheckedChange={(checked) => handlePlatformToggle(platform, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Platform Review Links</Label>
                    <p className="text-sm text-gray-600">
                      Add your direct review page URLs for each enabled platform.
                    </p>

                    {onboardingData.enabledPlatforms.includes("Google") && (
                      <div className="space-y-2">
                        <Label htmlFor="googleUrl">Google Business Profile Review Link</Label>
                        <Input
                          id="googleUrl"
                          value={onboardingData.googleUrl}
                          onChange={(e) => setOnboardingData(prev => ({ ...prev, googleUrl: e.target.value }))}
                          placeholder="https://g.page/your-business/review"
                        />
                      </div>
                    )}

                    {onboardingData.enabledPlatforms.includes("Trustpilot") && (
                      <div className="space-y-2">
                        <Label htmlFor="trustpilotUrl">Trustpilot Review Link</Label>
                        <Input
                          id="trustpilotUrl"
                          value={onboardingData.trustpilotUrl}
                          onChange={(e) => setOnboardingData(prev => ({ ...prev, trustpilotUrl: e.target.value }))}
                          placeholder="https://www.trustpilot.com/review/your-company.com"
                        />
                      </div>
                    )}

                    {onboardingData.enabledPlatforms.includes("Facebook") && (
                      <div className="space-y-2">
                        <Label htmlFor="facebookUrl">Facebook Page Review Link</Label>
                        <Input
                          id="facebookUrl"
                          value={onboardingData.facebookUrl}
                          onChange={(e) => setOnboardingData(prev => ({ ...prev, facebookUrl: e.target.value }))}
                          placeholder="https://www.facebook.com/yourpage/reviews/"
                        />
                      </div>
                    )}

                    {onboardingData.enabledPlatforms.includes("Video Testimonial") && (
                      <div className="space-y-2">
                        <Label htmlFor="videoTestimonialMessage">Video Testimonial Message</Label>
                        <Input
                          id="videoTestimonialMessage"
                          value={onboardingData.videoTestimonialMessage || ''}
                          onChange={(e) => setOnboardingData(prev => ({ ...prev, videoTestimonialMessage: e.target.value }))}
                          placeholder="Custom message for video testimonial requests"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Google Business Integration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Connect Your Google Business (Optional)</h3>
                    <p className="text-gray-600">
                      Connect your Google Business listing to automatically import reviews and enable
                      direct reply functionality. You can skip this step and set it up later.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {!integrationConnected ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Search for Your Business</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Enter your business name or location..."
                          className="pl-10 pr-12 py-3 bg-gray-50 border-gray-200 rounded-lg focus:border-[#e66465] focus:ring-[#e66465] transition-colors duration-200"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#e66465] rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>

                      {searchResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm">
                          {searchResults.map((result) => (
                            <Button
                              key={result.place_id}
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                              onClick={() => handleConnectBusiness(result.place_id, result.name, result.formatted_address)}
                              disabled={isLoading}
                            >
                              <div className="flex flex-col items-start w-full">
                                <span className="font-medium text-gray-900">{result.name}</span>
                                <span className="text-sm text-gray-500 truncate w-full">{result.formatted_address}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}

                      {searchQuery && searchResults.length === 0 && !isSearching && (
                        <div className="text-center py-4 space-y-3">
                          <p className="text-sm text-gray-500">No results found. Try a different search term.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const manualPlaceId = `manual_${Date.now()}`
                              handleConnectBusiness(manualPlaceId, searchQuery, searchQuery)
                            }}
                            className="text-xs"
                            disabled={isLoading}
                          >
                            Connect Manually with "{searchQuery}"
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                      <h3 className="text-lg font-semibold text-green-700">Business Connected!</h3>
                      <p className="text-gray-600">
                        {onboardingData.googleBusinessName} has been successfully connected.
                        Your reviews are being imported automatically.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleGenerateUrl}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? "Generating..." : "Generate Review Link"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Generated URL & Customization */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                      <h3 className="text-lg font-semibold">Congratulations!</h3>
                      <p className="text-gray-600">
                        Your personalized review link has been created. Share this link with your customers
                        to start collecting reviews.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Your Review Link</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={generatedUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(generatedUrl, '_blank')}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Share this link via email, SMS, QR codes, or on your website to collect reviews.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onComplete}>
                    Customize Link Page
                  </Button>
                  <Button onClick={handleComplete}>
                    Complete Setup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}