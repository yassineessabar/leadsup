"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { templates } from "@/data/templates"
import { Template } from "@/types/templates"
import { useAuth } from "@/hooks/use-auth"

export default function SelectTemplatePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
  }

  const handleContinue = async () => {
    if (selectedTemplate) {
      // Store selected template in localStorage or state management
      localStorage.setItem('selectedTemplate', selectedTemplate)

      // Also save to database
      try {
        const response = await fetch('/api/save-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            selectedTemplate
          }),
        })

        if (response.ok) {
          } else {
          console.error('❌ Failed to save selected template to database')
          // Continue anyway, data is stored in localStorage
        }
      } catch (error) {
        console.error('❌ Error saving selected template:', error)
        // Continue anyway, data is stored in localStorage
      }

      // Set flag to ensure onboarding flow continues properly
      sessionStorage.setItem('onboarding_in_progress', 'true')
      // Navigate to platform selection page
      router.push('/select-platform')
    }
  }

  const handleBack = () => {
    router.push('/business-category')
  }

  const handleSkip = () => {
    // Set a default template or continue without template
    localStorage.setItem('selectedTemplate', 'default')
    // Set flag to ensure onboarding flow continues properly
    sessionStorage.setItem('onboarding_in_progress', 'true')
    router.push('/select-platform')
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
                    style={{ transform: "scaleX(0.5)" }}
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
            <div className="mx-auto flex h-full max-w-[800px] flex-col transition-opacity duration-500 opacity-100">
              {/* Header */}
              <div className="fade-in-up" style={{ "--fadeInUpStartingY": "1rem", "--fadeInUpDuration": "600ms", "animationDelay": "0ms" } as React.CSSProperties}>
                <header className="flex flex-col gap-2 pb-6 text-center md:gap-4">
                  <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-5xl lg:tracking-[-2px] [text-wrap:balance]">
                    Select a template
                  </h1>
                  <p className="text-gray-600 text-lg [text-wrap:balance]">
                    Pick the style that feels right - you can add your content later
                  </p>
                </header>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-6">
                {templates.map((template, index) => (
                  <div
                    key={template.id}
                    className="fade-in-up"
                    style={{
                      "--fadeInUpStartingY": "0px",
                      "--fadeInUpDuration": "600ms",
                      "animationDelay": `${index * 50}ms`
                    } as React.CSSProperties}
                  >
                    <div className="flex flex-col items-center">
                      <button
                        className={`block overflow-hidden rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                          selectedTemplate === template.id
                            ? 'ring-4 ring-black shadow-lg scale-105'
                            : 'hover:ring-2 hover:ring-gray-300'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                        aria-label={`Select ${template.name} template`}
                      >
                        <div style={{ aspectRatio: "172.5 / 320" }}>
                          <Image
                            alt={template.name}
                            className="pointer-events-none block h-full w-full object-cover"
                            src={template.imageUrl}
                            width={173}
                            height={320}
                            loading="lazy"
                          />
                        </div>
                      </button>

                      {/* Template Name - Show on hover or selection */}
                      <div className={`mt-2 text-center transition-opacity duration-200 ${
                        selectedTemplate === template.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <span className="text-sm font-medium text-gray-700">
                          {template.name}
                        </span>
                        <div className="text-xs text-gray-500 capitalize">
                          {template.category}
                        </div>
                      </div>
                    </div>
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
              disabled={!selectedTemplate}
              className={`w-full h-12 rounded-xl font-semibold text-lg transition-all duration-200 ${
                selectedTemplate
                  ? 'bg-[#8A2BE2] text-white hover:bg-[#7a24cc] shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedTemplate ? 'Start with this template' : 'Select a template to continue'}
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