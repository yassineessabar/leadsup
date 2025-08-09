"use client";

import React from "react"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { cachedFetch, invalidateCache, CACHE_KEYS } from "@/lib/cache"
import { useCompanyLogo } from "@/hooks/useCompanyLogo"
import { useSubscription } from "@/hooks/use-subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Copy, ExternalLink, QrCode, UploadCloud, Crown, ChevronDown, ChevronUp, Info, Share2, Plus, SquareStack, Archive, ChevronRight, Globe, X, Users, Upload, LayoutGrid, Instagram, Sparkles, GripVertical, Pencil, BarChart, ImageIcon, Star, Lock, Trash2, ArrowUp, Palette, Link, ChevronLeft, Zap, Save, CheckCircle, Video, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import { MobileReviewPreviewDisplay } from "./mobile-review-preview-display"
import { UpgradeProDialog } from "./upgrade-pro-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox

// Dynamically import QRCode to prevent SSR issues
const QRCode = dynamic(
  () => import("qrcode.react").then(mod => mod.QRCodeSVG),
  { ssr: false }
)

interface CustomizationSettings {
  company_name: string
  company_logo_url: string | null
  profile_picture_url: string | null
  bio: string | null
  primary_color: string
  secondary_color: string
  show_powered_by: boolean
  messages: {
    rating_page_content: string
    redirect_text: string
    notification_text: string
    video_upload_text: string
  }
  conditional_actions: {
    [key: number]: { type: string; value?: string; platform?: string }
  }
  trustpilot_url: string
  google_url: string
  facebook_url: string // New field for Facebook URL
  selected_review_platform: "Google" | "Trustpilot" | "Facebook" // Updated type
  enabled_platforms: string[] // New field for enabled platforms
}

interface ReviewLink {
  id: number
  title: string
  url: string
  buttonText: string
  clicks: number
  isActive: boolean
  platformId?: string
  platformLogo?: string | null
}

type SubTabType = 'landing' | 'links' | 'negative' | 'success'

interface ReviewLinkTabProps {
  mode?: 'links' | 'appearance'
  onTabChange?: (tab: string) => void
}

export function ReviewLinkTab({ mode = 'links', onTabChange }: ReviewLinkTabProps = {}) {
  const { logoUrl, updateLogo, refreshLogo } = useCompanyLogo()
  const { hasActiveSubscription, userInfo } = useSubscription()

  // Computed value to determine if powered by should be shown
  const shouldShowPoweredBy = (() => {
    // If user is pro or enterprise with active status, hide powered by
    if ((userInfo?.subscription_type === 'pro' || userInfo?.subscription_type === 'enterprise') && userInfo?.subscription_status === 'active') {
      return false
    }
    // Otherwise use the customization settings
    return true // Default to showing powered by for free users
  })()

  const [customizationSettings, setCustomizationSettings] = useState<CustomizationSettings>({
    company_name: "Your Company",
    company_logo_url: null,
    profile_picture_url: null,
    bio: null,
    primary_color: "#000000", // Indigo-600
    secondary_color: "#000000", // Indigo-500
    show_powered_by: true,
    messages: {
      rating_page_content: "How was your experience with {{companyName}}?",
      redirect_text: "Thank you for your feedback! Please click the button below to leave a review.",
      notification_text: "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
      video_upload_text: "Record a short video testimonial for {{companyName}}!",
    },
    conditional_actions: {
      "1": { type: "notify-email" },
      "2": { type: "notify-email" },
      "3": { type: "notify-email" },
      "4": { type: "redirect", platform: "Google" },
      "5": { type: "redirect", platform: "Google" },
    },
    trustpilot_url: "https://www.trustpilot.com/review/example.com",
    google_url: "https://g.page/example/review",
    facebook_url: "https://www.facebook.com/yourpage/reviews/", // Default Facebook URL
    selected_review_platform: "Google", // Default selected platform for static link
    enabled_platforms: ["Google", "Trustpilot", "Video Testimonial"], // Default enabled platforms
  })

  const [reviewLink, setReviewLink] = useState<string>("")
  const [isPremium, setIsPremium] = useState(false) // Placeholder for premium status
  const [previewStep, setPreviewStep] = useState<"initial" | "positiveExperience" | "negativeExperience" | "videoUpload" | "success">("initial")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Track component mount status to prevent updates during unmounting
  const isMountedRef = useRef(true)

  // Collapse/expand state for sections - all minimized by default
  const [isCustomizationExpanded, setIsCustomizationExpanded] = useState(false)
  const [isMessagesExpanded, setIsMessagesExpanded] = useState(false)
  const [isPlatformsExpanded, setIsPlatformsExpanded] = useState(false)
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("landing")

  // Track current activeSubTab to avoid stale closures
  const activeSubTabRef = useRef(activeSubTab)
  const autoSaveTriggeredRef = useRef(false)
  const landingPageSaveButtonRef = useRef<HTMLButtonElement>(null)
  const [links, setLinks] = useState<ReviewLink[]>([])
  const [editingLink, setEditingLink] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<'title' | 'url' | 'buttonText' | null>(null)
  const [draggedLink, setDraggedLink] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingHeaderField, setEditingHeaderField] = useState<'header' | 'text' | null>(null)
  const [editingInitialField, setEditingInitialField] = useState<'header' | 'text' | null>(null)

  // Track if fields have been modified to show save button
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalHeaderSettings, setOriginalHeaderSettings] = useState({
    header: "Great to hear!",
    text: "Thank you for your feedback! Please click the button below to leave a review."
  })
  const [originalInitialSettings, setOriginalInitialSettings] = useState({
    header: "How was your experience at {{companyName}}?",
    text: "We'd love to hear about your experience with our service."
  })
  const [originalNegativeSettings, setOriginalNegativeSettings] = useState({
    header: "We're sorry to hear that.",
    text: "Please tell us how we can improve:"
  })
  const [originalVideoSettings, setOriginalVideoSettings] = useState({
    header: "Share your experience!",
    text: "Record a short video testimonial to help others learn about our service."
  })
  const [originalSuccessSettings, setOriginalSuccessSettings] = useState({
    header: "Thank you!",
    text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience."
  })
  const [originalLinks, setOriginalLinks] = useState<ReviewLink[]>([])

  // Appearance settings state
  const [backgroundColor, setBackgroundColor] = useState("#F0F8FF")
  const [textColor, setTextColor] = useState("#1F2937")
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF")
  const [buttonStyle, setButtonStyle] = useState("rounded-full")
  const [selectedFont, setSelectedFont] = useState("gothic-a1")
  const [selectedTheme, setSelectedTheme] = useState("custom")
  const [editingNegativeField, setEditingNegativeField] = useState<'header' | 'text' | null>(null)
  const [editingVideoField, setEditingVideoField] = useState<'header' | 'text' | null>(null)
  const [editingSuccessField, setEditingSuccessField] = useState<'header' | 'text' | null>(null)
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)
  const [addLinkStep, setAddLinkStep] = useState<'platform' | 'details'>('platform')
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkButtonText, setNewLinkButtonText] = useState('')
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update activeSubTabRef when activeSubTab changes
  useEffect(() => {
    activeSubTabRef.current = activeSubTab
  }, [activeSubTab])

  // Reset auto-save trigger when component mounts fresh (i.e., not coming from onboarding)
  useEffect(() => {
    // Only reset if there's no valid completion redirect data
    const completionData = sessionStorage.getItem('completion_redirect')
    if (!completionData) {
      autoSaveTriggeredRef.current = false
    } else {
      try {
        const data = JSON.parse(completionData)
        const timeDiff = Date.now() - data.timestamp
        // Reset if the completion data is stale (older than 10 seconds)
        if (timeDiff >= 10000) {
          autoSaveTriggeredRef.current = false
          sessionStorage.removeItem('completion_redirect')
        }
      } catch (error) {
        // Invalid data, reset everything
        autoSaveTriggeredRef.current = false
        sessionStorage.removeItem('completion_redirect')
      }
    }
  }, []) // Run only once on component mount

  // Memoize whether video testimonial exists to avoid dependency array issues
  const hasVideoTestimonial = useMemo(() => {
    return links.some(link => link.platformId === 'video-testimonial')
  }, [links])

  // Update preview step when switching tabs
  useEffect(() => {
    if (activeSubTab === "landing") {
      setPreviewStep("initial")
    } else if (activeSubTab === "links") {
      setPreviewStep("positiveExperience")
    } else if (activeSubTab === "negative") {
      setPreviewStep("negativeExperience")
    } else if (activeSubTab === "video") {
      // Only allow video tab if there's a video testimonial link
      if (hasVideoTestimonial) {
        setPreviewStep("videoUpload")
      } else {
        setActiveSubTab("landing")
        setPreviewStep("initial")
      }
    } else if (activeSubTab === "success") {
      setPreviewStep("success")
    } else {
      setPreviewStep("initial")
    }
  }, [activeSubTab, hasVideoTestimonial])

  // Update active tab when preview step changes (when navigating in mobile preview)
  useEffect(() => {
    if (previewStep === "initial") {
      setActiveSubTab("landing")
    } else if (previewStep === "positiveExperience") {
      setActiveSubTab("links")
    } else if (previewStep === "negativeExperience") {
      setActiveSubTab("negative")
    } else if (previewStep === "videoUpload") {
      // Only set video tab if there's a video testimonial link
      if (hasVideoTestimonial) {
        setActiveSubTab("video")
      } else {
        setActiveSubTab("landing")
      }
    } else if (previewStep === "success") {
      setActiveSubTab("success")
    }
  }, [previewStep, hasVideoTestimonial])

  // Set initial preview step on component mount
  useEffect(() => {
    if (activeSubTab === "landing") {
      setPreviewStep("initial")
    } else if (activeSubTab === "links") {
      setPreviewStep("positiveExperience")
    } else if (activeSubTab === "negative") {
      setPreviewStep("negativeExperience")
    } else if (activeSubTab === "success") {
      setPreviewStep("success")
    }
  }, [])

  // Auto-save functionality - save whenever settings change
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Track changes to determine if we have unsaved changes - OPTIMIZED
  useEffect(() => {
    if (isInitialLoad) return

    // Use a more efficient comparison method
    const hasChanges =
      headerSettings.header !== originalHeaderSettings.header ||
      headerSettings.text !== originalHeaderSettings.text ||
      initialViewSettings.header !== originalInitialSettings.header ||
      initialViewSettings.text !== originalInitialSettings.text ||
      negativeSettings.header !== originalNegativeSettings.header ||
      negativeSettings.text !== originalNegativeSettings.text ||
      videoUploadSettings.header !== originalVideoSettings.header ||
      videoUploadSettings.text !== originalVideoSettings.text ||
      successSettings.header !== originalSuccessSettings.header ||
      successSettings.text !== originalSuccessSettings.text ||
      links.length !== originalLinks.length ||
      links.some((link, index) =>
        JSON.stringify(link) !== JSON.stringify(originalLinks[index])
      )

    setHasUnsavedChanges(hasChanges)
  }, [headerSettings, initialViewSettings, negativeSettings, videoUploadSettings, successSettings, links, originalHeaderSettings, originalInitialSettings, originalNegativeSettings, originalVideoSettings, originalSuccessSettings, originalLinks, isInitialLoad])

  useEffect(() => {
    if (isInitialLoad || !isMountedRef.current || hasUnsavedChanges) return

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && !hasUnsavedChanges) {
        handleSave()
      }
    }, 2000) // Increased debounce to 2 seconds for better performance

    return () => clearTimeout(timeoutId)
  }, [customizationSettings, links, backgroundColor, textColor, buttonTextColor, buttonStyle, selectedFont, selectedTheme, isInitialLoad, hasUnsavedChanges])

  // Fetch review link data and user data on component mount - OPTIMIZED
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Parallel API calls for better performance with individual error handling
        const results = await Promise.allSettled([
          cachedFetch('/api/auth/me', { credentials: 'include' }, 30000), // Cache for 30s
          cachedFetch('/api/review-link', { credentials: 'include' }, 60000)  // Cache for 1min
        ])

        const userResult = results[0].status === 'fulfilled' ? results[0].value : null
        const reviewResult = results[1].status === 'fulfilled' ? results[1].value : null

        // Log any failures for debugging
        if (results[0].status === 'rejected') {
          }
        if (results[1].status === 'rejected') {
          }

        // Process user data (cachedFetch returns JSON directly)
        let userCompanyName = "Your Company"
        let userProfilePicture = null
        let userBio = null

        if (userResult && userResult.success && userResult.user) {
          userCompanyName = userResult.user.company || userCompanyName
          userProfilePicture = userResult.user.profile_picture_url
          userBio = userResult.user.bio
        } else if (userResult && !userResult.success) {
          console.error('User API failed:', userResult.error)
          toast({
            title: "Authentication Error",
            description: "Failed to load user data",
            variant: "destructive",
          })
        }

        // Process review link data (cachedFetch returns JSON directly)
        if (reviewResult && reviewResult.success && reviewResult.data) {
            const data = reviewResult.data

            // Batch state updates for better performance
            const newCustomizationSettings = {
              company_name: data.company_name || userCompanyName,
              company_logo_url: logoUrl || data.company_logo_url,
              profile_picture_url: userProfilePicture,
              bio: userBio,
              primary_color: data.primary_color || "#e66465",
              secondary_color: data.secondary_color || "#9198e5",
              show_powered_by: data.show_badge !== false,
              messages: {
                rating_page_content: data.rating_page_content || "How was your experience with {{companyName}}?",
                redirect_text: data.redirect_message || "Thank you for your feedback! Please click the button below to leave a review.",
                notification_text: data.internal_notification_message || "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
                video_upload_text: data.video_upload_message || "Record a short video testimonial for {{companyName}}!",
              },
              conditional_actions: {
                "1": { type: "notify-email" },
                "2": { type: "notify-email" },
                "3": { type: "notify-email" },
                "4": { type: "redirect", platform: "Google" },
                "5": { type: "redirect", platform: "Google" },
              },
              trustpilot_url: data.trustpilot_review_link || "https://www.trustpilot.com/review/example.com",
              google_url: data.google_review_link || "https://g.page/example/review",
              facebook_url: data.facebook_review_link || "https://www.facebook.com/yourpage/reviews/",
              selected_review_platform: "Google",
              enabled_platforms: data.enabled_platforms || ["Google", "Trustpilot"],
            }

            // Process links data once
            const processedLinks = data.links && Array.isArray(data.links)
              ? restorePlatformLogos(data.links)
              : []

            // Batch all state updates together
            setCustomizationSettings(newCustomizationSettings)
            setReviewLink(data.review_url || "")
            setLinks(processedLinks)
            setOriginalLinks(processedLinks)

            // Batch appearance settings
            if (data.background_color) setBackgroundColor(data.background_color)
            if (data.text_color) setTextColor(data.text_color)
            if (data.button_text_color) setButtonTextColor(data.button_text_color)
            if (data.button_style) setButtonStyle(data.button_style)
            if (data.font) setSelectedFont(data.font)

            // Optimize settings loading with helper function
            const loadSetting = (setting: any, fallback: { header: string, text: string }) => ({
              header: setting?.header || fallback.header,
              text: setting?.text || fallback.text
            })

            const headerSettings = loadSetting(data.header_settings, {
              header: "Great to hear!",
              text: "Thank you for your feedback! Please click the button below to leave a review."
            })
            const initialSettings = loadSetting(data.initial_view_settings, {
              header: "How was your experience at {{companyName}}?",
              text: "We'd love to hear about your experience with our service."
            })
            const negativeSettings = loadSetting(data.negative_settings, {
              header: "We're sorry to hear that.",
              text: "Please tell us how we can improve:"
            })
            const videoSettings = loadSetting(data.video_upload_settings, {
              header: "Share your experience!",
              text: "Record a short video testimonial to help others learn about our service."
            })
            const successSettingsData = loadSetting(data.success_settings, {
              header: "Thank you!",
              text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience."
            })

            // Batch all settings updates
            setHeaderSettings(headerSettings)
            setOriginalHeaderSettings(headerSettings)
            setInitialViewSettings(initialSettings)
            setOriginalInitialSettings(initialSettings)
            setNegativeSettings(negativeSettings)
            setOriginalNegativeSettings(negativeSettings)
            setVideoUploadSettings(videoSettings)
            setOriginalVideoSettings(videoSettings)
            setSuccessSettings(successSettingsData)
            setOriginalSuccessSettings(successSettingsData)
        } else if (!reviewResult || !reviewResult.success) {
          // No review link found or error - use user's data as default
          setCustomizationSettings(prev => ({
            ...prev,
            company_name: userCompanyName,
            profile_picture_url: userProfilePicture,
            bio: userBio
          }))
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "Failed to load data. Please refresh the page.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    }

    fetchData()
  }, [])

  // Force refresh function for debugging
  const forceRefreshData = async () => {
    const refetchData = async () => {
      try {
        // Force fresh fetch by invalidating cache first
        invalidateCache('/api/review-link')

        // Add timestamp to bypass cache completely
        const timestamp = Date.now()
        const freshUrl = '/api/review-link?t=' + timestamp

        // Fetch fresh data directly without cache to ensure we get latest data
        const result = await fetch(freshUrl, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }).then(res => res.json())

        if (result && result.success && result.data) {
          const data = result.data
          // Apply the same update logic
          if (data.links && Array.isArray(data.links)) {
            const linksWithLogos = restorePlatformLogos(data.links)
            setLinks(linksWithLogos)
            setOriginalLinks(linksWithLogos)
          }

          const loadSetting = (setting: any, fallback: { header: string, text: string }) => ({
            header: setting?.header || fallback.header,
            text: setting?.text || fallback.text
          })

          const refreshedHeaderSettings = loadSetting(data.header_settings, {
            header: "Great to hear!",
            text: "Thank you for your feedback! Please click the button below to leave a review."
          })
          const refreshedInitialSettings = loadSetting(data.initial_view_settings, {
            header: "How was your experience at {{companyName}}?",
            text: "We'd love to hear about your experience with our service."
          })

          // Force immediate re-render by using functional updates
          setHeaderSettings(() => refreshedHeaderSettings)
          setOriginalHeaderSettings(() => refreshedHeaderSettings)
          setInitialViewSettings(() => refreshedInitialSettings)
          setOriginalInitialSettings(() => refreshedInitialSettings)

          if (data.review_url) {
            setReviewLink(data.review_url)
          }

          }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    await refetchData()
  }

  // Listen for custom events to refetch data when tab becomes active - OPTIMIZED
  useEffect(() => {
    const refetchData = async () => {
      if (!isInitialLoad && isMountedRef.current) {
        try {
          // Force fresh fetch by invalidating cache first
          invalidateCache('/api/review-link')

          // Add timestamp to bypass cache completely
          const timestamp = Date.now()
          const freshUrl = '/api/review-link?t=' + timestamp

          // Fetch fresh data directly without cache to ensure we get latest data
          const result = await fetch(freshUrl, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }).then(res => res.json())
          if (result && result.success && result.data) {
            const data = result.data
            // Only update if data actually changed (avoid unnecessary re-renders)
              if (data.links && Array.isArray(data.links)) {
                const linksWithLogos = restorePlatformLogos(data.links)
                const hasLinksChanged = JSON.stringify(linksWithLogos) !== JSON.stringify(links)
                if (hasLinksChanged) {
                  setLinks(linksWithLogos)
                  setOriginalLinks(linksWithLogos)
                }
              }
              // Use the same helper function for consistency
              const loadSetting = (setting: any, fallback: { header: string, text: string }) => ({
                header: setting?.header || fallback.header,
                text: setting?.text || fallback.text
              })

              const refreshedHeaderSettings = loadSetting(data.header_settings, {
                header: "Great to hear!",
                text: "Thank you for your feedback! Please click the button below to leave a review."
              })
              const refreshedInitialSettings = loadSetting(data.initial_view_settings, {
                header: "How was your experience at {{companyName}}?",
                text: "We'd love to hear about your experience with our service."
              })
              const refreshedNegativeSettings = loadSetting(data.negative_settings, {
                header: "We're sorry to hear that.",
                text: "Please tell us how we can improve:"
              })
              const refreshedVideoSettings = loadSetting(data.video_upload_settings, {
                header: "Share your experience!",
                text: "Record a short video testimonial to help others learn about our service."
              })
              const refreshedSuccessSettings = loadSetting(data.success_settings, {
                header: "Thank you!",
                text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience."
              })

              // Update all settings - always update, don't check if they exist
              // Force immediate re-render by using functional updates
              setHeaderSettings(() => refreshedHeaderSettings)
              setOriginalHeaderSettings(() => refreshedHeaderSettings)
              setInitialViewSettings(() => refreshedInitialSettings)
              setOriginalInitialSettings(() => refreshedInitialSettings)
              setNegativeSettings(() => refreshedNegativeSettings)
              setOriginalNegativeSettings(() => refreshedNegativeSettings)
              setVideoUploadSettings(() => refreshedVideoSettings)
              setOriginalVideoSettings(() => refreshedVideoSettings)
              setSuccessSettings(() => refreshedSuccessSettings)
              setOriginalSuccessSettings(() => refreshedSuccessSettings)

              // Update review link URL
              if (data.review_url) {
                setReviewLink(data.review_url)
              }

              // Update appearance settings
              if (data.background_color) setBackgroundColor(data.background_color)
              if (data.text_color) setTextColor(data.text_color)
              if (data.button_text_color) setButtonTextColor(data.button_text_color)
              if (data.button_style) setButtonStyle(data.button_style)
              if (data.font) setSelectedFont(data.font)
              // Note: theme_preset is stored in localStorage only

              }
        } catch (error) {
          console.error('Error:', error)
        }
      }
    }

    // Listen for tab switch events
    const handleTabSwitch = (event: CustomEvent) => {
      if (event.detail === 'review-link') {
        refetchData()
      }
    }

    window.addEventListener('tab-switched', handleTabSwitch as EventListener)

    return () => {
      window.removeEventListener('tab-switched', handleTabSwitch as EventListener)
    }
  }, [isInitialLoad])

  // Load appearance settings from localStorage (fallback only)
  useEffect(() => {
    // This useEffect will be called first, but database settings will override localStorage when data loads
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
      }
    } catch (e) {
      }
  }, [])

  // Save appearance settings to localStorage when they change (for backup)
  useEffect(() => {
    if (isInitialLoad) return // Don't save during initial load

    const appearanceSettings = {
      background_color: backgroundColor,
      text_color: textColor,
      button_text_color: buttonTextColor,
      button_style: buttonStyle,
      font: selectedFont,
      theme_preset: selectedTheme,
    }
    localStorage.setItem('loop_appearance_settings', JSON.stringify(appearanceSettings))
  }, [backgroundColor, textColor, buttonTextColor, buttonStyle, selectedFont, selectedTheme, isInitialLoad])

  // Force save button click after completion redirect - specifically for landing page
  useEffect(() => {
    // Only trigger when we're on landing tab, not saving, and haven't triggered before
    if (activeSubTab !== 'landing' || isSaving || autoSaveTriggeredRef.current) {
      return
    }

    const completionData = sessionStorage.getItem('completion_redirect')
    if (!completionData) {
      return
    }

    // If still loading, wait for data to be ready
    if (isInitialLoad) {
      return
    }

    try {
      const data = JSON.parse(completionData)
      const timeDiff = Date.now() - data.timestamp
      
      // Only trigger if redirect happened within last 10 seconds and flag is still active
      if (timeDiff < 10000 && data.triggered) {
        console.log('Triggering auto-save after onboarding completion')
        
        // Mark as triggered to prevent future runs
        autoSaveTriggeredRef.current = true
        sessionStorage.removeItem('completion_redirect')

        // Click the save button once after a short delay
        setTimeout(() => {
          if (landingPageSaveButtonRef.current && !isSaving) {
            try {
              console.log('Auto-clicking save button after completion')
              landingPageSaveButtonRef.current.click()
            } catch (error) {
              console.error('Error clicking save button:', error)
              // Fallback to calling the handler directly
              handleManualSave()
            }
          }
        }, 500)
      } else {
        // Remove stale flag - completion was too long ago
        console.log('Removing stale completion flag (too old or already processed)')
        sessionStorage.removeItem('completion_redirect')
      }
    } catch (error) {
      // Handle old format or invalid JSON
      console.log('Removing invalid completion flag')
      sessionStorage.removeItem('completion_redirect')
    }
  }, [activeSubTab, isInitialLoad, isSaving])

  // Removed redundant useEffect that was monitoring completion flag changes
  // The main useEffect above handles this properly with timestamp check

  // REMOVED: This was incorrectly overwriting the review link with platform URLs
  // The review link should always be the static URL from the database
  // useEffect(() => {
  //   const platformUrl =
  //     customizationSettings.selected_review_platform === "Google"
  //       ? customizationSettings.google_url
  //       : customizationSettings.trustpilot_url
  //   // Add Facebook URL if selected as primary
  //   if (customizationSettings.selected_review_platform === "Facebook") {
  //     setReviewLink(customizationSettings.facebook_url)
  //   } else {
  //     setReviewLink(platformUrl)
  //   }
  // }, [
  //   customizationSettings.selected_review_platform,
  //   customizationSettings.google_url,
  //   customizationSettings.trustpilot_url,
  //   customizationSettings.facebook_url,
  // ])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(reviewLink)
    toast({
      title: "Link Copied!",
      description: "The review link has been copied to your clipboard.",
    })
  }

  const handleOpenLink = () => {
    window.open(reviewLink, "_blank")
  }

  const handleShareLoop = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: customizationSettings.company_name + ' - Leave us a review',
          text: 'Please take a moment to leave ' + customizationSettings.company_name + ' a review!',
          url: reviewLink,
        })
        toast({
          title: "Shared Successfully",
          description: "Review link has been shared.",
        })
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

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const newLogoUrl = reader.result as string
        const result = await updateLogo(newLogoUrl)
        if (result.success) {
          setCustomizationSettings((prev) => ({ ...prev, company_logo_url: newLogoUrl }))
          toast({ title: "Logo Updated!", description: "Logo has been synchronized across all components." })
        } else {
          toast({
            title: "Error updating logo",
            description: "Failed to sync logo across components. Please try again.",
            variant: "destructive"
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }, [updateLogo])

  const handleDownloadQrCode = () => {
    const svgElement = document.querySelector("#qrcode svg")
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new window.Image()

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        const pngFile = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.href = pngFile
        downloadLink.download = "qrcode.png"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
        toast({
          title: "QR Code Downloaded!",
          description: "The QR code has been downloaded as a PNG image.",
        })
      }
      img.src = svgUrl
    } else {
      toast({
        title: "Error",
        description: "Could not find QR code to download.",
        variant: "destructive",
      })
    }
  }

  const handlePlatformCheckboxChange = (platform: string, checked: boolean) => {
    setCustomizationSettings((prev) => {
      const newEnabledPlatforms = checked
        ? [...prev.enabled_platforms, platform]
        : prev.enabled_platforms.filter((p) => p !== platform)
      return { ...prev, enabled_platforms: newEnabledPlatforms }
    })
  }

  const handleLinkToggle = (id: number) => {
    setLinks(prev => prev.map(link =>
      link.id === id ? { ...link, isActive: !link.isActive } : link
    ))
  }

  const handleLinkDelete = async (id: number) => {
    setLinks(prev => prev.filter(link => link.id !== id))

    // Immediately save after deletion to prevent refetch from restoring deleted links
    setTimeout(() => {
      if (isMountedRef.current) {
        handleSave()
      }
    }, 100)
  }

  const platforms = [
    { id: 'google', name: 'Google', logo: '/google-logo-new.png', placeholder: 'Your Google Business URL' },
    { id: 'shopify', name: 'Shopify', logo: '/shopify-logo.svg', placeholder: 'Your product review URL' },
    { id: 'amazon', name: 'Amazon', logo: '/amazon-logo.png', placeholder: 'Your product page' },
    { id: 'trustpilot', name: 'Trustpilot', logo: '/trustpilot.svg', placeholder: 'Your truspilot name' },
    { id: 'facebook', name: 'Facebook', logo: '/facebook-logo.png', placeholder: 'Your Facebook page URL' },
    { id: 'video-testimonial', name: 'Video Testimonial', logo: '/video-testimonial-icon.svg', placeholder: 'Upload video testimonial' },
    { id: 'booking', name: 'Booking.com', logo: '/booking-logo.svg', placeholder: 'Your property URL' },
    { id: 'airbnb', name: 'Airbnb', logo: '/airbnb-logo.png', placeholder: 'Your listing URL' },
    { id: 'tripadvisor', name: 'TripAdvisor', logo: '/tripadvisor-logo.png', placeholder: 'Your business URL' },
    { id: 'appstore', name: 'App Store', logo: '/appstore-logo.png', placeholder: 'Your Instagram username' },
    { id: 'googlestore', name: 'Google Store', logo: '/gloogletore-logo.png', placeholder: 'Your company page URL' },
  ]

  // Memoized function to restore platform logos for better performance
  const restorePlatformLogos = useCallback((links: any[]): ReviewLink[] => {
    if (!Array.isArray(links)) return []

    return links.map(link => {
      if (!link.platformLogo && link.platformId) {
        const platform = platforms.find(p => p.id === link.platformId)
        return {
          ...link,
          platformLogo: platform?.logo || null
        } as ReviewLink
      }
      return link as ReviewLink
    })
  }, [platforms])

  // Memoize formData to prevent unnecessary re-renders of MobileReviewPreviewDisplay
  const memoizedFormData = useMemo(() => ({
    companyName: customizationSettings.company_name,
    companyLogo: customizationSettings.company_logo_url,
    profilePictureUrl: customizationSettings.profile_picture_url,
    bio: customizationSettings.bio,
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
  }), [
    customizationSettings,
    links,
    headerSettings,
    initialViewSettings,
    negativeSettings,
    videoUploadSettings,
    successSettings,
    backgroundColor,
    textColor,
    buttonTextColor,
    buttonStyle,
    selectedFont,
  ])

  // Memoize setter functions to prevent recreation on every render
  const memoizedSetters = useMemo(() => ({
    setCompanyName: (name: string) => setCustomizationSettings((prev) => ({ ...prev, company_name: name })),
    setCompanyLogo: (url: string | null) => setCustomizationSettings((prev) => ({ ...prev, company_logo_url: url })),
    setRatingPageContent: (content: string) =>
      setCustomizationSettings((prev) => ({
        ...prev,
        messages: { ...prev.messages, rating_page_content: content },
      })),
    setRedirectText: (text: string) =>
      setCustomizationSettings((prev) => ({
        ...prev,
        messages: { ...prev.messages, redirect_text: text },
      })),
    setNotificationText: (text: string) =>
      setCustomizationSettings((prev) => ({
        ...prev,
        messages: { ...prev.messages, notification_text: text },
      })),
    setVideoUploadText: (text: string) =>
      setCustomizationSettings((prev) => ({
        ...prev,
        messages: { ...prev.messages, video_upload_text: text },
      })),
  }), [])

  const handleAddLink = () => {
    setShowAddLinkModal(true)
    setAddLinkStep('platform')
    setSelectedPlatform(null)
    setNewLinkTitle('')
    setNewLinkUrl('')
    setNewLinkButtonText('')
  }

  const handlePlatformSelect = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId)
    setSelectedPlatform(platformId)
    setNewLinkTitle(platform?.name || 'New Link')

    // Set default URL and button text for video testimonials
    if (platformId === 'video-testimonial') {
      setNewLinkUrl('#video-upload')
      setNewLinkButtonText('Upload Video Testimonial')
    } else {
      setNewLinkUrl('')
      setNewLinkButtonText('Submit on ' + (platform?.name?.replace(' Reviews', '') || 'Platform'))
    }
    setAddLinkStep('details')
  }

  const handleCreateLink = () => {
    if (newLinkTitle.trim() && selectedPlatform && (selectedPlatform === 'video-testimonial' || newLinkUrl.trim())) {
      const platform = platforms.find(p => p.id === selectedPlatform)
      const newLink = {
        id: Date.now(),
        title: newLinkTitle,
        url: selectedPlatform === 'video-testimonial' ? '#video-upload' : newLinkUrl,
        buttonText: newLinkButtonText || (selectedPlatform === 'video-testimonial' ? 'Upload Video Testimonial' : `Submit on ${platform?.name?.replace(' Reviews', '') || 'Platform'}`),
        clicks: 0,
        isActive: true,
        platformId: selectedPlatform,
        platformLogo: platform?.logo || null
      }
      setLinks(prev => [...prev, newLink])
      setShowAddLinkModal(false)
      setAddLinkStep('platform')
      setSelectedPlatform(null)
      setNewLinkTitle('')
      setNewLinkUrl('')
      setNewLinkButtonText('')
    }
  }

  const handleModalClose = () => {
    setShowAddLinkModal(false)
    setAddLinkStep('platform')
    setSelectedPlatform(null)
    setNewLinkTitle('')
    setNewLinkUrl('')
    setNewLinkButtonText('')
  }

  const handleLinkMoveUp = (id: number) => {
    setLinks(prev => {
      const currentIndex = prev.findIndex(link => link.id === id)
      if (currentIndex > 0) {
        const newLinks = [...prev]
        const temp = newLinks[currentIndex]
        newLinks[currentIndex] = newLinks[currentIndex - 1]
        newLinks[currentIndex - 1] = temp
        return newLinks
      }
      return prev
    })
  }

  const handleLinkMoveDown = (id: number) => {
    setLinks(prev => {
      const currentIndex = prev.findIndex(link => link.id === id)
      if (currentIndex < prev.length - 1) {
        const newLinks = [...prev]
        const temp = newLinks[currentIndex]
        newLinks[currentIndex] = newLinks[currentIndex + 1]
        newLinks[currentIndex + 1] = temp
        return newLinks
      }
      return prev
    })
  }

  const handleLinkEdit = (id: number, field: 'title' | 'url' | 'buttonText', value: string) => {
    setLinks(prev => prev.map(link =>
      link.id === id ? { ...link, [field]: value } : link
    ))
  }

  const startEditing = (id: number, field: 'title' | 'url' | 'buttonText') => {
    setEditingLink(id)
    setEditingField(field)
  }

  const stopEditing = () => {
    setEditingLink(null)
    setEditingField(null)
  }

  const handleDragStart = (e: React.DragEvent, linkId: number) => {
    setDraggedLink(linkId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()

    if (draggedLink === null) return

    const draggedIndex = links.findIndex(link => link.id === draggedLink)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedLink(null)
      setDragOverIndex(null)
      return
    }

    const newLinks = [...links]
    const draggedItem = newLinks[draggedIndex]
    newLinks.splice(draggedIndex, 1)
    newLinks.splice(targetIndex, 0, draggedItem)

    setLinks(newLinks)
    setDraggedLink(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedLink(null)
    setDragOverIndex(null)
  }

  const handleHeaderEdit = (field: 'header' | 'text', value: string) => {
    setHeaderSettings(prev => ({ ...prev, [field]: value }))
  }

  const startEditingHeader = (field: 'header' | 'text') => {
    setEditingHeaderField(field)
  }

  const stopEditingHeader = () => {
    setEditingHeaderField(null)
  }

  const handleInitialEdit = (field: 'header' | 'text', value: string) => {
    setInitialViewSettings(prev => ({ ...prev, [field]: value }))
  }

  const startEditingInitial = (field: 'header' | 'text') => {
    setEditingInitialField(field)
  }

  const stopEditingInitial = () => {
    setEditingInitialField(null)
  }

  const handleNegativeEdit = (field: 'header' | 'text', value: string) => {
    setNegativeSettings(prev => ({ ...prev, [field]: value }))
  }

  const startEditingNegative = (field: 'header' | 'text') => {
    setEditingNegativeField(field)
  }

  const stopEditingNegative = () => {
    setEditingNegativeField(null)
  }

  const handleVideoEdit = (field: 'header' | 'text', value: string) => {
    setVideoUploadSettings(prev => ({ ...prev, [field]: value }))
  }

  const startEditingVideo = (field: 'header' | 'text') => {
    setEditingVideoField(field)
  }

  const stopEditingVideo = () => {
    setEditingVideoField(null)
  }

  const handleSuccessEdit = (field: 'header' | 'text', value: string) => {
    setSuccessSettings(prev => ({ ...prev, [field]: value }))
  }

  const startEditingSuccess = (field: 'header' | 'text') => {
    setEditingSuccessField(field)
  }

  const stopEditingSuccess = () => {
    setEditingSuccessField(null)
  }

  const handleManualSave = async () => {
    setIsSaving(true)
    try {
      const dataToSave = {
        company_name: customizationSettings.company_name,
        company_logo_url: customizationSettings.company_logo_url,
        primary_color: customizationSettings.primary_color,
        secondary_color: customizationSettings.secondary_color,
        show_badge: customizationSettings.show_powered_by,
        rating_page_content: customizationSettings.messages.rating_page_content,
        redirect_message: customizationSettings.messages.redirect_text,
        internal_notification_message: customizationSettings.messages.notification_text,
        video_upload_message: customizationSettings.messages.video_upload_text,
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
        // Add other settings data
        links: links.filter(link => link.isActive),
        header_settings: headerSettings,
        initial_view_settings: initialViewSettings,
        negative_settings: negativeSettings,
        video_upload_settings: videoUploadSettings,
        success_settings: successSettings,
      }

      const response = await fetch('/api/review-link', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to save settings')
        }

        // Reset original states to current values
        setOriginalHeaderSettings(headerSettings)
        setOriginalInitialSettings(initialViewSettings)
        setOriginalNegativeSettings(negativeSettings)
        setOriginalVideoSettings(videoUploadSettings)
        setOriginalSuccessSettings(successSettings)
        setOriginalLinks(links)
        setHasUnsavedChanges(false)

        toast({
          title: "Saved!",
          description: "Your changes have been saved successfully.",
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Manual save failed:', errorData)
        console.error('❌ HTTP Status:', response.status)
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()))

        if (errorData.action) {
          throw new Error(`${errorData.error}\n\nAction required: ${errorData.action}`)
        }

        throw new Error(errorData.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Failed to save review link settings'

      toast({
        title: "Save Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const dataToSave = {
        company_name: customizationSettings.company_name,
        company_logo_url: customizationSettings.company_logo_url,
        primary_color: customizationSettings.primary_color,
        secondary_color: customizationSettings.secondary_color,
        show_badge: customizationSettings.show_powered_by,
        rating_page_content: customizationSettings.messages.rating_page_content,
        redirect_message: customizationSettings.messages.redirect_text,
        internal_notification_message: customizationSettings.messages.notification_text,
        video_upload_message: customizationSettings.messages.video_upload_text,
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
        // Add other settings data
        links: links.filter(link => link.isActive),
        header_settings: headerSettings,
        initial_view_settings: initialViewSettings,
        negative_settings: negativeSettings,
        video_upload_settings: videoUploadSettings,
        success_settings: successSettings,
      }

      const response = await fetch('/api/review-link', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      if (response.ok) {
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to save settings')
        }
        // Invalidate cache to ensure fresh data on next fetch
        invalidateCache('/api/review-link')
        invalidateCache('/api/auth/me')

        // Update original values to reflect saved state
        setOriginalHeaderSettings(headerSettings)
        setOriginalInitialSettings(initialViewSettings)
        setOriginalNegativeSettings(negativeSettings)
        setOriginalVideoSettings(videoUploadSettings)
        setOriginalSuccessSettings(successSettings)
        setOriginalLinks(links)
        // Success - no toast notification for auto-save
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Save failed:', errorData)

        if (errorData.action) {
          throw new Error(`${errorData.error}\n\nAction required: ${errorData.action}`)
        }

        throw new Error(errorData.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Failed to save review link settings'

      toast({
        title: "Save Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col p-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex border-b border-gray-200 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-t mr-2"></div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>

          {/* Right Column - Mobile Preview */}
          <div className="flex justify-center">
            <div className="w-80 h-96 bg-gray-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          {mode === 'links' && (
            <Button
              className="rounded-full bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Links
            </Button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {!hasActiveSubscription && (
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
                onTabChange('appearance')
              }
            }}
          >
            <Palette className="h-4 w-4" />
            Appearance
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-200 text-purple-700">
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
                  {reviewLink}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSubTab === "landing" && (
            <div className="flex flex-col gap-4">
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

              {/* Page Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className={`rounded-full ${activeSubTab === "landing" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("landing")}
                >
                  Landing page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "links" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("links")}
                >
                  Positive page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "negative" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("negative")}
                >
                  Negative page
                </Button>
                {hasVideoTestimonial && (
                  <Button
                    className={`rounded-full ${activeSubTab === "video" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    onClick={() => setActiveSubTab("video")}
                  >
                    Video page
                  </Button>
                )}
                <Button
                  className={`rounded-full ${activeSubTab === "success" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("success")}
                >
                  Submission page
                </Button>
              </div>

              {/* Landing Page Header Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Star className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingInitialField === 'header' ? (
                          <Input
                            value={initialViewSettings.header || ""}
                            onChange={(e) => handleInitialEdit('header', e.target.value)}
                            onBlur={stopEditingInitial}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditingInitial()
                              if (e.key === 'Escape') stopEditingInitial()
                            }}
                            className="font-medium text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-gray-900 text-sm">{initialViewSettings.header}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => startEditingInitial('header')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Landing Page Text Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                      <LayoutGrid className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {editingInitialField === 'text' ? (
                          <Textarea
                            value={initialViewSettings.text || ""}
                            onChange={(e) => handleInitialEdit('text', e.target.value)}
                            onBlur={stopEditingInitial}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey === false) {
                                e.preventDefault()
                                stopEditingInitial()
                              }
                              if (e.key === 'Escape') stopEditingInitial()
                            }}
                            className="text-sm min-h-[50px] resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm leading-relaxed">{initialViewSettings.text}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto flex-shrink-0"
                              onClick={() => startEditingInitial('text')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Landing Page */}
              <div className="flex justify-center pt-4">
                <Button
                  ref={landingPageSaveButtonRef}
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save"}
                </Button>
              </div>
            </div>
          )}
          {activeSubTab === "links" && (
            <div className="flex flex-col gap-4 pb-20">
              {/* Live Link Alert */}
              <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Your Linktree is live:{" "}
                      <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
                        {reviewLink}
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Share your Linktree to your socials</p>
                  </div>
                </div>
                <Button
      variant="outline"
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
    >
      Open URL
    </Button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className={`rounded-full ${activeSubTab === "landing" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("landing")}
                >
                  Landing page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "links" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("links")}
                >
                  Positive page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "negative" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("negative")}
                >
                  Negative page
                </Button>
                {hasVideoTestimonial && (
                  <Button
                    className={`rounded-full ${activeSubTab === "video" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    onClick={() => setActiveSubTab("video")}
                  >
                    Video page
                  </Button>
                )}
                <Button
                  className={`rounded-full ${activeSubTab === "success" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("success")}
                >
                  Submission page
                </Button>
              </div>

              {/* Positive Page Header Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Star className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingHeaderField === 'header' ? (
                          <Input
                            value={headerSettings.header || ""}
                            onChange={(e) => handleHeaderEdit('header', e.target.value)}
                            onBlur={stopEditingHeader}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditingHeader()
                              if (e.key === 'Escape') stopEditingHeader()
                            }}
                            className="font-medium text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-gray-900 text-sm">{headerSettings.header}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => startEditingHeader('header')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Positive Page Text Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                      <LayoutGrid className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {editingHeaderField === 'text' ? (
                          <Textarea
                            value={headerSettings.text || ""}
                            onChange={(e) => handleHeaderEdit('text', e.target.value)}
                            onBlur={stopEditingHeader}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey === false) {
                                e.preventDefault()
                                stopEditingHeader()
                              }
                              if (e.key === 'Escape') stopEditingHeader()
                            }}
                            className="text-sm min-h-[50px] resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm leading-relaxed">{headerSettings.text}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto flex-shrink-0"
                              onClick={() => startEditingHeader('text')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full rounded-3xl bg-violet-600 py-6 text-lg font-semibold text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
                onClick={handleAddLink}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add link
              </Button>

              {/* Add Link Modal */}
              <Dialog open={showAddLinkModal} onOpenChange={handleModalClose}>
                <DialogContent className="max-w-md mx-auto bg-white border border-gray-200 rounded-3xl shadow-xl p-8">
                  {addLinkStep === 'platform' ? (
                    <>
                      <DialogHeader className="text-center space-y-4 pb-8">
                        <DialogTitle className="text-black text-[28px] font-extrabold leading-tight tracking-[-1px]">
                          Which platform?
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 text-lg">
                          Pick a platform to add a link for.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-3 gap-4 py-4">
                        {platforms.map((platform) => (
                          <div
                            key={platform.id}
                            className="relative cursor-pointer transition-all duration-200 bg-white rounded-md border-2 border-gray-200 hover:border-black aspect-square flex flex-col items-center justify-center gap-3 p-4"
                            onClick={() => handlePlatformSelect(platform.id)}
                          >
                            <div className="h-12 w-12 rounded-[12px] flex items-center justify-center">
                              {platform.id === 'custom' ? (
                                <Globe className="h-8 w-8 text-gray-600" />
                              ) : (
                                <Image
                                  src={platform.logo}
                                  alt={platform.name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                />
                              )}
                            </div>
                            <p className="text-black text-xs w-full truncate text-center font-semibold px-1">
                              {platform.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <DialogHeader className="text-center space-y-4 pb-8">
                        <DialogTitle className="text-black text-[28px] font-extrabold leading-tight tracking-[-1px]">
                          Add your link
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 text-lg">
                          Complete the fields below to add your {platforms.find(p => p.id === selectedPlatform)?.name} link.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                            {selectedPlatform === 'custom' ? (
                              <Globe className="h-6 w-6 text-gray-600" />
                            ) : (
                              <Image
                                src={platforms.find(p => p.id === selectedPlatform)?.logo || ''}
                                alt={platforms.find(p => p.id === selectedPlatform)?.name || ''}
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            )}
                          </div>
                          <span className="font-semibold text-gray-800 text-lg">
                            {platforms.find(p => p.id === selectedPlatform)?.name}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="linkTitle" className="text-sm font-medium text-gray-700">
                              Link Title
                            </Label>
                            <Input
                              id="linkTitle"
                              value={newLinkTitle}
                              onChange={(e) => setNewLinkTitle(e.target.value)}
                              placeholder="Enter link title"
                              className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>
                          {selectedPlatform !== 'video-testimonial' ? (
                            <div className="space-y-2">
                              <Label htmlFor="linkUrl" className="text-sm font-medium text-gray-700">
                                URL
                              </Label>
                              <Input
                                id="linkUrl"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                placeholder={platforms.find(p => p.id === selectedPlatform)?.placeholder || 'Enter URL'}
                                className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">
                                Video Upload
                              </Label>
                              <div className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600">
                                Upload video testimonial
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="linkButtonText" className="text-sm font-medium text-gray-700">
                              Button Text
                            </Label>
                            <Input
                              id="linkButtonText"
                              value={newLinkButtonText}
                              onChange={(e) => setNewLinkButtonText(e.target.value)}
                              placeholder="Submit on Platform"
                              className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-6">
                          <Button
                            variant="ghost"
                            onClick={() => setAddLinkStep('platform')}
                            className="flex-1 text-gray-600 hover:text-gray-800 font-semibold"
                          >
                            Back
                          </Button>
                          <Button
                            onClick={handleCreateLink}
                            disabled={!newLinkTitle.trim() || (selectedPlatform !== 'video-testimonial' && !newLinkUrl.trim())}
                            className={`flex-1 h-12 rounded-3xl font-semibold text-lg transition-all duration-200 ${
                              newLinkTitle.trim() && (selectedPlatform === 'video-testimonial' || newLinkUrl.trim())
                                ? 'bg-[#8A2BE2] text-white hover:bg-[#7a24cc] shadow-lg'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Add Link
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {/* Link Cards */}
              <div className="mt-8 space-y-4">
                {links.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Link className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No links added yet</h3>
                        <p className="text-gray-600">Add your first platform link using the "Add link" button above.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  links.map((link, index) => (
                  <Card
                    key={link.id}
                    className={`flex items-center gap-4 rounded-lg p-4 shadow-sm dark:bg-gray-800 transition-all duration-200 ${
                      dragOverIndex === index ? 'border-violet-500 bg-violet-50' : ''
                    } ${draggedLink === link.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, link.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {editingLink === link.id && editingField === 'title' ? (
                          <Input
                            value={link.title}
                            onChange={(e) => handleLinkEdit(link.id, 'title', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditing()
                              if (e.key === 'Escape') stopEditing()
                            }}
                            className="font-semibold"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-semibold">{link.title}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => startEditing(link.id, 'title')}
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {editingLink === link.id && editingField === 'url' ? (
                          <Input
                            value={link.url}
                            onChange={(e) => handleLinkEdit(link.id, 'url', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditing()
                              if (e.key === 'Escape') stopEditing()
                            }}
                            className="text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="truncate max-w-[400px] block" title={link.url}>{link.url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto flex-shrink-0"
                              onClick={() => startEditing(link.id, 'url')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {editingLink === link.id && editingField === 'buttonText' ? (
                          <Input
                            value={link.buttonText || ''}
                            onChange={(e) => handleLinkEdit(link.id, 'buttonText', e.target.value)}
                            onBlur={stopEditing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditing()
                              if (e.key === 'Escape') stopEditing()
                            }}
                            className="text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span>Button: {link.buttonText || 'Submit on Platform'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => startEditing(link.id, 'buttonText')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-start pt-2 text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1 text-sm">
                          <BarChart className="h-3 w-3" />
                          {link.clicks} clicks
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={link.isActive}
                        onCheckedChange={() => handleLinkToggle(link.id)}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => handleLinkDelete(link.id)}
                      >
                        <Trash2 className="h-5 w-5 text-gray-400" />
                      </Button>
                    </div>
                  </Card>
                  ))
                )}
              </div>

            </div>
          )}

          {/* Save Button for Links Page - Always visible */}
          {activeSubTab === "links" && (
            <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
              <div className="flex justify-center">
                <Button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save"}
                </Button>
              </div>
            </div>
          )}
          {activeSubTab === "negative" && (
            <div className="flex flex-col gap-4">
              {/* Live Link Alert */}
              <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Negative experience flow:{" "}
                      <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
                        {reviewLink}
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This page collects feedback from unsatisfied customers</p>
                  </div>
                </div>
                <Button
      variant="outline"
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
    >
      Open URL
    </Button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className={`rounded-full ${activeSubTab === "landing" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("landing")}
                >
                  Landing page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "links" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("links")}
                >
                  Positive page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "negative" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("negative")}
                >
                  Negative page
                </Button>
                {hasVideoTestimonial && (
                  <Button
                    className={`rounded-full ${activeSubTab === "video" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    onClick={() => setActiveSubTab("video")}
                  >
                    Video page
                  </Button>
                )}
                <Button
                  className={`rounded-full ${activeSubTab === "success" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("success")}
                >
                  Submission page
                </Button>
              </div>

              {/* Negative Page Header Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingNegativeField === 'header' ? (
                          <Input
                            value={negativeSettings.header || ""}
                            onChange={(e) => handleNegativeEdit('header', e.target.value)}
                            onBlur={stopEditingNegative}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditingNegative()
                              if (e.key === 'Escape') stopEditingNegative()
                            }}
                            className="font-medium text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-gray-900 text-sm">{negativeSettings.header}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => startEditingNegative('header')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Negative Page Text Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                      <LayoutGrid className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {editingNegativeField === 'text' ? (
                          <Textarea
                            value={negativeSettings.text || ""}
                            onChange={(e) => handleNegativeEdit('text', e.target.value)}
                            onBlur={stopEditingNegative}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey === false) {
                                e.preventDefault()
                                stopEditingNegative()
                              }
                              if (e.key === 'Escape') stopEditingNegative()
                            }}
                            className="text-sm min-h-[50px] resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm leading-relaxed">{negativeSettings.text}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto flex-shrink-0"
                              onClick={() => startEditingNegative('text')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Negative Page */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save"}
                </Button>
              </div>
            </div>
          )}
          {activeSubTab === "video" && (
            <div className="flex flex-col gap-4">
              {/* Live Link Alert */}
              <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Video testimonial page:{" "}
                      <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
                        {reviewLink}
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This page allows customers to upload video testimonials</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                  onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
                >
                  Open URL
                </Button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className={`rounded-full ${activeSubTab === "landing" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("landing")}
                >
                  Landing page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "links" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("links")}
                >
                  Positive page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "negative" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("negative")}
                >
                  Negative page
                </Button>
                {hasVideoTestimonial && (
                  <Button
                    className={`rounded-full ${activeSubTab === "video" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    onClick={() => setActiveSubTab("video")}
                  >
                    Video page
                  </Button>
                )}
                <Button
                  className={`rounded-full ${activeSubTab === "success" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("success")}
                >
                  Submission page
                </Button>
              </div>

              {/* Video Page Header Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <Video className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingVideoField === 'header' ? (
                          <Input
                            value={videoUploadSettings.header || ""}
                            onChange={(e) => handleVideoEdit('header', e.target.value)}
                            onBlur={stopEditingVideo}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditingVideo()
                              if (e.key === 'Escape') stopEditingVideo()
                            }}
                            className="text-sm font-medium text-gray-900 bg-white"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm font-medium">{videoUploadSettings.header}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => startEditingVideo('header')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video Page Text Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                      <FileText className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {editingVideoField === 'text' ? (
                          <Textarea
                            value={videoUploadSettings.text || ""}
                            onChange={(e) => handleVideoEdit('text', e.target.value)}
                            onBlur={stopEditingVideo}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey === false) {
                                e.preventDefault()
                                stopEditingVideo()
                              }
                              if (e.key === 'Escape') stopEditingVideo()
                            }}
                            className="text-sm min-h-[50px] resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm leading-relaxed">{videoUploadSettings.text}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto flex-shrink-0"
                              onClick={() => startEditingVideo('text')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Video Page */}
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save"}
                </Button>
              </div>
            </div>
          )}
          {activeSubTab === "success" && (
            <div className="flex flex-col gap-4">
              {/* Live Link Alert */}
              <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Submission message page:{" "}
                      <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="underline">
                        {reviewLink}
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This message appears after customers submit feedback</p>
                  </div>
                </div>
                <Button
      variant="outline"
      className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      onClick={() => window.open(reviewLink, "_blank", "noopener,noreferrer")}
    >
      Open URL
    </Button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  className={`rounded-full ${activeSubTab === "landing" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("landing")}
                >
                  Landing page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "links" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("links")}
                >
                  Positive page
                </Button>
                <Button
                  className={`rounded-full ${activeSubTab === "negative" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("negative")}
                >
                  Negative page
                </Button>
                {hasVideoTestimonial && (
                  <Button
                    className={`rounded-full ${activeSubTab === "video" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    onClick={() => setActiveSubTab("video")}
                  >
                    Video page
                  </Button>
                )}
                <Button
                  className={`rounded-full ${activeSubTab === "success" ? "bg-black text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  onClick={() => setActiveSubTab("success")}
                >
                  Submission page
                </Button>
              </div>

              {/* Submission Page Header Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                      <CheckCircle className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingSuccessField === 'header' ? (
                          <Input
                            value={successSettings.header || ""}
                            onChange={(e) => handleSuccessEdit('header', e.target.value)}
                            onBlur={stopEditingSuccess}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') stopEditingSuccess()
                              if (e.key === 'Escape') stopEditingSuccess()
                            }}
                            className="font-medium text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="font-medium text-gray-900 text-sm">{successSettings.header}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto"
                              onClick={() => startEditingSuccess('header')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submission Page Text Section */}
              <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 rounded-lg p-3 shadow-sm border border-gray-200 bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                      <LayoutGrid className="h-3.5 w-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        {editingSuccessField === 'text' ? (
                          <Textarea
                            value={successSettings.text || ""}
                            onChange={(e) => handleSuccessEdit('text', e.target.value)}
                            onBlur={stopEditingSuccess}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey === false) {
                                e.preventDefault()
                                stopEditingSuccess()
                              }
                              if (e.key === 'Escape') stopEditingSuccess()
                            }}
                            className="text-sm min-h-[50px] resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-gray-900 text-sm leading-relaxed">{successSettings.text}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-auto flex-shrink-0"
                              onClick={() => startEditingSuccess('text')}
                            >
                              <Pencil className="h-3 w-3 text-gray-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button for Submission Page */}
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save"}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Mobile Preview */}
        <div className="lg:col-span-2 space-y-6 w-full">
          <div className="sticky top-6 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg h-fit overflow-hidden">
            <div className="relative w-[320px] h-[650px] rounded-[40px] bg-black shadow-2xl flex items-center justify-center border-[10px] border-gray-800 overflow-hidden">
              {/* iPhone Bezel */}
              <div className="absolute inset-0 rounded-[35px] border-[2px] border-gray-700 pointer-events-none"></div>
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[25px] bg-black rounded-b-xl z-10 flex items-center justify-center">
                <div className="w-10 h-1 bg-gray-700 rounded-full" />
              </div>
              {/* Screen */}
              <MobileReviewPreviewDisplay
                formData={memoizedFormData}
                initialPreviewStep={previewStep}
                onPreviewStepChange={setPreviewStep}
                setCompanyName={memoizedSetters.setCompanyName}
                setCompanyLogo={memoizedSetters.setCompanyLogo}
                setRatingPageContent={memoizedSetters.setRatingPageContent}
                setRedirectText={memoizedSetters.setRedirectText}
                setNotificationText={memoizedSetters.setNotificationText}
                setVideoUploadText={memoizedSetters.setVideoUploadText}
                showPoweredBy={shouldShowPoweredBy}
                setShowPoweredBy={(value) => setCustomizationSettings((prev) => ({ ...prev, show_powered_by: value }))}
                setTrustpilotUrl={(url) => setCustomizationSettings((prev) => ({ ...prev, trustpilot_url: url }))}
                setGoogleUrl={(url) => setCustomizationSettings((prev) => ({ ...prev, google_url: url }))}
                setFacebookUrl={(url) => setCustomizationSettings((prev) => ({ ...prev, facebook_url: url }))}
                setEnabledPlatforms={(platforms) =>
                  setCustomizationSettings((prev) => ({ ...prev, enabled_platforms: platforms }))
                }
                isPublicView={false}
              />
            </div>

            {/* Hide Loop logo button - only show for free users */}
            {!((userInfo?.subscription_type === 'pro' || userInfo?.subscription_type === 'enterprise') && userInfo?.subscription_status === 'active') && (
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
  )
}
