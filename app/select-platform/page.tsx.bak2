'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { PlatformCard } from '@/components/platform-card'
import { useAuth } from '@/hooks/use-auth'
import { useOnboarding } from '@/hooks/use-onboarding'

const platforms = [
  { id: 'google', name: 'Google', logo: '/google-logo-new.png'},
  { id: 'shopify', name: 'Shopify', logo: '/shopify-logo.svg' },
  { id: 'amazon', name: 'Amazon', logo: '/amazon-logo.png' },
  { id: 'trustpilot', name: 'Trustpilot', logo: '/trustpilot.svg'},
  { id: 'facebook', name: 'Facebook', logo: '/facebook-logo.png' },
 // { id: 'video-testimonial', name: 'Video testimonials', logo: '/video-testimonial-icon.svg'},
  { id: 'booking', name: 'Booking.com', logo: '/booking-logo.svg'},
  { id: 'airbnb', name: 'Airbnb', logo: '/airbnb-logo.png' },
  { id: 'tripadvisor', name: 'TripAdvisor', logo: '/tripadvisor-logo.png'},
  { id: 'appstore', name: 'App Store', logo: '/appstore-logo.png'},
  { id: 'googlestore', name: 'Google Store', logo: '/gloogletore-logo.png' },
]

export default function SelectPlatformsPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { data, updateData } = useOnboarding()
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  // Load existing data
  useEffect(() => {
    if (data.selectedPlatforms) {
      setSelectedPlatforms(data.selectedPlatforms)
    }
  }, [data.selectedPlatforms])

  const handlePlatformSelect = (id: string) => {
    setSelectedPlatforms((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((platformId) => platformId !== id)
      } else if (prevSelected.length < 5) {
        return [...prevSelected, id]
      }
      return prevSelected // Do not add if already 5 selected
    })
  }

  const isContinueEnabled = selectedPlatforms.length > 0

  const handleContinue = () => {
    if (isContinueEnabled) {
      // Save to onboarding context (no API call)
      updateData({ selectedPlatforms })

      router.push('/add-links')
    }
  }

  const handleBack = () => {
    router.push('/business-category')
  }

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
                    style={{ transform: "scaleX(0.66)" }}
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
              {/* Header */}
              <div className="fade-in-up" style={{ "--fadeInUpStartingY": "1rem", "--fadeInUpDuration": "600ms", "animationDelay": "0ms" } as React.CSSProperties}>
                <header className="flex flex-col gap-2 pb-6 text-center md:gap-4">
                  <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-5xl lg:tracking-[-2px] [text-wrap:balance]">
                    Which platforms do you want reviews on?
                  </h1>
                  <p className="text-gray-600 text-lg [text-wrap:balance]">
                    Pick up to five to get started. You can update at any time.
                  </p>
                </header>
              </div>

              {/* Platform Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 max-w-xl w-full mx-auto">
                {platforms.map((platform, index) => (
                  <div
                    key={platform.id}
                    className="fade-in-up"
                    style={{
                      "--fadeInUpStartingY": "0px",
                      "--fadeInUpDuration": "600ms",
                      "animationDelay": `${index * 50}ms`
                    } as React.CSSProperties}
                  >
                    <PlatformCard
                      platform={platform}
                      isSelected={selectedPlatforms.includes(platform.id)}
                      onSelect={handlePlatformSelect}
                    />
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
              {isContinueEnabled ? 'Continue' : 'Select platforms to continue'}
            </Button>
          </div>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        .fade-in-up {
          animation: fadeInUp var(--fadeInUpDuration) ease-out forwards;
          opacity: 0;
          transform: translateY(var(--fadeInUpStartingY));
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}