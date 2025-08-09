"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, User, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useOnboarding } from "@/hooks/use-onboarding"

export default function AddProfileDetailsPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { data, updateData } = useOnboarding()
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const maxBioLength = 160

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [loading, isAuthenticated, router])

  // Load existing data
  useEffect(() => {
    if (data.companyProfile) {
      setDisplayName(data.companyProfile.displayName || "")
      setBio(data.companyProfile.bio || "")
      setProfileImage(data.companyProfile.profileImage || null)
    }
  }, [data.companyProfile])

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxBioLength) {
      setBio(value)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBack = () => {
    router.push('/add-links')
  }

  const handleSkip = () => {
    router.push('/completion')
  }

  const handleContinue = () => {
    // Save to onboarding context (no API call)
    updateData({
      companyProfile: {
        displayName,
        bio,
        profileImage
      }
    })

    router.push('/completion')
  }

  const isContinueEnabled = true // Allow proceeding without profile image

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
                    style={{ transform: "scaleX(1)" }}
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
              <div className="text-center mb-8 space-y-2">
                <h1 className="text-black text-[32px] font-extrabold leading-tight tracking-[-1px] lg:text-5xl lg:tracking-[-2px] [text-wrap:balance]">Add profile details</h1>
                <p className="text-gray-600 text-lg [text-wrap:balance]">Upload your company profile picture.</p>
              </div>

              <div className="w-full max-w-md space-y-8 mx-auto">
                {/* Profile Image Placeholder */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-24 w-24 text-gray-400" />
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="profile-image-upload"
                    />
                    <Button
                      onClick={() => document.getElementById('profile-image-upload')?.click()}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                    </Button>
                  </div>
                </div>

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
              className="w-full h-12 rounded-xl font-semibold text-lg transition-all duration-200 bg-[#8A2BE2] text-white hover:bg-[#7a24cc] shadow-lg"
            >
              Continue
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}