"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MobileReviewPreviewDisplay } from "./mobile-review-preview-display"
import { UpgradeProDialog } from "./upgrade-pro-dialog"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import { cachedFetch, invalidateCache, CACHE_KEYS } from "@/lib/cache"
import { usePerformance } from "@/hooks/use-performance"
import Image from "next/image"
import { CheckCircle, Plus, Upload, Zap, Info, ChevronDown, Crown, Link, Share2, LayoutGrid, Globe, Sparkles, ImageIcon, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import dynamic from "next/dynamic"

// Dynamically import QRCode to prevent SSR issues
const QRCode = dynamic(
  () => import("qrcode.react").then(mod => mod.QRCodeSVG),
  { ssr: false }
)

// Local ColorInput component
interface ColorInputProps {
  label: string
  value: string
  onChange?: (value: string) => void
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div>
      <label
        htmlFor={`${label.toLowerCase().replace(/\s/g, "-")}-input`}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <div className="mt-1 flex rounded-md shadow-sm">
        <span
          className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          id={`${label.toLowerCase().replace(/\s/g, "-")}-input`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 rounded-none rounded-r-md border-l-0 h-10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
        />
      </div>
    </div>
  )
}

interface ThemeColors {
  primary: string
  secondary: string
}

const THEME_PRESETS: Record<string, ThemeColors> = {
  custom: { primary: "#000000", secondary: "#333333" },
  "loop-blue": { primary: "#3B82F6", secondary: "#60A5FA" },
  "loop-yellow": { primary: "#F59E0B", secondary: "#FCD34D" },
  "pebble-pink": { primary: "#EC4899", secondary: "#F9A8D4" },
  "cloud-red": { primary: "#DC2626", secondary: "#F87171" },
  "cloud-green": { primary: "#059669", secondary: "#34D399" },
  "cloud-blue": { primary: "#2563EB", secondary: "#60A5FA" },
  "breeze-pink": { primary: "#EC4899", secondary: "#F9A8D4" },
  "breeze-orange": { primary: "#FB923C", secondary: "#FDBA74" },
  "breeze-green": { primary: "#10B981", secondary: "#6EE7B7" },
  "rainbow": { primary: "#EC4899", secondary: "#8B5CF6" },
  "confetti": { primary: "#F59E0B", secondary: "#EC4899" },
  "starry-night": { primary: "#1E293B", secondary: "#475569" },
  "mineral-blue": { primary: "#0EA5E9", secondary: "#38BDF8" },
  "mineral-green": { primary: "#059669", secondary: "#10B981" },
  "mineral-orange": { primary: "#EA580C", secondary: "#FB923C" },
  "noir": { primary: "#000000", secondary: "#374151" },
  "bloom": { primary: "#EC4899", secondary: "#F472B6" },
  "miami": { primary: "#06B6D4", secondary: "#F59E0B" },
}

interface CustomizationSettings {
  company_name: string
  company_logo_url: string | null
  primary_color: string
  secondary_color: string
  show_powered_by: boolean
  messages: any
  conditional_actions: any
  trustpilot_url: string
  google_url: string
  facebook_url: string
  enabled_platforms: string[]
}

interface AppearancePageProps {
  onTabChange?: (tab: string) => void
}

// Helper function to safely validate logo URLs
const safeLogoUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
    return null
  }
  return url.trim()
}

export default function AppearancePage({ onTabChange }: AppearancePageProps = {}) {
  const { trackApiCall } = usePerformance('AppearancePage')
  const { logoUrl, updateLogo, refreshLogo } = useCompanyLogo()
  const [customizationSettings, setCustomizationSettings] = useState<CustomizationSettings>({
    company_name: "Your Company",
    company_logo_url: null,
    primary_color: "#b8cbff",
    secondary_color: "#ebaeda",
    show_powered_by: true,
    messages: {
      rating_page_content: "How was your experience with {{companyName}}?",
      redirect_text: "Thank you for your feedback! Please click the button below to leave a review.",
      negative_page_content: "We're sorry to hear about your experience. Please let us know how we can improve.",
      thank_you_text: "Thank you for your feedback!",
      video_upload_text: "Upload a video testimonial"
    },
    conditional_actions: {},
    trustpilot_url: "",
    google_url: "",
    facebook_url: "",
    enabled_platforms: ["Google", "Trustpilot", "Facebook"]
  })

  const [selectedProfile, setSelectedProfile] = useState("classic")
  const [selectedTheme, setSelectedTheme] = useState("loop-yellow")
  const [selectedFont, setSelectedFont] = useState("gothic-a1")
  const [textColor, setTextColor] = useState("#1F2937")
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF")
  const [buttonStyle, setButtonStyle] = useState("rounded-full")
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    subscription_type?: string;
    subscription_status?: string;
  }>({})
  const [previewStep, setPreviewStep] = useState("initial")

  // Computed value to determine if powered by should be shown
  const shouldShowPoweredBy = (() => {
    // If user is pro or enterprise with active status, hide powered by
    if ((userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active') {
      return false
    }
    // Otherwise use the customization settings
    return customizationSettings.show_powered_by
  })()
  const [backgroundColor, setBackgroundColor] = useState("#F0F8FF")
  const [isPremium] = useState(false)
  const [headerSettings, setHeaderSettings] = useState({
    header: "Great to hear!",
    text: "Thank you for your feedback! Please click the button below to leave a review."
  })
  const [initialViewSettings, setInitialViewSettings] = useState({
    header: "How was your experience at {{companyName}}?",
    text: "We'd love to hear about your experience with our service."
  })
  const [negativeSettings, setNegativeSettings] = useState({
    header: "We're sorry to hear that.",
    text: "Please tell us how we can improve:"
  })
  const [videoUploadSettings, setVideoUploadSettings] = useState({
    header: "Share your experience!",
    text: "Record a short video testimonial to help others learn about our service."
  })
  const [successSettings, setSuccessSettings] = useState({
    header: "Thank you!",
    text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience."
  })

  // Add links data to match Links tab preview
  const [links, setLinks] = useState([
    {
      id: 1,
      title: "Google Reviews",
      url: "https://g.page/example/review",
      clicks: 124,
      isActive: true,
      platformId: "google",
      platformLogo: "/google-logo-new.png"
    },
    {
      id: 2,
      title: "Trustpilot Reviews",
      url: "https://www.trustpilot.com/review/example.com",
      clicks: 89,
      isActive: true,
      platformId: "trustpilot",
      platformLogo: "/trustpilot.svg"
    },
    {
      id: 3,
      title: "Facebook Reviews",
      url: "https://www.facebook.com/yourpage/reviews/",
      clicks: 67,
      isActive: true,
      platformId: "facebook",
      platformLogo: "/facebook-logo.png"
    }
  ])

  // Fetch user subscription info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await cachedFetch("/api/auth/me", {
          credentials: "include"
        }, 30000) // Cache for 30 seconds
        if (data.success && data.user) {
          setUserInfo({
            subscription_type: data.user.subscription_type,
            subscription_status: data.user.subscription_status,
          })

          // Auto-hide Loop footer for Pro and Enterprise users
          if ((data.user.subscription_type === 'pro' || data.user.subscription_type === 'enterprise') && data.user.subscription_status === 'active') {
            setCustomizationSettings(prev => ({
              ...prev,
              show_powered_by: false
            }))
          }
        }
      } catch (error) {
        console.error('Error:', error)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('🌐 Network error - API may be down or unreachable')
        }
      }
    }
    fetchUserInfo()
  }, [])

  // Load existing settings from API - optimized for speed
  useEffect(() => {
    const loadSettings = async () => {
      // Load localStorage immediately (synchronous, very fast)
      try {
        const savedAppearance = localStorage.getItem('loop_appearance_settings')
        if (savedAppearance) {
          const appearanceSettings = JSON.parse(savedAppearance)
          if (appearanceSettings.background_color) setBackgroundColor(appearanceSettings.background_color)
          if (appearanceSettings.text_color) setTextColor(appearanceSettings.text_color)
          if (appearanceSettings.button_text_color) setButtonTextColor(appearanceSettings.button_text_color)
          if (appearanceSettings.button_style) setButtonStyle(appearanceSettings.button_style)
          if (appearanceSettings.font) setSelectedFont(appearanceSettings.font)
          if (appearanceSettings.theme_preset) setSelectedTheme(appearanceSettings.theme_preset)
          if (appearanceSettings.profile_style) setSelectedProfile(appearanceSettings.profile_style)
        }
      } catch (e) {
        // Could not load appearance settings from localStorage
      }

      // Load API data in background (non-blocking)
      try {
        const result = await cachedFetch('/api/review-link', {
          headers: { 'Content-Type': 'application/json' }
        }, 60000) // Cache for 1 minute
        if (result.success && result.data) {
          const data = result.data
          setCustomizationSettings(prev => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            company_logo_url: data.company_logo_url || prev.company_logo_url,
            primary_color: data.primary_color || prev.primary_color,
            secondary_color: data.secondary_color || prev.secondary_color,
            messages: {
              rating_page_content: data.rating_page_content || prev.messages.rating_page_content,
              redirect_text: data.redirect_message || prev.messages.redirect_text,
              notification_text: data.internal_notification_message || prev.messages.notification_text,
              video_upload_text: data.video_upload_message || prev.messages.video_upload_text
            },
            conditional_actions: prev.conditional_actions,
            trustpilot_url: data.trustpilot_review_link || prev.trustpilot_url,
            google_url: data.google_review_link || prev.google_url,
            facebook_url: data.facebook_review_link || prev.facebook_url,
            enabled_platforms: data.enabled_platforms || prev.enabled_platforms,
            show_powered_by: data.show_badge !== undefined ? !data.show_badge : prev.show_powered_by
          }))

          // Load text settings for all pages
          if (data.header_settings) {
            setHeaderSettings({
              header: data.header_settings.header || "Great to hear!",
              text: data.header_settings.text || "Thank you for your feedback! Please click the button below to leave a review."
            })
          }
          if (data.initial_view_settings) {
            setInitialViewSettings({
              header: data.initial_view_settings.header || "How was your experience at {{companyName}}?",
              text: data.initial_view_settings.text || "We'd love to hear about your experience with our service."
            })
          }
          if (data.negative_settings) {
            setNegativeSettings({
              header: data.negative_settings.header || "We're sorry to hear that.",
              text: data.negative_settings.text || "Please tell us how we can improve:"
            })
          }
          if (data.video_upload_settings) {
            setVideoUploadSettings({
              header: data.video_upload_settings.header || "Share your experience!",
              text: data.video_upload_settings.text || "Record a short video testimonial to help others learn about our service."
            })
          }
          if (data.success_settings) {
            setSuccessSettings({
              header: data.success_settings.header || "Thank you!",
              text: data.success_settings.text || "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience."
            })
          }

          // Load appearance settings from database if available
          if (data.background_color) setBackgroundColor(data.background_color)
          if (data.text_color) setTextColor(data.text_color)
          if (data.button_text_color) setButtonTextColor(data.button_text_color)
          if (data.button_style) setButtonStyle(data.button_style)
          if (data.font) setSelectedFont(data.font)
          // Note: theme_preset is stored in localStorage only

          // Load links from database if available
          if (data.links && Array.isArray(data.links)) {
            setLinks(data.links)
          }
        }
      } catch (error) {
        console.error('Error:', error)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('🌐 Network error - review-link API may be down or unreachable')
        }
      }
    }

    loadSettings()
  }, [])

  // Sync logo URL with company logo
  useEffect(() => {
    if (logoUrl) {
      setCustomizationSettings(prev => ({
        ...prev,
        company_logo_url: logoUrl
      }))
    }
  }, [logoUrl])

  // Apply theme changes
  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme)
    if (theme !== "custom") {
      const colors = THEME_PRESETS[theme]
      setCustomizationSettings((prev) => ({
        ...prev,
        primary_color: colors.primary,
        secondary_color: colors.secondary
      }))
      // Also update the background color for theme presets
      if (theme === "loop-blue") {
        setBackgroundColor("#F0F8FF") // Light blue background
      } else if (theme === "loop-yellow") {
        setBackgroundColor("#FFFBF0") // Light yellow background
      } else if (theme === "pebble-pink") {
        setBackgroundColor("#FDF2F8") // Light pink background
      } else if (theme === "cloud-red") {
        setBackgroundColor("#FEF2F2") // Light red background
      } else if (theme === "cloud-green") {
        setBackgroundColor("#F0FDF4") // Light green background
      } else if (theme === "cloud-blue") {
        setBackgroundColor("#EFF6FF") // Light blue background
      } else if (theme === "breeze-pink") {
        setBackgroundColor("#FDF2F8") // Light pink background
      } else if (theme === "breeze-orange") {
        setBackgroundColor("#FFF7ED") // Light orange background
      } else if (theme === "breeze-green") {
        setBackgroundColor("#F0FDF4") // Light green background
      } else if (theme === "rainbow") {
        setBackgroundColor("#FEFCE8") // Light yellow background for rainbow
      } else if (theme === "confetti") {
        setBackgroundColor("#FEF3F2") // Light pink background
      } else if (theme === "starry-night") {
        setBackgroundColor("#0F172A") // Dark background
        setTextColor("#F8FAFC") // Light text for dark theme
      } else if (theme === "mineral-blue") {
        setBackgroundColor("#F0F9FF") // Light blue background
      } else if (theme === "mineral-green") {
        setBackgroundColor("#ECFDF5") // Light green background
      } else if (theme === "mineral-orange") {
        setBackgroundColor("#FFF7ED") // Light orange background
      } else if (theme === "noir") {
        setBackgroundColor("#111827") // Dark background
        setTextColor("#F9FAFB") // Light text for dark theme
      } else if (theme === "bloom") {
        setBackgroundColor("#FDF2F8") // Light pink background
      } else if (theme === "miami") {
        setBackgroundColor("#F0F9FF") // Light cyan background
      }
    }
  }

  // Share functionality (copied from review-link-tab.tsx)
  const [reviewLink, setReviewLink] = useState<string>("")

  // Fetch actual review link from API
  useEffect(() => {
    const fetchReviewLink = async () => {
      try {
        const response = await fetch('/api/review-link')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.review_url) {
            setReviewLink(result.data.review_url)
          } else if (customizationSettings.company_name) {
            // Fallback to company-based link if no review_url
            const companySlug = customizationSettings.company_name.toLowerCase().replace(/\s+/g, '')
            setReviewLink(`https://linktr.ee/${companySlug}`)
          }
        }
      } catch (error) {
        // Error fetching review link
        // Fallback on error
        if (customizationSettings.company_name) {
          const companySlug = customizationSettings.company_name.toLowerCase().replace(/\s+/g, '')
          setReviewLink(`https://linktr.ee/${companySlug}`)
        }
      }
    }
    fetchReviewLink()
  }, [customizationSettings.company_name])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink)
    // Show success toast
    const successToast = document.createElement('div')
    successToast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    successToast.textContent = 'Link copied to clipboard!'
    document.body.appendChild(successToast)
    setTimeout(() => successToast.remove(), 3000)
  }

  const handleOpenLink = () => {
    window.open(reviewLink, "_blank")
  }

  const handleShareLoop = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${customizationSettings.company_name} - Leave us a review`,
          text: `Please take a moment to leave ${customizationSettings.company_name} a review!`,
          url: reviewLink,
        })
        // Show success toast
        const successToast = document.createElement('div')
        successToast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        successToast.textContent = 'Shared successfully!'
        document.body.appendChild(successToast)
        setTimeout(() => successToast.remove(), 3000)
      } catch (error: any) {
        if (error.name !== "AbortError") {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const handleShowQRCode = () => {
    setQrCodeDialogOpen(true)
  }

  // Save all design settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save only fields that exist in the database schema
      const reviewLinkData = {
        company_name: customizationSettings.company_name,
        company_logo_url: customizationSettings.company_logo_url,
        primary_color: customizationSettings.primary_color,
        secondary_color: customizationSettings.secondary_color,
        // Map messages to correct database fields
        rating_page_content: customizationSettings.messages?.rating_page_content || "How was your experience with {{companyName}}?",
        redirect_message: customizationSettings.messages?.redirect_text || "Thank you for your feedback! Please click the button below to leave a review on {{platform}}.",
        internal_notification_message: customizationSettings.messages?.notification_text || "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
        video_upload_message: customizationSettings.messages?.video_upload_text || "Record a short video testimonial for {{companyName}}!",
        // Map platform URLs to correct database fields
        google_review_link: customizationSettings.google_url,
        trustpilot_review_link: customizationSettings.trustpilot_url,
        facebook_review_link: customizationSettings.facebook_url,
        enabled_platforms: customizationSettings.enabled_platforms,
        // Add appearance settings
        background_color: backgroundColor,
        text_color: textColor,
        button_text_color: buttonTextColor,
        button_style: buttonStyle,
        font: selectedFont,
        // Add text settings for all pages
        header_settings: headerSettings,
        initial_view_settings: initialViewSettings,
        negative_settings: negativeSettings,
        video_upload_settings: videoUploadSettings,
        success_settings: successSettings,
        // Map show_powered_by to show_badge for database compatibility
        show_badge: customizationSettings.show_powered_by
      }

      // For now, appearance settings will persist in the UI session
      // TODO: Add appearance_settings column to database schema later
      const appearanceSettings = {
        background_color: backgroundColor,
        text_color: textColor,
        button_text_color: buttonTextColor,
        button_style: buttonStyle,
        font: selectedFont,
        theme_preset: selectedTheme,
        profile_style: selectedProfile
      }

      // Save appearance settings to localStorage for persistence across sessions
      localStorage.setItem('loop_appearance_settings', JSON.stringify(appearanceSettings))

      const response = await fetch('/api/review-link', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewLinkData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || 'Failed to save settings'}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save settings')
      }

      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache('/api/review-link')

      // Settings saved silently - no toast message needed
    } catch (error) {
      // Failed to save design settings

      // Show error message with more details for debugging
      const errorToast = document.createElement('div')
      errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md'
      errorToast.textContent = `Save failed: ${error.message || 'Please try again'}`
      document.body.appendChild(errorToast)
      setTimeout(() => errorToast.remove(), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full bg-white shadow-sm px-4 py-2 flex items-center gap-2 text-lg font-semibold hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Appearance
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {!(userInfo.subscription_type && userInfo.subscription_type !== 'free' && userInfo.subscription_status === 'active') && (
            <UpgradeProDialog>
              <Button
                variant="outline"
                className="rounded-full gap-2 bg-violet-50 text-violet-600 border-violet-300 hover:bg-violet-100 shadow-sm"
              >
                <Crown className="h-4 w-4" />
                Try Pro for free
              </Button>
            </UpgradeProDialog>
          )}
          <Button
            variant="outline"
            className="rounded-full gap-2 shadow-sm bg-white hover:bg-gray-50"
            onClick={() => {
              if (onTabChange) {
                onTabChange('review-link')
              }
            }}
          >
            <Link className="h-4 w-4" />
            Links
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full gap-2 bg-white shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuItem
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={handleShareLoop}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
                  <Upload className="h-4 w-4" />
                </div>
                <span>Share my Loop to...</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={handleShowQRCode}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(87, 140, 255, 0.1)', color: 'rgb(87, 140, 255)' }}>
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <span>My Loop QR code</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={handleOpenLink}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-200 text-lime-700">
                  <Globe className="h-4 w-4" />
                </div>
                <span>Open my Loop</span>
              </DropdownMenuItem>
              <div className="mt-2 flex items-center rounded-lg bg-gray-100 p-2">
                <Sparkles className="mr-2 h-4 w-4 text-violet-600" />
                <span className="flex-1 text-xs font-medium text-gray-800 truncate">
                  linktr.ee/{customizationSettings.company_name.toLowerCase().replace(/\s+/g, '')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md bg-white px-2 py-1 text-xs"
                  onClick={handleCopyLink}
                >
                  Copy
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Live Link Alert */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
  <div className="flex items-start gap-3">
    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    <div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        Your review link is live:{" "}
        <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
          {reviewLink}
        </a>
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Customize your review link appearance and design</p>
    </div>
  </div>
  <div className="flex gap-2">
  <Button
      variant="outline"
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
    >
      Open URL
    </Button>
  </div>
</div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Design Controls */}
        <div className="lg:col-span-3 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            <Card className="p-6 rounded-xl shadow-sm bg-white dark:bg-gray-800">
              <div className="flex justify-center mb-6">
                {/* Classic Profile */}
                <div
  className={`relative flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all ${
    selectedProfile === "classic"
      ? "border-gray-300 dark:border-gray-600"
      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
  }`}
  onClick={() => setSelectedProfile("classic")}
>

                  <div className="relative h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                    {safeLogoUrl(customizationSettings.company_logo_url) ? (
                      <Image
                        src={safeLogoUrl(customizationSettings.company_logo_url)!}
                        alt="Company Profile"
                        width={40}
                        height={40}
                        className="rounded-full object-cover w-full h-full"
                      />
                    ) : (
                      <Image
                        src="/placeholder.svg?height=40&width=40"
                        alt="Classic Profile"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium">Classic</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-6 w-full rounded-full py-6 text-base font-semibold bg-transparent"
                onClick={() => {
                  // Create file input
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      try {
                        // Convert file to base64 string using FileReader
                        const reader = new FileReader()
                        reader.onloadend = async () => {
                          const base64String = reader.result as string

                          const result = await updateLogo(base64String)

                          if (result.success) {
                            // Success - the logo URL will be updated via the useEffect hook
                          } else {
                            throw new Error('Upload failed')
                          }
                        }
                        reader.readAsDataURL(file)
                      } catch (error) {
                        // Failed to upload logo
                        // Show user-friendly error message
                        const errorToast = document.createElement('div')
                        errorToast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
                        errorToast.textContent = 'Failed to upload logo. Please try again.'
                        document.body.appendChild(errorToast)
                        setTimeout(() => errorToast.remove(), 3000)
                      }
                    }
                  }
                  input.click()
                }}
              >
                <ImageIcon className="mr-2 h-5 w-5" />
                Edit image
              </Button>
            </Card>
          </section>

        {/* Theme Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Theme</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Theme Presets
                </label>
                <style jsx>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                  }
                  @keyframes rainbow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  @keyframes sparkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                  }
                  @keyframes wave {
                    0% { transform: translateX(0) translateY(0); }
                    25% { transform: translateX(5px) translateY(-5px); }
                    50% { transform: translateX(0) translateY(-10px); }
                    75% { transform: translateX(-5px) translateY(-5px); }
                    100% { transform: translateX(0) translateY(0); }
                  }
                  .theme-float { animation: float 3s ease-in-out infinite; }
                  .theme-rainbow {
                    background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #dda0dd);
                    background-size: 400% 400%;
                    animation: rainbow 4s ease infinite;
                  }
                  .theme-sparkle { animation: sparkle 2s ease-in-out infinite; }
                  .theme-wave { animation: wave 4s ease-in-out infinite; }
                `}</style>
                <div className="grid grid-cols-4 gap-3 mb-4">

                  {/* Pebble Blue Theme */}
                  <div
                    className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                      selectedTheme === "loop-blue"
                        ? "border-black ring-2 ring-black ring-offset-2"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                    onClick={() => handleThemeChange("loop-blue")}
                  >
                    <div className="w-full h-full rounded-md overflow-hidden relative bg-[#87CEEB]">
                      <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-md bg-[#FF6347]" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                    </div>
                    <p className="text-sm font-medium mt-1">Pebble Blue</p>
                  </div>

                  {/* Pebble Yellow Theme */}
                  <div
                    className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                      selectedTheme === "loop-yellow"
                        ? "border-black ring-2 ring-black ring-offset-2"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                    onClick={() => handleThemeChange("loop-yellow")}
                  >
                    <div className="w-full h-full rounded-md overflow-hidden relative bg-[#FFD700]">
                      <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-md bg-[#DA70D6]" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                    </div>
                    <p className="text-sm font-medium mt-1">Pebble Yellow</p>
                  </div>

                  {/* Pebble Pink Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "pebble-pink"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("pebble-pink")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-[#FFC0CB]">
                        <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-md bg-[#6495ED]" />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                      </div>
                      <p className="text-sm font-medium mt-1">Pebble Pink</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-[#FFC0CB]">
                          <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-md bg-[#6495ED]" />
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-[#F5DEB3]" />
                        </div>
                        <p className="text-sm font-medium mt-1">Pebble Pink</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Cloud Red Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "cloud-red"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("cloud-red")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-red-100 via-red-200 to-red-300">
                        <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                        <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                        <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                      </div>
                      <p className="text-sm font-medium mt-1">Cloud Red</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-red-100 via-red-200 to-red-300">
                          <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                          <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                          <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        </div>
                        <p className="text-sm font-medium mt-1">Cloud Red</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Cloud Green Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "cloud-green"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("cloud-green")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-green-100 via-green-200 to-emerald-300">
                        <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                        <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                        <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                      </div>
                      <p className="text-sm font-medium mt-1">Cloud Green</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-green-100 via-green-200 to-emerald-300">
                          <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                          <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                          <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        </div>
                        <p className="text-sm font-medium mt-1">Cloud Green</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Cloud Blue Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "cloud-blue"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("cloud-blue")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-blue-100 via-blue-200 to-sky-300">
                        <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                        <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                        <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                      </div>
                      <p className="text-sm font-medium mt-1">Cloud Blue</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-blue-100 via-blue-200 to-sky-300">
                          <div className="absolute top-2 right-2 w-8 h-8 bg-white/60 rounded-full blur-sm"></div>
                          <div className="absolute top-6 left-4 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                          <div className="absolute bottom-8 right-6 w-10 h-10 bg-white/50 rounded-full blur-sm"></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        </div>
                        <p className="text-sm font-medium mt-1">Cloud Blue</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Breeze Pink Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "breeze-pink"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("breeze-pink")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-pink-200 via-pink-300 to-rose-400">
                        <div className="absolute inset-0 theme-float">
                          <div className="absolute top-2 left-2 w-6 h-6 bg-white/30 rounded-full"></div>
                          <div className="absolute top-8 right-4 w-4 h-4 bg-white/40 rounded-full"></div>
                          <div className="absolute bottom-8 left-1/3 w-5 h-5 bg-white/20 rounded-full"></div>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                      </div>
                      <p className="text-sm font-medium mt-1">Breeze Pink</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-pink-200 via-pink-300 to-rose-400">
                          <div className="absolute inset-0 theme-float">
                            <div className="absolute top-2 left-2 w-6 h-6 bg-white/30 rounded-full"></div>
                            <div className="absolute top-8 right-4 w-4 h-4 bg-white/40 rounded-full"></div>
                            <div className="absolute bottom-8 left-1/3 w-5 h-5 bg-white/20 rounded-full"></div>
                          </div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/80" />
                        </div>
                        <p className="text-sm font-medium mt-1">Breeze Pink</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Rainbow Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "rainbow"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("rainbow")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative theme-rainbow">
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                      </div>
                      <p className="text-sm font-medium mt-1">Rainbow</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative theme-rainbow">
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        </div>
                        <p className="text-sm font-medium mt-1">Rainbow</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Starry Night Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "starry-night"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("starry-night")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700">
                        <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-300 rounded-full theme-sparkle"></div>
                        <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full theme-sparkle" style={{animationDelay: '0.5s'}}></div>
                        <div className="absolute top-6 left-1/3 w-1 h-1 bg-blue-200 rounded-full theme-sparkle" style={{animationDelay: '1s'}}></div>
                        <div className="absolute top-8 right-1/4 w-1 h-1 bg-yellow-200 rounded-full theme-sparkle" style={{animationDelay: '1.5s'}}></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                      </div>
                      <p className="text-sm font-medium mt-1">Starry Night</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700">
                          <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-300 rounded-full theme-sparkle"></div>
                          <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full theme-sparkle" style={{animationDelay: '0.5s'}}></div>
                          <div className="absolute top-6 left-1/3 w-1 h-1 bg-blue-200 rounded-full theme-sparkle" style={{animationDelay: '1s'}}></div>
                          <div className="absolute top-8 right-1/4 w-1 h-1 bg-yellow-200 rounded-full theme-sparkle" style={{animationDelay: '1.5s'}}></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-slate-600" />
                        </div>
                        <p className="text-sm font-medium mt-1">Starry Night</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Miami Theme */}
                  {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                    <div
                      className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                        selectedTheme === "miami"
                          ? "border-black ring-2 ring-black ring-offset-2"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleThemeChange("miami")}
                    >
                      <div className="w-full h-full rounded-md overflow-hidden relative" style={{ background: 'linear-gradient(to bottom right, #22d3ee, rgb(87, 140, 255), rgb(67, 120, 235))' }}>
                        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-orange-400 to-pink-400 theme-wave"></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                      </div>
                      <p className="text-sm font-medium mt-1">Miami</p>
                    </div>
                  ) : (
                    <UpgradeProDialog>
                      <div className="relative flex flex-col items-center p-2 border border-gray-200 rounded-lg h-40 cursor-pointer hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600">
                        <div className="w-full h-full rounded-md overflow-hidden relative" style={{ background: 'linear-gradient(to bottom right, #22d3ee, rgb(87, 140, 255), rgb(67, 120, 235))' }}>
                          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-orange-400 to-pink-400 theme-wave"></div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-white/90" />
                        </div>
                        <p className="text-sm font-medium mt-1">Miami</p>
                        <Zap className="absolute top-2 right-2 h-4 w-4 text-gray-500 fill-gray-500" />
                      </div>
                    </UpgradeProDialog>
                  )}

                  {/* Custom Theme */}
                  <div
                    className={`relative flex flex-col items-center p-2 border rounded-lg h-40 cursor-pointer transition-all ${
                      selectedTheme === "custom"
                        ? "border-black ring-2 ring-black ring-offset-2"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                    onClick={() => handleThemeChange("custom")}
                  >
                    <div className="w-full h-full rounded-md overflow-hidden relative bg-gradient-to-br from-gray-100 to-gray-200">
                      <div className="absolute top-0 left-0 w-full h-1/3 rounded-t-md bg-gradient-to-r from-gray-400 to-gray-500" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-gray-300" />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-gray-300" />
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full bg-gray-300" />
                    </div>
                    <p className="text-sm font-medium mt-1">Custom</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Style Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Style</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="text" className="rounded-2xl">Text</TabsTrigger>
                <TabsTrigger
                  value="buttons"
                  className="rounded-2xl"
                  onClick={() => setPreviewStep("positiveExperience")}
                >
                  Buttons
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4 space-y-4">
                <div>
                  <label htmlFor="font-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Font
                  </label>
                  <Select
                    value={selectedFont}
                    onValueChange={(value) => {
                      setSelectedFont(value)
                      setCustomizationSettings(prev => ({
                        ...prev,
                        font: value
                      }))
                    }}
                  >
                    <SelectTrigger id="font-select" className="w-full mt-1 rounded-2xl">
                      <SelectValue placeholder="Select a font" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="gothic-a1">Gothic A1</SelectItem>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Page text color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Button text color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={buttonTextColor}
                      onChange={(e) => {
                        setButtonTextColor(e.target.value)
                        setPreviewStep("positiveExperience")
                      }}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={buttonTextColor}
                      onChange={(e) => {
                        setButtonTextColor(e.target.value)
                        setPreviewStep("positiveExperience")
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                {selectedTheme === "custom" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Background color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#F0F8FF"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="buttons" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Button Style
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button
                        variant={buttonStyle === "rounded-md" ? "default" : "outline"}
                        className="rounded-md"
                        onClick={() => {
                          setButtonStyle("rounded-md")
                          setPreviewStep("positiveExperience")
                        }}
                      >
                        Square
                      </Button>
                      <Button
                        variant={buttonStyle === "rounded-lg" ? "default" : "outline"}
                        className="rounded-lg"
                        onClick={() => {
                          setButtonStyle("rounded-lg")
                          setPreviewStep("positiveExperience")
                        }}
                      >
                        Rounded
                      </Button>
                      <Button
                        variant={buttonStyle === "rounded-full" ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => {
                          setButtonStyle("rounded-full")
                          setPreviewStep("positiveExperience")
                        }}
                      >
                        Full
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Button background color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customizationSettings.primary_color}
                        onChange={(e) => {
                          setCustomizationSettings((prev) => ({
                            ...prev,
                            primary_color: e.target.value
                          }))
                          setPreviewStep("positiveExperience")
                        }}
                        className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customizationSettings.primary_color}
                        onChange={(e) => {
                          setCustomizationSettings((prev) => ({
                            ...prev,
                            primary_color: e.target.value
                          }))
                          setPreviewStep("positiveExperience")
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Button secondary color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customizationSettings.secondary_color}
                        onChange={(e) => {
                          setCustomizationSettings((prev) => ({
                            ...prev,
                            secondary_color: e.target.value
                          }))
                          setPreviewStep("positiveExperience")
                        }}
                        className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customizationSettings.secondary_color}
                        onChange={(e) => {
                          setCustomizationSettings((prev) => ({
                            ...prev,
                            secondary_color: e.target.value
                          }))
                          setPreviewStep("positiveExperience")
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#333333"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        {/* Hide Loop Footer Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Hide Loop Footer</h2>
          <Card className="p-6 rounded-2xl shadow-sm bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  Hide the Loop footer
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remove "Powered by Loop" from your review pages
                </p>
              </div>
              {(userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active' ? (
                <Switch
                  checked={!customizationSettings.show_powered_by}
                  onCheckedChange={(checked) =>
                    setCustomizationSettings((prev: any) => ({
                      ...prev,
                      show_powered_by: !checked
                    }))
                  }
                />
              ) : (
                <UpgradeProDialog>
                  <Button variant="ghost" size="sm" className="text-yellow-600 hover:text-yellow-700">
                    <Zap className="h-4 w-4 mr-1" />
                    Upgrade
                  </Button>
                </UpgradeProDialog>
              )}
            </div>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Zap className="h-3 w-3" />
                <span>Powered by Loop</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Save Button */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700 -mx-6 mt-8">
          <Button
            className="w-full rounded-full bg-black text-white hover:bg-gray-800"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Design Settings"}
          </Button>
        </div>
      </div>

      {/* Right Column: Mobile Preview */}
      <div className="lg:col-span-2 space-y-6 w-full">
        <div className="sticky top-6 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg h-fit overflow-hidden">
          <div className="relative w-[320px] h-[650px] rounded-[40px] bg-black shadow-2xl flex items-center justify-center border-[10px] border-gray-800 overflow-hidden">
            {/* iPhone Bezel */}
            <div className="absolute inset-0 rounded-[35px] border-[2px] border-gray-700 pointer-events-none"></div>
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-black rounded-b-xl z-10 flex items-center justify-center">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>
            {/* Screen */}
            <div className="w-full h-full rounded-[30px] overflow-hidden">
              <MobileReviewPreviewDisplay
              key={`preview-${customizationSettings.company_logo_url || 'no-logo'}-${backgroundColor}-${customizationSettings.primary_color}-${customizationSettings.secondary_color}-${textColor}-${buttonTextColor}-${buttonStyle}-${selectedFont}-${selectedProfile}`}
              formData={{
                companyName: customizationSettings.company_name,
                companyLogo: safeLogoUrl(customizationSettings.company_logo_url),
                messages: customizationSettings.messages,
                conditionalActions: customizationSettings.conditional_actions,
                trustpilotUrl: customizationSettings.trustpilot_url,
                googleUrl: customizationSettings.google_url,
                facebookUrl: customizationSettings.facebook_url,
                primaryColor: customizationSettings.primary_color,
                secondaryColor: customizationSettings.secondary_color,
                enabledPlatforms: customizationSettings.enabled_platforms,
                links: links.filter(link => link.isActive),
                headerSettings: headerSettings,
                initialViewSettings: initialViewSettings,
                negativeSettings: negativeSettings,
                videoUploadSettings: videoUploadSettings,
                successSettings: successSettings,
                backgroundColor: backgroundColor,
                textColor: textColor,
                buttonTextColor: buttonTextColor,
                buttonStyle: buttonStyle,
                font: selectedFont,
                profileStyle: selectedProfile,
              }}
              initialPreviewStep={previewStep}
              onPreviewStepChange={setPreviewStep}
              setCompanyName={(name) => setCustomizationSettings((prev: any) => ({ ...prev, company_name: name }))}
              setCompanyLogo={(url) => setCustomizationSettings((prev: any) => ({ ...prev, company_logo_url: url }))}
              setRatingPageContent={(content) =>
                setCustomizationSettings((prev: any) => ({
                  ...prev,
                  messages: { ...prev.messages, rating_page_content: content },
                }))
              }
              setRedirectText={(text) =>
                setCustomizationSettings((prev: any) => ({
                  ...prev,
                  messages: { ...prev.messages, redirect_text: text },
                }))
              }
              setNegativePageContent={(content) =>
                setCustomizationSettings((prev: any) => ({
                  ...prev,
                  messages: { ...prev.messages, negative_page_content: content },
                }))
              }
              setThankYouText={(text) =>
                setCustomizationSettings((prev: any) => ({
                  ...prev,
                  messages: { ...prev.messages, thank_you_text: text },
                }))
              }
              setVideoUploadText={(text) =>
                setCustomizationSettings((prev: any) => ({
                  ...prev,
                  messages: { ...prev.messages, video_upload_text: text },
                }))
              }
              showPoweredBy={shouldShowPoweredBy}
              setShowPoweredBy={(value) => setCustomizationSettings((prev: any) => ({ ...prev, show_powered_by: value }))}
              setTrustpilotUrl={(url) => setCustomizationSettings((prev: any) => ({ ...prev, trustpilot_url: url }))}
              setGoogleUrl={(url) => setCustomizationSettings((prev: any) => ({ ...prev, google_url: url }))}
              setFacebookUrl={(url) => setCustomizationSettings((prev: any) => ({ ...prev, facebook_url: url }))}
              setEnabledPlatforms={(platforms) =>
                setCustomizationSettings((prev: any) => ({ ...prev, enabled_platforms: platforms }))
              }
              isPublicView={false}
            />
            </div>
          </div>

          {/* Hide Loop logo button - only show for free users */}
          {!((userInfo.subscription_type === 'pro' || userInfo.subscription_type === 'enterprise') && userInfo.subscription_status === 'active') && (
            <div className="mt-4 flex justify-center">
              <UpgradeProDialog>
                <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-bold">Hide Loop logo</span>
                </Button>
              </UpgradeProDialog>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>My Loop QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code for customers to easily access your review page
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              {reviewLink && (
                <QRCode
                  value={reviewLink}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                />
              )}
            </div>
            <div className="w-full space-y-2">
              <p className="text-sm font-medium text-gray-700">Review Link:</p>
              <div className="flex items-center space-x-2">
                <Input
                  value={reviewLink}
                  readOnly
                  className="flex-1 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  )
}