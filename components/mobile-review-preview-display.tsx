"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Star, Video, CheckCircle, Loader2, ArrowLeft, Globe } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { useClickTracking } from "@/components/click-tracking"

interface Link {
  id: number
  title: string
  url: string
  clicks: number
  isActive: boolean
  platformId?: string
  platformLogo?: string
}

interface MobileReviewPreviewDisplayProps {
  formData: {
    companyName: string
    companyLogo: string | null
    profilePictureUrl?: string | null
    bio?: string | null
    messages: {
      rating_page_content: string
      redirect_text: string
      notification_text: string
      video_upload_text: string
    }
    conditionalActions: {
      [key: number]: { type: string; value?: string; platform?: string }
    }
    trustpilotUrl: string
    googleUrl: string
    facebookUrl: string // New prop for Facebook URL
    shopifyUrl: string // New prop for Shopify URL
    primaryColor: string
    secondaryColor: string
    enabledPlatforms: string[] // New prop for enabled platforms
    links?: Link[] // New prop for configured links
    headerSettings?: { header: string; text: string } // New prop for header settings
    initialViewSettings?: { header: string; text: string } // New prop for initial view settings
    negativeSettings?: { header: string; text: string } // New prop for negative settings
    videoUploadSettings?: { header: string; text: string } // New prop for video upload settings
    successSettings?: { header: string; text: string } // New prop for success settings
    backgroundColor?: string // Background color for the screen
    textColor?: string // Text color for the content
    buttonTextColor?: string // Button text color
    buttonStyle?: string // Button border radius style
    font?: string // Font family
  }
  initialPreviewStep?: "initial" | "positiveExperience" | "negativeExperience" | "videoUpload" | "success"
  onPreviewStepChange?: (step: "initial" | "positiveExperience" | "negativeExperience" | "videoUpload" | "success") => void
  setCompanyName: (name: string) => void
  setCompanyLogo: (url: string | null) => void
  setRatingPageContent: (content: string) => void
  setRedirectText: (text: string) => void
  setNotificationText: (text: string) => void
  setVideoUploadText: (text: string) => void
  showPoweredBy: boolean
  setShowPoweredBy: (show: boolean) => void
  setTrustpilotUrl: (url: string) => void
  setGoogleUrl: (url: string) => void
  setFacebookUrl: (url: string) => void // New setter
  setShopifyUrl: (url: string) => void // New setter
  setEnabledPlatforms: (platforms: string[]) => void // New setter
  isPublicView?: boolean // New prop for public view mode
  customerId?: string // Customer ID for tracking
  reviewLinkId?: string // Review link ID for associating video testimonials
}

export function MobileReviewPreviewDisplay({
  formData,
  initialPreviewStep = "initial",
  onPreviewStepChange,
  setCompanyName,
  setCompanyLogo,
  setRatingPageContent,
  setRedirectText,
  setNotificationText,
  setVideoUploadText,
  showPoweredBy,
  setShowPoweredBy,
  setTrustpilotUrl,
  setGoogleUrl,
  setFacebookUrl,
  setShopifyUrl,
  setEnabledPlatforms,
  isPublicView = false,
  customerId,
  reviewLinkId,
}: MobileReviewPreviewDisplayProps) {
  const { trackStarSelection, trackPlatformRedirect, trackReviewCompletion } = useClickTracking()

  // Ensure consistent customer ID for anonymous users throughout the session
  const [sessionCustomerId] = useState(() => {
    if (customerId) return customerId
    // For anonymous users, create a consistent session ID
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('review_customer_id')
      if (stored) return stored
      const newId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      sessionStorage.setItem('review_customer_id', newId)
      return newId
    }
    return null
  })

  const finalCustomerId = customerId || sessionCustomerId

  const {
    companyName,
    companyLogo,
    profilePictureUrl,
    bio,
    messages: {
      rating_page_content = "How was your experience with {{companyName}}?",
      redirect_text = "Thank you for your feedback! Please click the button below to leave a review on {{platform}}.",
      notification_text = "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
      video_upload_text = "Record a short video testimonial for {{companyName}}!",
    },
    conditionalActions,
    trustpilotUrl,
    googleUrl,
    facebookUrl, // Destructure new prop
    shopifyUrl, // Destructure new prop
    primaryColor = "#000000",
    secondaryColor = "#333333",
    enabledPlatforms, // Destructure new prop
    links = [], // Destructure new prop with default
    headerSettings = { header: "Great to hear!", text: "Thank you for your feedback! Please click the button below to leave a review." }, // Destructure new prop with default
    initialViewSettings = { header: "How was your experience at {{companyName}}?", text: "We'd love to hear about your experience with our service." }, // Destructure new prop with default
    negativeSettings = { header: "We're sorry to hear that.", text: "Please tell us how we can improve:" }, // Destructure new prop with default
    videoUploadSettings = { header: "Share your experience!", text: "Record a short video testimonial to help others learn about our service." }, // Destructure new prop with default
    successSettings = { header: "Thank you!", text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience." }, // Destructure new prop with default
    backgroundColor = "#F0F8FF", // Default alice blue background
    textColor = "#1F2937", // Default dark text for light background
    buttonTextColor = "#FFFFFF", // Default white button text
    buttonStyle = "rounded-full", // Default fully rounded buttons
    font = "gothic-a1", // Default font
  } = formData

  const [currentStep, setCurrentStep] = useState(initialPreviewStep)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [agreeToMarketing, setAgreeToMarketing] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null) // Track which platform was clicked
  const [hoverRating, setHoverRating] = useState<number>(0)

  useEffect(() => {
    setCurrentStep(initialPreviewStep)
    setRating(0)
    setHoverRating(0)
    setFeedback("")
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setAgreeToMarketing(false)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setSubmissionSuccess(false)
    setIsSubmitting(false)
  }, [initialPreviewStep])

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating)

    // Immediately update UI for better responsiveness
    if (selectedRating >= 4) {
      setCurrentStep("positiveExperience")
      onPreviewStepChange?.("positiveExperience")
    } else {
      setCurrentStep("negativeExperience")
      onPreviewStepChange?.("negativeExperience")
    }

    // Track star selection asynchronously (non-blocking)
    if (isPublicView) {
      // Build available platforms efficiently
      const availablePlatforms = []
      if (enabledPlatforms.includes("Google") && googleUrl) availablePlatforms.push("google")
      if (enabledPlatforms.includes("Trustpilot") && trustpilotUrl) availablePlatforms.push("trustpilot")
      if (enabledPlatforms.includes("Facebook") && facebookUrl) availablePlatforms.push("facebook")

      // Add custom links
      if (links?.length > 0) {
        links.forEach(link => {
          if (link.title && link.url) {
            availablePlatforms.push(link.title.toLowerCase())
          }
        })
      }

      // Track in background without blocking UI
      trackStarSelection(finalCustomerId, selectedRating, undefined, {
        available_platforms: availablePlatforms
      }).catch(error => {
        console.error('Error:', error)
      })
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Reviews are now automatically saved through click tracking events
  // when star_selection or platform_redirect events are tracked

  const handleFeedbackSubmit = async () => {
    // Validate required fields
    if (!customerName.trim()) {
      alert("Please enter your name")
      return
    }

    if (!customerEmail.trim()) {
      alert("Please enter your email")
      return
    }

    if (!validateEmail(customerEmail)) {
      alert("Please enter a valid email address")
      return
    }

    if (!feedback.trim()) {
      alert("Please enter your feedback")
      return
    }

    setIsSubmitting(true)

    try {
      if (isPublicView) {
        // Get review link ID from the current page
        const currentPath = window.location.pathname
        const reviewId = currentPath.split('/r/')[1]

        // Submit feedback and wait for response
        const response = await fetch('/api/public/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewUrlId: reviewId,
            customerId: finalCustomerId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: null,
            rating: rating,
            feedback: feedback.trim(),
            agreeToMarketing: agreeToMarketing,
            selectedPlatform: selectedPlatform
          })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(`Submission failed: "${result.error || "Unknown error"}"`)
        }
      } else {
        // For preview mode, simulate quickly
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setIsSubmitting(false)
      setSubmissionSuccess(true)

      // Switch to submission tab when form is successfully submitted
      onPreviewStepChange?.("success")

      setTimeout(() => {
        setCurrentStep("initial")
        onPreviewStepChange?.("initial")
        setRating(0)
        setFeedback("")
        setCustomerName("")
        setCustomerEmail("")
        setCustomerPhone("")
        setAgreeToMarketing(false)
        setVideoFile(null)
        setVideoPreviewUrl(null)
        setSubmissionSuccess(false)
      }, 3000)

    } catch (error) {
      console.error("Error submitting feedback:", error)
      setIsSubmitting(false)
      alert("Failed to submit feedback. Please try again.")
    }
  }

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
    } else {
      setVideoFile(null)
      setVideoPreviewUrl(null)
    }
  }

  const handleVideoUpload = async () => {
    if (!videoFile || !customerName || !customerEmail || !agreeToMarketing) {
      return
    }

    setIsSubmitting(true)

    try {
      // Create form data for the API
      const uploadFormData = new FormData()
      uploadFormData.append('video', videoFile)
      uploadFormData.append('customerName', customerName)
      uploadFormData.append('customerEmail', customerEmail)
      uploadFormData.append('customerId', finalCustomerId || 'anonymous')
      uploadFormData.append('companyName', companyName)

      // Include review link ID for email notification
      if (reviewLinkId) {
        uploadFormData.append('reviewLinkId', reviewLinkId)
      }

      const response = await fetch('/api/video-testimonial', {
        method: 'POST',
        body: uploadFormData
      })

      const result = await response.json()

      if (result.success) {
        setSubmissionSuccess(true)

        // Track completion for analytics (non-blocking)
        if (isPublicView && finalCustomerId) {
          trackReviewCompletion(finalCustomerId, true, 5, '/video-testimonial').catch(trackError => {
            console.error('Failed to track video completion (non-blocking):', trackError)
          })
        }

        // Switch to success page
        setCurrentStep("success")
        onPreviewStepChange?.("success")

        // Reset form after delay
        setTimeout(() => {
          setCurrentStep("initial")
          onPreviewStepChange?.("initial")
          setRating(0)
          setFeedback("")
          setCustomerName("")
          setCustomerEmail("")
          setCustomerPhone("")
          setAgreeToMarketing(false)
          setVideoFile(null)
          setVideoPreviewUrl(null)
          setSubmissionSuccess(false)
        }, 5000)

      } else {
        console.error('❌ Video upload failed:', result.error)
        alert('Failed to upload video. Please try again.')
      }

    } catch (error) {
      console.error('Error:', error)
      alert('Failed to upload video. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoBack = () => {
    setCurrentStep("initial")
    onPreviewStepChange?.("initial")
    setRating(0)
    setHoverRating(0)
    setFeedback("")
    setCustomerName("")
    setCustomerEmail("")
    setCustomerPhone("")
    setAgreeToMarketing(false)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setSubmissionSuccess(false)
    setIsSubmitting(false)
  }

  const getDynamicText = useCallback(
    (template: string, platformName?: string) => {
      let text = template.replace(/\{\{companyName\}\}/g, companyName)
      if (platformName) {
        text = text.replace(/\{\{platform\}\}/g, platformName)
      }
      return text
    },
    [companyName],
  )

  const renderContent = () => {
    if (submissionSuccess) {
      return (
        <div className="flex flex-col items-center justify-center w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-current mb-4 tracking-tight">{successSettings.header}</h3>
            <p className="text-current opacity-80 text-lg leading-relaxed px-6">
              {getDynamicText(successSettings.text)}
            </p>
          </div>
        </div>
      )
    }

    switch (currentStep) {
      case "initial":
        // Debug logging for initial view
        return (
          <div className="flex flex-col items-center justify-center w-full text-center">
            {(profilePictureUrl || companyLogo) && (
              <div className="relative mb-8">
                <div className="relative">
                  <Image
                    src={profilePictureUrl || companyLogo || "/placeholder.svg"}
                    alt={profilePictureUrl ? "Profile Picture" : "Company Logo"}
                    width={120}
                    height={120}
                    className="rounded-full object-cover shadow-2xl border-4 border-white ring-4 ring-white/20"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                </div>
              </div>
            )}
            <h3 className="text-3xl font-bold text-current mb-4 tracking-tight">{getDynamicText(initialViewSettings.header)}</h3>
            {bio && (
              <p className="text-current opacity-70 text-base mb-6 italic leading-relaxed px-4">{bio}</p>
            )}
            <p className="text-current opacity-80 mb-8 text-lg leading-relaxed px-6 text-center">{getDynamicText(initialViewSettings.text)}</p>
            <div className="flex space-x-2 mb-10" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="transform transition-transform duration-200 hover:scale-110">
                    <Star
                      className={cn(
                        "h-12 w-12 cursor-pointer transition-all duration-300 drop-shadow-sm",
                        star <= (hoverRating || rating || 0)
                          ? "text-yellow-400 fill-yellow-400 drop-shadow-md"
                          : "text-gray-300 fill-gray-300 hover:text-gray-400"
                      )}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => handleRatingClick(star)}
                    />
                  </div>
                ))}
              </div>

          </div>
        )
      case "positiveExperience":
        // Debug logging for positive experience view
        return (
          <div className="flex flex-col items-center justify-center w-full text-center">
            <div className="absolute top-6 left-6 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-current hover:bg-white/30 transition-all duration-200 rounded-full px-3 py-2 shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Back</span>
              </Button>
            </div>
            {(profilePictureUrl || companyLogo) && (
              <div className="relative mb-6">
                <Image
                  src={profilePictureUrl || companyLogo || "/placeholder.svg"}
                  alt={profilePictureUrl ? "Profile Picture" : "Company Logo"}
                  width={80}
                  height={80}
                  className="rounded-full object-cover shadow-xl border-3 border-white/80"
                />
              </div>
            )}
            <h3 className="text-xl font-semibold text-current mb-4">{getDynamicText(headerSettings.header)}</h3>
            <p className="text-current opacity-75 mb-4">{getDynamicText(headerSettings.text, conditionalActions[rating]?.platform || enabledPlatforms[0] || "Google")}</p>
            <div className="w-full space-y-2">
              {/* Show configured links from the left-hand side */}
              {links.length > 0 ? (
                links
                  .filter(link => {
                    // Debug logging for link filtering

                    // TEMPORARILY REMOVE isActive CHECK - might be causing issues
                    // Only show active links with valid URLs
                    // if (!link.isActive) {
                    //   //   return false
                    // }

                    // Allow video testimonial links (internal links)
                    if (link.url === '#video-upload' || link.platformId === 'video-testimonial') return true

                    // Check for valid URLs
                    if (!link.url || link.url.trim() === '') {
                      return false
                    }

                    // Filter out common placeholder URLs
                    const placeholderUrls = [
                      'https://example.com',
                      'https://www.example.com',
                      'https://your-url-here.com',
                      'https://placeholder.com',
                      '',
                      'Your product page',
                      'Your product review URL'
                    ]

                    if (placeholderUrls.includes(link.url.trim())) {
                      return false
                    }

                    return true
                  }) // Only show links with valid URLs
                  .map((link) => (
                  <Button
                    key={link.id}
                    className={`w-full flex items-center justify-center gap-3 py-4 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${buttonStyle}`}
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      color: buttonTextColor
                    }}
                    onClick={() => {
                      // Save which platform was selected
                      setSelectedPlatform(link.title.toLowerCase())

                      // Handle video upload internally
                      if (link.url === '#video-upload') {
                        setCurrentStep("videoUpload")
                        onPreviewStepChange?.("videoUpload")
                        return
                      }

                      // Immediately open the link for better UX
                      window.open(link.url, "_blank")

                      // Track in background (non-blocking)
                      if (isPublicView && link.url) {
                        const currentPage = window.location.pathname + window.location.search
                        trackPlatformRedirect(finalCustomerId, link.title.toLowerCase(), link.url, currentPage)
                          .catch(error => console.error(`Failed to track ${link.title} redirect:`, error))
                      }
                    }}
                  >
                    {link.platformLogo ? (
                      <Image
                        src={link.platformLogo}
                        alt={link.title}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    ) : (
                      <Globe className="h-5 w-5" />
                    )}
                    <span>{
                      link.buttonText ||
                      (link.platformId === 'video-testimonial'
                        ? 'Upload Video Testimonial'
                        : link.platformId
                          ? `Submit on ${link.platformId.charAt(0).toUpperCase() + link.platformId.slice(1).replace('-', ' ')}`
                          : `Submit on ${link.title.replace(' Reviews', '')}`)
                    }</span>
                  </Button>
                ))
              ) : (
                // Fallback to legacy platform buttons if no links configured
                <>
                  {enabledPlatforms.includes("Google") && rating >= 4 && (
                    <Button
                      key="legacy-google-button"
                      className="w-full flex items-center justify-center gap-3 rounded-xl py-4 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: buttonTextColor }}
                      onClick={() => {
                        // Save which platform was selected
                        setSelectedPlatform('google')

                        // Immediately open the link
                        window.open(googleUrl, "_blank")

                        // Track in background (non-blocking)
                        if (isPublicView && googleUrl) {
                          const currentPage = window.location.pathname + window.location.search
                          trackPlatformRedirect(finalCustomerId, 'google', googleUrl, currentPage)
                            .catch(error => console.error('Error:', error))
                        }
                      }}
                    >
                      <Image src="/google-logo-new.png" alt="Google Logo" width={24} height={24} />
                      <span>Submit to Google</span>
                    </Button>
                  )}
                  {enabledPlatforms.includes("Trustpilot") && rating >= 4 && (
                    <Button
                      key="legacy-trustpilot-button"
                      className="w-full flex items-center justify-center gap-3 rounded-xl py-4 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: buttonTextColor }}
                      onClick={() => {
                        // Save which platform was selected
                        setSelectedPlatform('trustpilot')

                        // Immediately open the link
                        window.open(trustpilotUrl, "_blank")

                        // Track in background (non-blocking)
                        if (isPublicView && trustpilotUrl) {
                          const currentPage = window.location.pathname + window.location.search
                          trackPlatformRedirect(finalCustomerId, 'trustpilot', trustpilotUrl, currentPage)
                            .catch(error => console.error('Error:', error))
                        }
                      }}
                    >
                      <Image src="/trustpilot.svg" alt="Trustpilot Logo" width={24} height={24} />
                      <span>Submit to Trustpilot</span>
                    </Button>
                  )}
                  {enabledPlatforms.includes("Facebook") && rating >= 4 && (
                    <Button
                      key="legacy-facebook-button"
                      className="w-full flex items-center justify-center gap-3 rounded-xl py-4 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: buttonTextColor }}
                      onClick={() => {
                        // Save which platform was selected
                        setSelectedPlatform('facebook')

                        // Immediately open the link
                        window.open(facebookUrl, "_blank")

                        // Track in background (non-blocking)
                        if (isPublicView && facebookUrl) {
                          const currentPage = window.location.pathname + window.location.search
                          trackPlatformRedirect(finalCustomerId, 'facebook', facebookUrl, currentPage)
                            .catch(error => console.error('Error:', error))
                        }
                      }}
                    >
                      <Image src="/facebook-logo.png" alt="Facebook Logo" width={20} height={20} /> Submit to Facebook
                    </Button>
                  )}
                  {enabledPlatforms.includes("Video Testimonial") && rating >= 4 && (
                    <Button
                      key="legacy-video-testimonial-button"
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => {
                        setCurrentStep("videoUpload")
                        onPreviewStepChange?.("videoUpload")
                      }}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <Video className="mr-2 h-4 w-4" /> Record Video Testimonial
                    </Button>
                  )}

                  {/* Dynamic platform buttons for platforms not covered above */}
                  {(() => {
                    // The issue is case sensitivity! Platform names might be lowercase in the array
                    const corePlatforms = ["Google", "Trustpilot", "Facebook", "Video Testimonial", "google", "trustpilot", "facebook", "video testimonial"];
                    const dynamicPlatforms = enabledPlatforms
                      .filter(platform => !corePlatforms.includes(platform))
                      .filter(platform => rating >= 4);


                    return dynamicPlatforms.map(platform => {
                      // Get platform logo and debug info
                      const platformLower = platform.toLowerCase()
                      // Map platform logos
                      const platformLogos = {
                        'shopify': '/shopify-logo.svg',
                        'amazon': '/amazon-logo.png',
                        'airbnb': '/airbnb-logo.svg',
                        'booking': '/booking-logo.svg',
                        'tripadvisor': '/tripadvisor-logo.svg',
                        'yelp': '/yelp-logo.svg'
                      }

                      const platformLogo = platformLogos[platformLower] || '/google-logo-new.png'
                      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1)

                      return (
                        <Button
                          key={`legacy-${platform.toLowerCase()}-button`}
                          className="w-full flex items-center justify-center gap-3 rounded-xl py-4 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: buttonTextColor }}
                          onClick={() => {
                            // Save which platform was selected
                            setSelectedPlatform(platform.toLowerCase())

                            // Get the URL for this platform
                            const platformUrls = {
                              'shopify': shopifyUrl,
                              'amazon': '', // Add Amazon URL when available
                              'airbnb': '', // Add Airbnb URL when available
                              'booking': '', // Add Booking URL when available
                              'tripadvisor': '', // Add TripAdvisor URL when available
                              'yelp': '' // Add Yelp URL when available
                            }

                            const platformUrl = platformUrls[platformLower]

                            if (platformUrl && platformUrl.trim() !== '') {
                              // Open the configured URL
                              window.open(platformUrl, "_blank")

                              // Track successful redirect
                              if (isPublicView) {
                                const currentPage = window.location.pathname + window.location.search
                                trackPlatformRedirect(finalCustomerId, platform.toLowerCase(), platformUrl, currentPage)
                                  .catch(error => console.error(`Failed to track ${platform} redirect:`, error))
                              }
                            } else {
                              // Show configuration message if URL is not set
                              alert(`${platformName} review link needs to be configured in your dashboard.`)

                              // Track configuration needed
                              if (isPublicView) {
                                const currentPage = window.location.pathname + window.location.search
                                trackPlatformRedirect(finalCustomerId, platform.toLowerCase(), '#needs-configuration', currentPage)
                                  .catch(error => console.error(`Failed to track ${platform} redirect:`, error))
                              }
                            }
                          }}
                        >
                          <Image src={platformLogo} alt={`${platformName} Logo`} width={24} height={24} />
                          <span>Submit to {platformName}</span>
                        </Button>
                      )
                    });
                  })()}
                </>
              )}
            </div>
          </div>
        )
      case "negativeExperience":
        return (
          <div className="flex flex-col items-center justify-center w-full text-center">
            <div className="absolute top-6 left-6 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-current hover:bg-white/30 transition-all duration-200 rounded-full px-3 py-2 shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Back</span>
              </Button>
            </div>
            {(profilePictureUrl || companyLogo) && (
              <div className="relative mb-6">
                <Image
                  src={profilePictureUrl || companyLogo || "/placeholder.svg"}
                  alt={profilePictureUrl ? "Profile Picture" : "Company Logo"}
                  width={80}
                  height={80}
                  className="rounded-full object-cover shadow-xl border-3 border-white/80"
                />
              </div>
            )}
            <h3 className="text-xl font-semibold text-current mb-4">{getDynamicText(negativeSettings.header)}</h3>
            <p className="text-current opacity-75 mb-4">{getDynamicText(negativeSettings.text)}</p>
            <Input
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full mb-4 rounded-xl border-2 focus:border-opacity-80 focus:ring-opacity-80 py-3 px-4 text-base shadow-sm"
              style={
                {
                  borderColor: secondaryColor,
                  "--tw-ring-color": secondaryColor,
                } as React.CSSProperties
              }
            />
            <Input
              type="email"
              placeholder="Your email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full mb-4 rounded-xl border-2 focus:border-opacity-80 focus:ring-opacity-80 py-3 px-4 text-base shadow-sm"
              style={
                {
                  borderColor: secondaryColor,
                  "--tw-ring-color": secondaryColor,
                } as React.CSSProperties
              }
            />
            <Textarea
              placeholder="Tell us how we can improve..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full mb-6 rounded-xl border-2 focus:border-opacity-80 focus:ring-opacity-80 min-h-[100px] shadow-sm text-base p-4 resize-none"
              style={
                {
                  borderColor: secondaryColor,
                  "--tw-ring-color": secondaryColor,
                } as React.CSSProperties
              }
            />
            <Button
              className={`w-full py-4 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${buttonStyle}`}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                color: buttonTextColor
              }}
              onClick={handleFeedbackSubmit}
              disabled={isSubmitting || !customerName || !customerEmail || !feedback}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </div>
        )
      case "videoUpload":
        return (
          <div className="flex flex-col items-center justify-center w-full text-center">
            <div className="absolute top-6 left-6 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-current hover:bg-white/30 transition-all duration-200 rounded-full px-3 py-2 shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Back</span>
              </Button>
            </div>
            {(profilePictureUrl || companyLogo) && (
              <div className="relative mb-6">
                <Image
                  src={profilePictureUrl || companyLogo || "/placeholder.svg"}
                  alt={profilePictureUrl ? "Profile Picture" : "Company Logo"}
                  width={80}
                  height={80}
                  className="rounded-full object-cover shadow-xl border-3 border-white/80"
                />
              </div>
            )}
            <h3 className="text-xl font-semibold text-current mb-4">{getDynamicText(videoUploadSettings.header)}</h3>
            <p className="text-current opacity-75 mb-4">{getDynamicText(videoUploadSettings.text)}</p>
            {videoPreviewUrl ? (
              <video src={videoPreviewUrl} controls className="w-full max-h-32 object-contain mb-2 rounded-md" />
            ) : (
              <div
                className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 mb-3 cursor-pointer hover:bg-gray-50 transition-all duration-300 hover:border-gray-400"
                onClick={() => document.getElementById("video-upload-input")?.click()}
                style={{ borderColor: secondaryColor + '60' }}
              >
                <UploadCloud className="h-6 w-6 mb-1 opacity-60" />
                <span className="text-xs font-medium opacity-80">Tap to upload video</span>
              </div>
            )}
            <input
              id="video-upload-input"
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="hidden"
            />
            <Input
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full mb-4 rounded-xl border-2 focus:border-opacity-80 focus:ring-opacity-80 py-3 px-4 text-base shadow-sm"
              style={
                {
                  borderColor: secondaryColor,
                  "--tw-ring-color": secondaryColor,
                } as React.CSSProperties
              }
            />
            <Input
              type="email"
              placeholder="Your email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full mb-4 rounded-xl border-2 focus:border-opacity-80 focus:ring-opacity-80 py-3 px-4 text-base shadow-sm"
              style={
                {
                  borderColor: secondaryColor,
                  "--tw-ring-color": secondaryColor,
                } as React.CSSProperties
              }
            />
            <div className="flex items-start space-x-2 w-full mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="marketing-agreement"
                checked={agreeToMarketing}
                onCheckedChange={(checked) => setAgreeToMarketing(checked as boolean)}
                className="border-gray-400 data-[state=checked]:bg-gradient-to-r mt-0.5"
                style={
                  {
                    "--tw-gradient-from": primaryColor,
                    "--tw-gradient-to": secondaryColor,
                  } as React.CSSProperties
                }
              />
              <Label htmlFor="marketing-agreement" className="text-xs text-gray-700 leading-snug flex-1">
                I agree that my video could be used by the company for marketing purposes
              </Label>
            </div>
            <Button
              className={`w-full py-4 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${buttonStyle}`}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                color: buttonTextColor
              }}
              onClick={handleVideoUpload}
              disabled={!videoFile || isSubmitting || !customerName || !customerEmail || !agreeToMarketing}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Submit Video"
              )}
            </Button>
          </div>

        )
      case "success":
        return (
          <div className="flex flex-col items-center justify-center w-full text-center">
            <h3 className="text-xl font-semibold text-current mb-4">{getDynamicText(successSettings.header)}</h3>
            <p className="text-current opacity-75 mt-2">
              {getDynamicText(successSettings.text)}
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative w-full h-full bg-white rounded-[30px] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
      {/* Define SVG gradient for stars */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Content Area - with dynamic background and improved spacing */}
      <div
        className={`flex-1 flex flex-col relative ${backgroundColor === "gradient" ? "" : ""}`}
        style={{
          ...(backgroundColor === "gradient" ? { background: 'linear-gradient(to right, rgb(87, 140, 255), #22d3ee)' } : {}),
          backgroundColor: backgroundColor !== "gradient" ? backgroundColor : undefined,
          color: textColor,
          fontFamily: font === 'gothic-a1' ? 'Gothic A1, sans-serif' :
                     font === 'inter' ? 'Inter, sans-serif' :
                     font === 'roboto' ? 'Roboto, sans-serif' : 'Gothic A1, sans-serif'
        }}
      >
        {/* Content with proper padding and spacing */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-16">
          {renderContent()}
        </div>

        {/* Powered by footer - positioned at bottom with better design */}
        {showPoweredBy && (
          <div className="absolute bottom-0 left-0 right-0 py-3 px-4">
            <div className="flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <span className="text-xs font-medium opacity-60">
                  Powered by <span className="font-semibold opacity-80">Loop</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
