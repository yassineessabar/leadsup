"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useOnboarding } from "@/hooks/use-onboarding"

const businessCategories = [
  "Beauty",
  "Retail & ecommerce",
  "Restaurants & cafes",
  "Real estate",
  "Personal trainer",
  "Healthcare",
  "Automotive",
  "Professional services",
  "Technology",
  "Other"
]

export default function BusinessCategoryPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { data, updateData } = useOnboarding()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [businessDescription, setBusinessDescription] = useState("")

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  // Load existing data
  useEffect(() => {
    if (data.businessCategory) {
      setSelectedCategory(data.businessCategory.category)
      setBusinessDescription(data.businessCategory.description || "")
    }
  }, [data.businessCategory])

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
  }

  const handleBack = () => {
    router.push('/companyname')
  }

  const handleSkip = () => {
    router.push('/select-platform')
  }

  const handleContinue = () => {
    if (selectedCategory) {
      // Save to onboarding context (no API call)
      updateData({
        businessCategory: {
          category: selectedCategory,
          description: businessDescription
        }
      })

      router.push('/select-platform')
    }
  }

  const isContinueEnabled = selectedCategory !== null

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
                    style={{ transform: "scaleX(0.2)" }}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="absolute right-0 flex-none text-sm font-semibold text-gray-600 hover:text-gray-800"
            >
              Skip
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative mx-auto w-full flex-grow px-4 pb-[7.5rem] pt-4 md:px-6 lg:px-24 lg:pb-[11rem] lg:pt-6">
          <div className="relative mx-auto w-full">
            <div className="mx-auto flex h-full max-w-[512px] flex-col transition-opacity duration-500 opacity-100">
              {/* Header */}
              <div className="fade-in-up" style={{ "--fadeInUpStartingY": "1rem", "--fadeInUpDuration": "600ms", "animationDelay": "0ms" } as React.CSSProperties}>
                <header className="flex flex-col gap-2 pb-6 text-center md:gap-4">
                  <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-5xl lg:tracking-[-2px] [text-wrap:balance]">
                    Select your business category
                  </h1>
                  <p className="text-gray-600 text-lg [text-wrap:balance]">
                    Choose the option that best applies.
                  </p>
                </header>
              </div>

              {/* Category Buttons */}
              <div className="space-y-3">
                {businessCategories.map((category, index) => (
                  <div
                    key={category}
                    className="fade-in-up"
                    style={{
                      "--fadeInUpStartingY": `${16 + index * 16}px`,
                      "--fadeInUpDuration": "600ms",
                      "animationDelay": `${150 + index * 10}ms`
                    } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`relative transition duration-75 ease-out rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black antialiased h-12 w-full px-4 font-semibold text-md ${
                        selectedCategory === category
                          ? 'bg-black text-white'
                          : 'text-black bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:border-gray-300 active:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-center">
                        <span className="label block font-semibold text-md">
                          {category}
                        </span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Business Description Textarea - Only show when "Other" is selected */}
              {selectedCategory === "Other" && (
                <div className="fade-in-up mt-4" style={{ "--fadeInUpStartingY": "16px", "--fadeInUpDuration": "600ms", "animationDelay": "0ms" } as React.CSSProperties}>
                  <div className="rounded-[10px] relative focus-within:ring-2 focus-within:ring-black transition duration-75 ease-out hover:shadow-[inset_0_0_0_2px_#e0e2d9] hover:focus-within:shadow-none">
                    <div className="flex w-full rounded-[10px] leading-none border-solid border-2 border-transparent">
                      <div className="relative grow">
                        <textarea
                          placeholder="Share more information about your business..."
                          value={businessDescription}
                          onChange={(e) => setBusinessDescription(e.target.value)}
                          className="text-sm h-24 block p-4 w-full rounded-[10px] bg-gray-50 text-black transition duration-75 ease-out outline-none border-gray-200 min-h-[96px] resize-y"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              {isContinueEnabled ? 'Continue' : 'Select a category to continue'}
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