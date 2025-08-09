"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Search, CheckCircle, ExternalLink, RefreshCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Integration } from "@/types/db"

export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [shopifyDomain, setShopifyDomain] = useState("")
  const [searchResults, setSearchResults] = useState<{ place_id: string; name: string; formatted_address: string; business_status: string; types: string[] }[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isShopifyConnecting, setIsShopifyConnecting] = useState(false)
  const [platformUrls, setPlatformUrls] = useState<{[key: string]: string}>({})

  const fetchIntegrationsData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch from real API
      const response = await fetch('/api/integrations')
      const data = await response.json()

      if (data.success) {
        // Transform database data to component format
        const dbIntegrations = data.data || []

        // Create base integrations
        const baseIntegrations: Integration[] = [
          {
            id: "google",
            name: "Google",
            description: "Connect directly with Google to enable replying to reviews.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/google-logo-new.png",
            review_count: 0,
            category: "search",
          },
          {
            id: "trustpilot",
            name: "Trustpilot",
            description: "Import reviews from your Trustpilot business profile.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/trustpilot.svg",
            review_count: 0,
            category: "review",
          },
          {
            id: "shopify",
            name: "Shopify",
            description: "Connect your Shopify store to automatically request reviews from customers.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/shopify-logo.svg",
            review_count: 0,
            category: "ecommerce",
          }
        ]

        // Check for existing connections
        const updatedIntegrations = baseIntegrations.map(integration => {
          const existingConnection = dbIntegrations.find((dbIntegration: any) =>
            dbIntegration.platform_name === integration.id
          )

          if (existingConnection) {
            return {
              ...integration,
              status: existingConnection.integration_status,
              last_sync: existingConnection.updated_at,
              google_place_id: integration.id === 'google' ? existingConnection.business_id : undefined,
              google_address: integration.id === 'google' ? existingConnection.additional_data?.formatted_address : undefined,
              // Add Shopify-specific data
              shopify_domain: integration.id === 'shopify' ? existingConnection.additional_data?.shop_domain : undefined,
              shopify_name: integration.id === 'shopify' ? existingConnection.additional_data?.shop_name : undefined,
            }
          }

          return integration
        })

        // Auto-sync Google reviews if connected
        const googleIntegration = updatedIntegrations.find(i => i.id === 'google')
        if (googleIntegration?.status === 'connected') {
          try {
            fetch('/api/google-places/reviews')
              .then(response => response.json())
              .then(reviewsData => {
                if (reviewsData.success) {
                  const reviewsCount = reviewsData.data.reviews?.length || 0
                  }
              })
              .catch(error => {
                })
          } catch (error) {
            }
        }

        setIntegrations(updatedIntegrations)
      } else {
        console.error("Failed to fetch integrations:", data.error)
        // Fallback to disconnected state
        setIntegrations([
          {
            id: "google",
            name: "Google",
            description: "Connect directly with Google to enable replying to reviews.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/google-logo-new.png",
            review_count: 0,
            category: "search",
          },
          {
            id: "trustpilot",
            name: "Trustpilot",
            description: "Import reviews from your Trustpilot business profile.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/trustpilot.svg",
            review_count: 0,
            category: "review",
          },
          {
            id: "shopify",
            name: "Shopify",
            description: "Connect your Shopify store to automatically request reviews from customers.",
            status: "disconnected",
            last_sync: null,
            user_id: "1",
            icon: "/shopify-logo.svg",
            review_count: 0,
            category: "ecommerce",
          }
        ])
      }

      // Fetch platform URLs from review-link settings
      try {
        const reviewLinkResponse = await fetch('/api/review-link')
        if (reviewLinkResponse.ok) {
          const reviewLinkResult = await reviewLinkResponse.json()
          if (reviewLinkResult.success && reviewLinkResult.data) {
            setPlatformUrls({
              google: reviewLinkResult.data.google_review_link || '',
              facebook: reviewLinkResult.data.facebook_review_link || '',
              trustpilot: reviewLinkResult.data.trustpilot_review_link || '',
              shopify: reviewLinkResult.data.shopify_store_url || ''
            })
          }
        }
      } catch (error) {
        console.error("Error fetching platform URLs:", error)
      }
    } catch (error) {
      console.error("Error fetching integrations:", error)
      // Fallback to disconnected state
      setIntegrations([
        {
          id: "google",
          name: "Google",
          description: "Connect directly with Google to enable replying to reviews.",
          status: "disconnected",
          last_sync: null,
          user_id: "1",
          icon: "/google-logo-new.png",
          review_count: 0,
          category: "search",
        },
        {
          id: "trustpilot",
          name: "Trustpilot",
          description: "Import reviews from your Trustpilot business profile.",
          status: "disconnected",
          last_sync: null,
          user_id: "1",
          icon: "/trustpilot-logo.png",
          review_count: 0,
          category: "review",
        },
        {
          id: "shopify",
          name: "Shopify",
          description: "Connect your Shopify store to automatically request reviews from customers.",
          status: "disconnected",
          last_sync: null,
          user_id: "1",
          icon: "/shopify-logo.png",
          review_count: 0,
          category: "ecommerce",
        }
      ])

      // Still try to fetch platform URLs even if integration fetch fails
      try {
        const reviewLinkResponse = await fetch('/api/review-link')
        if (reviewLinkResponse.ok) {
          const reviewLinkResult = await reviewLinkResponse.json()
          if (reviewLinkResult.success && reviewLinkResult.data) {
            setPlatformUrls({
              google: reviewLinkResult.data.google_review_link || '',
              facebook: reviewLinkResult.data.facebook_review_link || '',
              trustpilot: reviewLinkResult.data.trustpilot_review_link || '',
              shopify: reviewLinkResult.data.shopify_store_url || ''
            })
          }
        }
      } catch (urlError) {
        console.error("Error fetching platform URLs:", urlError)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearchPlaces = useCallback(async (query: string) => {
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
        // Show user-friendly error message
        toast({
          title: "Search Failed",
          description: data.error || 'Unable to search for businesses at the moment. Please try again later.',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error searching places:", error)
      setSearchResults([])
      toast({
        title: "Network Error",
        description: 'Unable to search for businesses. Please check your internet connection and try again.',
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrationsData()

    // Check for integration success/error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const integrationSuccess = urlParams.get('integration_success')
    const integrationError = urlParams.get('integration_error')

    if (integrationSuccess === 'google') {
      toast({
        title: "Success!",
        description: "Google account connected successfully. You can now access all your reviews.",
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations')
      // Refresh integrations to show connected status
      fetchIntegrationsData()
    } else if (integrationError) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google account. Please try again.",
        variant: "destructive",
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations')
    } else if (urlParams.get('shopify') === 'connected') {
      toast({
        title: "Shopify Connected",
        description: "Your Shopify store has been successfully connected!",
      })
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations')

      // Refresh integrations data to show updated status
      setTimeout(() => {
        fetchIntegrationsData()
      }, 1000) // Small delay to ensure database is updated
    }
  }, [fetchIntegrationsData])

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearchPlaces(searchQuery)
    }, 500) // 500ms debounce delay

    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearchPlaces])

  const handleCardButtonClick = (integration: Integration) => {
    // Check if Trustpilot (coming soon)
    if (integration.id === 'trustpilot') {
      toast({
        title: "Coming Soon",
        description: "Trustpilot integration is coming in a future update. Stay tuned!",
      })
      return
    }

    setSelectedIntegration(integration)
    if (integration.status === "connected") {
      setShowManageDialog(true)
    } else {
      setShowConnectDialog(true)
    }
  }

  const handleConfirmConnect = async (placeId: string, address: string) => {
    if (!selectedIntegration) return

    setLoading(true)
    try {
      // Get the selected place details for business name
      const selectedPlace = searchResults.find(place => place.place_id === placeId)
      const businessName = selectedPlace?.name || (placeId.startsWith('manual_') ? address : 'Unknown Business')

      // Save to database
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedIntegration.id,
          business_name: businessName,
          business_id: placeId,
          additional_data: selectedIntegration.id === 'google' ? {
            formatted_address: address,
            place_details: selectedPlace
          } : selectedIntegration.id === 'trustpilot' ? {
            profile_url: address
          } : selectedIntegration.id === 'shopify' ? {
            store_url: address,
            api_key: '***' // Store securely
          } : {}
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update the integration state
        const updatedIntegration = {
          ...selectedIntegration,
          status: "connected" as const,
          last_sync: new Date().toISOString(),
          google_place_id: placeId,
          google_address: address,
        }

        setIntegrations((prev) =>
          prev.map((integration) => (integration.id === updatedIntegration.id ? updatedIntegration : integration))
        )

        setShowConnectDialog(false)
        setSearchQuery("")
        setShopifyDomain("")
        setSearchResults([])

        // Automatically fetch and save reviews after successful connection (currently only Google)
        if (selectedIntegration.id === 'google') {
          try {
            const reviewsResponse = await fetch('/api/google-places/reviews')
            const reviewsData = await reviewsResponse.json()

            if (reviewsData.success) {
              const reviewsCount = reviewsData.data.reviews?.length || 0
              toast({
                title: "Integration Connected",
                description: `${selectedIntegration.name} connected successfully to ${businessName}! Imported ${reviewsCount} reviews.`
              })
              } else {
              toast({
                title: "Integration Connected",
                description: `${selectedIntegration.name} connected successfully to ${businessName}! Reviews will be imported shortly.`
              })
            }
          } catch (reviewsError) {
            toast({
              title: "Integration Connected",
              description: `${selectedIntegration.name} connected successfully to ${businessName}! Reviews will be imported shortly.`
            })
          }
        } else {
          // For other platforms, show basic success message
          toast({
            title: "Integration Connected",
            description: `${selectedIntegration.name} connected successfully to ${businessName}!`
          })
        }

      } else {
        console.error("Error connecting integration:", result.error)
        toast({
          title: "Connection Failed",
          description: "Failed to connect integration. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error connecting integration:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect integration. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShopifyConnect = async () => {
    if (!shopifyDomain.trim()) {
      return
    }

    let domain = shopifyDomain.trim()
    // Clean up the domain - remove protocol and trailing slashes
    domain = domain.replace(/^https?:\/\//, '') // Remove http:// or https://
    domain = domain.replace(/\/$/, '') // Remove trailing slash
    // Client-side validation
    if (!domain.includes('.myshopify.com')) {
      toast({
        title: "Invalid Domain",
        description: "Domain must be in format: your-store.myshopify.com",
        variant: "destructive"
      })
      return
    }

    setIsShopifyConnecting(true)
    try {
      const response = await fetch('/api/integrations/shopify/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: domain
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (result.success) {
        // Open Shopify OAuth URL in new tab
        // Try opening the OAuth URL
        window.open(result.authUrl, '_blank', 'noopener,noreferrer')

        // Show success message with debug info
        toast({
          title: "Redirected to Shopify",
          description: "Please complete the authorization in the new tab. If you don't see an auth page, check the browser console for debug URLs.",
        })
      } else {
        const title = result.setup_required ? "Setup Required" : "Connection Failed"
        toast({
          title,
          description: result.error || "Failed to initiate Shopify connection.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Shopify connect error:", error)
      toast({
        title: "Connection Failed",
        description: `Failed to connect to Shopify: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsShopifyConnecting(false)
    }
  }

  const handleDeleteClick = () => {
    setShowManageDialog(false) // Close manage dialog first
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedIntegration) return

    setLoading(true)
    try {
      // Delete from database - use the platform name
      const platformName = selectedIntegration.id.toLowerCase()
      const response = await fetch(`/api/integrations?platform=${platformName}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // Update the integration state to disconnected
        setIntegrations((prev) =>
          prev.map((integration) =>
            integration.id === selectedIntegration.id
              ? {
                  ...integration,
                  status: "disconnected",
                  google_place_id: undefined,
                  google_address: undefined,
                  shopify_domain: undefined,
                  shopify_name: undefined
                }
              : integration,
          ),
        )

        setShowDeleteConfirm(false)

        // Show detailed success message with counts
        const reviewsDeleted = result.details?.reviews_deleted || 0
        const customersDeleted = result.details?.customers_deleted || 0

        let description = `${selectedIntegration.name} disconnected successfully!`

        if (reviewsDeleted > 0) {
          description += ` Removed ${reviewsDeleted} associated reviews from database.`
        }

        if (customersDeleted > 0) {
          description += ` Removed ${customersDeleted} associated customers from database.`
        }

        toast({
          title: "Integration Disconnected",
          description
        })

        // Refresh integrations to ensure accurate state
        setTimeout(() => {
          fetchIntegrationsData()
        }, 500)

      } else {
        console.error("Error disconnecting integration:", result.error)
        toast({
          title: "Disconnection Failed",
          description: "Failed to disconnect integration. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error disconnecting integration:", error)
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect integration. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredIntegrations = integrations.filter((integration) =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const integratedCount = integrations.filter((i) => i.status === "connected").length

  const handlePlatformRedirect = (integration: Integration) => {
    let url = ""

    // Get the URL based on platform
    const platformKey = integration.id.toLowerCase()
    url = platformUrls[platformKey] || ""

    // Fallback URLs if not configured in review-link settings
    if (!url) {
      switch (platformKey) {
        case "google":
          url = "https://www.google.com/search?q=" + encodeURIComponent(integration.google_address || "reviews")
          break
        case "facebook":
          url = "https://www.facebook.com"
          break
        case "trustpilot":
          url = "https://www.trustpilot.com"
          break
        case "shopify":
          url = "https://admin.shopify.com"
          break
        default:
          url = "#"
      }
    }

    if (url && url !== "#") {
      window.open(url, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#e66465] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Integrations Header */}
      <div className="space-y-4">
      <h1 className="text-3xl font-bold text-black">Integrations</h1>
      <p className="text-gray-600 w-full leading-relaxed">
  Integrate the platforms where you currently receive or wish to receive reviews.
  Connect directly with Google and Facebook via login to enable replying to reviews from the Reviews section.
  For other platforms, simply enter your page link to import reviews. Note that we only import the most recent reviews.
</p>
      </div>

      {/* Search and Counter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="relative w-full max-w-sm">
          <Input
            type="text"
            placeholder="Search integrations..."
            className="pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-lg focus:border-[#e66465] focus:ring-[#e66465] transition-colors duration-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          Platforms Integrated:{" "}
          <span className="font-semibold bg-gradient-to-r from-[#e66465] to-[#9198e5] bg-clip-text text-transparent">
            {integratedCount}/{integrations.length}
          </span>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const isComingSoon = integration.id === 'trustpilot'

          return (
            <div
              key={integration.id}
              className={`bg-white border border-gray-100 shadow-lg transition-all duration-300 relative p-8 flex flex-col items-center justify-center gap-4 rounded-xl group ${
                isComingSoon
                  ? 'opacity-60 grayscale cursor-not-allowed'
                  : 'hover:shadow-xl'
              }`}
            >
              {integration.status === "connected" && !isComingSoon && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 left-2 p-2 hover:bg-gray-100 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlatformRedirect(integration)
                    }}
                    title={`Open ${integration.name} reviews page`}
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 hover:text-[#e66465] transition-colors duration-200" />
                  </Button>
                  <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-green-500 drop-shadow-sm" />
                </>
              )}

              {isComingSoon && (
                <div className="absolute top-3 right-3 bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Coming Soon
                </div>
              )}

              <div className="relative">
                {integration.icon && (
                  <Image
                    src={integration.icon || "/placeholder.svg"}
                    alt={`${integration.name} Logo`}
                    width={96}
                    height={96}
                    className={`object-contain transition-transform duration-200 ${
                      isComingSoon ? '' : 'group-hover:scale-105'
                    }`}
                  />
                )}
              </div>
              <h3 className={`font-semibold text-xl text-center ${
                isComingSoon ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {integration.name}
              </h3>
              <Button
                className={`w-full transition-all duration-200 ${
                  isComingSoon
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : integration.status === "connected"
                      ? "bg-gray-50 text-gray-700 hover:bg-gradient-to-r hover:from-[#e66465] hover:to-[#9198e5] hover:text-white border border-gray-200"
                      : "bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white shadow-lg hover:shadow-xl"
                }`}
                onClick={() => handleCardButtonClick(integration)}
                disabled={isComingSoon}
              >
                {isComingSoon
                  ? "Coming Soon"
                  : integration.status === "connected"
                    ? "Manage"
                    : "Connect"
                }
              </Button>
            </div>
          )
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-white rounded-xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            {selectedIntegration?.icon && (
              <div className="p-3 bg-gray-50 rounded-full mb-4">
                <Image
                  src={selectedIntegration.icon || "/placeholder.svg"}
                  alt={`${selectedIntegration.name} Logo`}
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
            )}
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#e66465] to-[#9198e5] bg-clip-text text-transparent">
              Connect {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Search for your business on {selectedIntegration?.name} to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full mt-6">
            {selectedIntegration?.id === 'google' ? (
              <Tabs defaultValue="login-access" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login-access">Login Access</TabsTrigger>
                  <TabsTrigger value="public-access">Public Access</TabsTrigger>
                </TabsList>
                <TabsContent value="login-access" className="p-4 text-center space-y-4">
                  <p className="text-gray-600">
                    Sign in with your Google account to:
                  </p>
                  <ul className="text-sm text-gray-600 mb-6 space-y-2 text-left max-w-sm mx-auto">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Access ALL your Google reviews (not just 5)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Reply to reviews directly from this platform</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Sync reviews automatically</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium flex items-center justify-center gap-3"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/integrations/google/auth?action=start')
                        const data = await response.json()
                        if (data.success && data.authUrl) {
                          window.location.href = data.authUrl
                        } else {
                          toast({
                            title: "Error",
                            description: "Failed to start Google authentication",
                            variant: "destructive",
                          })
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to connect to Google",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <Image
                      src="/google-logo-new.png"
                      alt="Google"
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                    Sign in with Google
                  </Button>
                  <p className="text-xs text-gray-500">
                    You'll be redirected to Google to authorize access to your business reviews
                  </p>
                </TabsContent>
                <TabsContent value="public-access" className="p-4 space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTitle className="text-sm font-medium text-amber-800">Limited Access</AlertTitle>
                    <AlertDescription className="text-sm text-amber-700">
                      Public access only imports the 5 most recent reviews. For full access to all reviews, use Login Access.
                    </AlertDescription>
                  </Alert>
                  <p className="text-gray-600">
                    Search for your Google My Business listing:
                  </p>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter your business location..."
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
                          onClick={() => handleConfirmConnect(result.place_id, result.formatted_address)}
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
                          const manualAddress = searchQuery
                          handleConfirmConnect(manualPlaceId, manualAddress)
                        }}
                        className="text-xs"
                      >
                        Connect Manually with "{searchQuery}"
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : selectedIntegration?.id === 'trustpilot' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Enter your Trustpilot business profile URL to import reviews.
                </p>
                <div className="relative">
                  <Input
                    type="url"
                    placeholder="https://www.trustpilot.com/review/yourcompany.com"
                    className="pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-lg focus:border-[#e66465] focus:ring-[#e66465] transition-colors duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {searchQuery && (
                  <Button
                    className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
                    onClick={() => handleConfirmConnect(`trustpilot_${Date.now()}`, searchQuery)}
                  >
                    Connect Trustpilot
                  </Button>
                )}
              </div>
            ) : selectedIntegration?.id === 'shopify' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Enter your Shopify store URL or domain to connect via secure OAuth.
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="https://your-store.myshopify.com or your-store.myshopify.com"
                      className="pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-lg focus:border-[#e66465] focus:ring-[#e66465] transition-colors duration-200"
                      value={shopifyDomain}
                      onChange={(e) => setShopifyDomain(e.target.value)}
                    />
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white"
                  onClick={() => {
                    handleShopifyConnect()
                  }}
                  disabled={isShopifyConnecting || !shopifyDomain.trim()}
                >
                  {isShopifyConnecting ? "Connecting..." : "Connect Shopify Store"}
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setShowConnectDialog(false)
              setSearchQuery("")
              setShopifyDomain("")
              setSearchResults([])
            }} className="hover:bg-gray-50 transition-colors duration-200">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center relative">

            {selectedIntegration?.icon && (
              <div className="p-3 bg-gray-50 rounded-full mb-4">
                <Image
                  src={selectedIntegration.icon || "/placeholder.svg"}
                  alt={`${selectedIntegration.name} Logo`}
                  width={96}
                  height={96}
                  className="object-contain"
                />
              </div>
            )}
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#e66465] to-[#9198e5] bg-clip-text text-transparent flex items-center gap-2">
              {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="text-center space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Connected Business</p>
                <p className="text-gray-600 text-sm">
                  {selectedIntegration?.id === 'shopify'
                    ? (selectedIntegration?.shopify_name || selectedIntegration?.shopify_domain || "Connected to Shopify")
                    : (selectedIntegration?.google_address || "Connected to Google")
                  }
                </p>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-[#e66465] to-[#9198e5] hover:from-[#d55555] hover:to-[#8088d5] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={async () => {
                  try {
                    setLoading(true)

                    if (selectedIntegration?.id === 'shopify') {
                      const reviewsResponse = await fetch('/api/integrations/shopify/reviews', {
                        method: 'POST',
                        credentials: 'include'
                      })
                      const reviewsData = await reviewsResponse.json()

                      if (reviewsData.success) {
                        const { newReviews, totalOrders, existingReviews } = reviewsData.data
                        if (newReviews > 0) {
                          toast({
                            title: "Shopify Reviews Created",
                            description: `Created ${newReviews} new reviews from ${totalOrders} Shopify orders${existingReviews > 0 ? ` (${existingReviews} already existed)` : ''}!`
                          })
                        } else {
                          toast({
                            title: "No New Reviews",
                            description: reviewsData.data.message || "All Shopify orders already have reviews.",
                          })
                        }
                      } else {
                        toast({
                          title: "Sync Failed",
                          description: reviewsData.error || "Failed to create reviews from Shopify orders. Please try again.",
                          variant: "destructive"
                        })
                      }
                    } else if (selectedIntegration?.id === 'google') {
                      const reviewsResponse = await fetch('/api/google-places/reviews')
                      const reviewsData = await reviewsResponse.json()

                      if (reviewsData.success) {
                        const reviewsCount = reviewsData.data.reviews?.length || 0
                        toast({
                          title: "Reviews Synced",
                          description: `Successfully synced ${reviewsCount} reviews from Google!`
                        })
                      } else {
                        toast({
                          title: "Sync Failed",
                          description: "Failed to sync reviews. Please try again.",
                          variant: "destructive"
                        })
                      }
                    }
                  } catch (error) {
                    console.error("Error syncing reviews:", error)
                    toast({
                      title: "Sync Failed",
                      description: "Failed to sync reviews. Please try again.",
                      variant: "destructive"
                    })
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? "Syncing..." : selectedIntegration?.id === 'shopify' ? "Create Reviews from Orders" : "Sync Reviews"}
              </Button>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row-reverse gap-2">
            <Button
              variant="destructive"
              className="w-full sm:w-auto hover:bg-red-600 transition-colors duration-200"
              onClick={handleDeleteClick}
            >
              Disconnect
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:bg-gray-50 transition-colors duration-200"
              onClick={() => setShowManageDialog(false)}
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will disconnect the {selectedIntegration?.name} integration and <strong>permanently delete all associated reviews</strong> from your database.
              You will need to re-integrate and re-sync reviews if you wish to use it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
