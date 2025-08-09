"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useOnboarding } from "@/hooks/use-onboarding"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, CheckCircle, ChevronDown, Twitter, Youtube, Instagram, HelpCircle, AlertCircle } from "lucide-react"

// Custom Google Icon SVG (reused from previous pages)
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_1_2)">
      <path
        d="M19.6094 10.2031C19.6094 9.53125 19.5547 8.90625 19.4453 8.28125H10V11.8438H15.4219C15.1875 13.0156 14.4219 14.0156 13.3281 14.6875V17.0156H16.3281C18.1094 15.3906 19.1094 12.9219 19.6094 10.2031Z"
        fill="#4285F4"
      />
      <path
        d="M10 20C12.75 20 15.1094 19.1094 16.9062 17.5L13.3281 14.6875C12.3281 15.3906 11.1094 15.8438 10 15.8438C7.60938 15.8438 5.60938 14.2031 4.90625 11.9062H1.79688V14.3281C2.59375 16.9219 5.01562 18.8438 7.89062 19.6094L10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.90625 11.9062C4.71875 11.3125 4.60938 10.6719 4.60938 10C4.60938 9.32812 4.71875 8.6875 4.90625 8.09375V5.67188H1.79688C1.10938 7.01562 0.75 8.46875 0.75 10C0.75 11.5312 1.10938 12.9844 1.79688 14.3281L4.90625 11.9062Z"
        fill="#FBBC05"
      />
      <path
        d="M10 4.15625C11.3281 4.15625 12.5156 4.60938 13.4531 5.5L16.9062 2.5C15.1094 0.890625 12.75 0 10 0C7.25 0 4.89062 0.890625 3.09375 2.5L4.90625 5.67188C5.60938 3.79688 7.60938 2.15625 10 2.15625V4.15625Z"
        fill="#EA4335"
      />
    </g>
    <defs>
      <clipPath id="clip0_1_2">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export default function CreateUsernamePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const { data, updateData } = useOnboarding()
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Redirect to dashboard - onboarding is disabled
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login")
      } else {
        // Redirect authenticated users to dashboard
        router.push("/")
      }
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    // Load existing data or use user's company name
    if (data.companyName) {
      setUsername(data.companyName)
    } else if (user?.company) {
      setUsername(user.company)
    }
  }, [data.companyName, user?.company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError("Please enter a company name")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Save to onboarding context (no API call)
      updateData({ companyName: username })

      // Navigate to next step
      router.push("/business-category")
    } catch (err) {
      console.error("Error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking authentication
  if (authLoading) {
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
    <main className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Section: Create Username Form */}
      <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
        <div className="absolute top-6 left-6">
          <Image
            src="https://framerusercontent.com/images/96F1neBJPzWDRLRENsy9e6kdROM.png?scale-down-to=512"
            alt="Loop Logo"
            width={150}
            height={150}
            className="object-contain"
          />
        </div>
          <a href="/auth/signup" className="flex items-center space-x-2 text-[#8A2BE2] font-semibold mb-4">
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </a>

          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-[#111111]" style={{fontFamily: 'Switzer, "Switzer Placeholder", sans-serif', lineHeight: '1.2'}}>Choose your username</h1>
            <p className="text-lg text-gray-600" style={{fontFamily: 'Switzer, "Switzer Placeholder", sans-serif'}}>Try something similar to your social handles for easy recognition.</p>
          </div>

          {/* Error Messages */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative flex items-center border border-[#20E070] rounded-xl overflow-hidden">
              <span className="pl-4 pr-2 text-gray-600">app.loopreview.io/</span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="flex-1 py-3 border-none focus:ring-0 focus:border-transparent"
              />
              <CheckCircle className="h-5 w-5 text-[#20E070] mr-4" />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8A2BE2] text-white py-3 rounded-full font-semibold text-lg hover:bg-[#7a24cc] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </section>

      {/* Right Section: Company Name Image */}
      <section className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="w-full h-full relative">
          <Image
            src="/companyname-section-image.png"
            alt="Loop Company Name Illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* Cookie preferences link */}
      <footer className="absolute bottom-4 left-4 text-xs text-gray-500">
        <a href="#" className="underline">
          Cookie preferences
        </a>
      </footer>
    </main>
  )
}