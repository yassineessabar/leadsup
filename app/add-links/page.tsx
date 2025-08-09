"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useOnboarding } from "@/hooks/use-onboarding"

const platforms = [
  { id: 'google', name: 'Google', logo: '/google-logo-new.png', placeholder: 'Your Google Business URL' },
  { id: 'shopify', name: 'Shopify', logo: '/shopify-logo.svg', placeholder: 'Your product review URL' },
  { id: 'amazon', name: 'Amazon', logo: '/amazon-logo.png', placeholder: 'Your product page' },
  { id: 'trustpilot', name: 'Trustpilot', logo: '/trustpilot.svg', placeholder: 'Your truspilot name' },
  { id: 'facebook', name: 'Facebook', logo: '/facebook-logo.png', placeholder: 'Your Facebook page URL' },
  { id: 'video-testimonial', name: 'Upload video testimonials', logo: '/video-testimonial-icon.svg', placeholder: 'Custom video testimonial message' },
  { id: 'booking', name: 'Booking.com', logo: '/booking-logo.svg', placeholder: 'Your property URL' },
  { id: 'airbnb', name: 'Airbnb', logo: '/airbnb-logo.png', placeholder: 'Your listing URL' },
  { id: 'tripadvisor', name: 'TripAdvisor', logo: '/tripadvisor-logo.png', placeholder: 'Your business URL' },
  { id: 'appstore', name: 'App Store', logo: '/appstore-logo.png', placeholder: 'Your Instagram username' },
  { id: 'googlestore', name: 'Google Store', logo: '/gloogletore-logo.png', placeholder: 'Your company page URL' },
]

export default function AddLinksPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { data, updateData } = useOnboarding()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [linkValues, setLinkValues] = useState<Record<string, string>>({})

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    // Load existing data
    if (data.selectedPlatforms) {
      setSelectedPlatforms(data.selectedPlatforms)

      // Initialize linkValues with existing data or empty strings
      const initialValues = data.selectedPlatforms.reduce((acc: Record<string, string>, platformId: string) => {
        // For video testimonial, set special URL to trigger video page
        if (platformId === 'video-testimonial') {
          return { ...acc, [platformId]: data.platformLinks?.[platformId] || '#video-upload' }
        }
        return { ...acc, [platformId]: data.platformLinks?.[platformId] || "" }
      }, {})
      setLinkValues(initialValues)
    }
  }, [data.selectedPlatforms, data.platformLinks])

  const handleInputChange = (id: string, value: string) => {
    setLinkValues((prevValues) => ({
      ...prevValues,
      [id]: value,
    }))
  }

  const handleBack = () => {
    router.push('/select-platform')
  }

  const handleSkip = () => {
    router.push('/company-profile')
  }

  const handleContinue = () => {
    // Save to onboarding context (no API call)
    updateData({ platformLinks: linkValues })

    router.push('/company-profile')
  }

  const isContinueEnabled = Object.entries(linkValues).some(([platformId, value]) => {
    // For video testimonial, it's automatically configured if it has the special URL
    if (platformId === 'video-testimonial') {
      return value === '#video-upload'
    }
    // For other platforms, require actual URLs
    return value.trim() !== ""
  })
  const selectedPlatformData = platforms.filter(p => selectedPlatforms.includes(p.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-violet-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="isolate min-h-screen bg-white">
      <div className="flex min-h-screen flex-col">
        {/* Header with Progress */}
        <header className="sticky top-0 z-10 w-full bg-white p-4 lg:p-6">
          <div className="relative flex h-4 w-full flex-row items-center lg:h-[18px]">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="absolute left-0 flex-none text-sm font-semibold text-gray-600 hover:text-gray-800"
            >
              Back
            </Button>

            <div className="mx-auto w-full max-w-[7.5rem]">
              <div className="flex h-1 gap-2">
                <div className="relative h-full flex-1 overflow-hidden rounded-md bg-gray-200">
                  <div
                    className="h-full bg-[#8A2BE2] transition-transform duration-300"
                    style={{ transform: "scaleX(0.83)" }}
                  />
                </div>
              </div>
            </div>

          </div>
        </header>

        {/* Main Content */}
        <main className="relative mx-auto w-full flex-grow px-4 pb-[7.5rem] pt-4 md:px-6 lg:px-24 lg:pb-[11rem] lg:pt-6">
          <div className="relative mx-auto w-full">
            <div className="mx-auto flex h-full max-w-[800px] flex-col transition-opacity duration-500 opacity-100">
              <div className="text-center mb-8 space-y-2">
                <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-5xl lg:tracking-[-2px] [text-wrap:balance]">Add your links</h1>
                <p className="text-gray-600 text-lg [text-wrap:balance]">Complete the fields below to add your content to your review platform.</p>
              </div>

              <div className="w-full max-w-md space-y-4 mx-auto">
                <h2 className="text-lg font-semibold text-gray-800 text-center">Your selections</h2>
                {selectedPlatformData.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-3">
                    <Image src={platform.logo} alt={platform.name} width={32} height={32} className="object-contain" />
                    {platform.id === 'video-testimonial' ? (
                      <div className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-green-50 flex items-center text-green-700 font-medium">
                        ✅ Upload Video Testimonial - configured
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder={platform.placeholder}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                        value={linkValues[platform.id] || ''}
                        onChange={(e) => handleInputChange(platform.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer with Continue Button */}
        <footer className="pointer-events-auto fixed bottom-0 left-0 z-10 flex w-full items-center justify-center bg-white py-6 px-6 lg:px-14 lg:py-12 md:bg-transparent md:bg-gradient-to-t md:from-white md:via-white/90 md:to-transparent">
          <div className="w-full max-w-lg">
            <Button
              onClick={handleContinue}
              disabled={!isContinueEnabled}
              className={`w-full h-12 rounded-xl font-semibold text-lg transition-all duration-200 ${
                isContinueEnabled
                  ? 'bg-[#8A2BE2] text-white hover:bg-[#7a24cc] shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isContinueEnabled ? 'Continue' : 'Add at least one link to continue'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}