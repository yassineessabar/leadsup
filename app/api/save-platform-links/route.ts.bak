import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { platformLinks } = body

    // Validate input
    if (!platformLinks || typeof platformLinks !== 'object') {
      return NextResponse.json({ success: false, error: "Platform links must be an object" }, { status: 400 })
    }

    // Helper function to convert platform_links to links array format
    function convertPlatformLinksToArray(platformLinks: Record<string, string>): any[] {
      if (!platformLinks || typeof platformLinks !== 'object') {
        return []
      }

      const platformConfigs = {
        google: { name: 'Google Reviews', logo: '/google-logo-new.png' },
        facebook: { name: 'Facebook Reviews', logo: '/facebook-logo.png' },
        trustpilot: { name: 'Trustpilot Reviews', logo: '/trustpilot.svg' },
        shopify: { name: 'Shopify Reviews', logo: '/shopify-logo.svg' },
        amazon: { name: 'Amazon Reviews', logo: '/amazon-logo.png' },
        booking: { name: 'Booking.com Reviews', logo: '/booking-logo.svg' },
        airbnb: { name: 'Airbnb Reviews', logo: '/airbnb-logo.svg' },
        tripadvisor: { name: 'TripAdvisor Reviews', logo: '/tripadvisor-logo.svg' },
        yelp: { name: 'Yelp Reviews', logo: '/yelp-logo.svg' },
        instagram: { name: 'Instagram', logo: '/instagram-logo.svg' },
        linkedin: { name: 'LinkedIn', logo: '/linkedin-logo.svg' },
        'video-testimonial': { name: 'Video Testimonial', logo: '/video-testimonial-icon.svg' },
      } as const

      return Object.entries(platformLinks)
        .filter(([platformId, url]) => {
          // Only include if URL exists and is not a placeholder
          if (!url || url.trim() === '') return false

          // Special case: video testimonial with #video-upload is valid
          if (platformId === 'video-testimonial' && url === '#video-upload') {
            return true
          }

          // Filter out common placeholder URLs
          const placeholderUrls = [
            'https://example.com',
            'https://www.example.com',
            'https://your-url-here.com',
            'https://placeholder.com',
            'Your product page',
            'Your product review URL',
            'Your listing URL',
            'Your business URL'
          ]

          return !placeholderUrls.includes(url.trim())
        })
        .map(([platformId, url], index) => ({
          id: Date.now() + index, // Generate unique ID
          title: platformConfigs[platformId as keyof typeof platformConfigs]?.name || `${platformId.charAt(0).toUpperCase() + platformId.slice(1)} Reviews`,
          url: url.trim(),
          buttonText: platformId === 'video-testimonial'
            ? 'Upload Video Testimonial'
            : `Submit on ${platformConfigs[platformId as keyof typeof platformConfigs]?.name?.replace(' Reviews', '') || platformId.charAt(0).toUpperCase() + platformId.slice(1)}`,
          clicks: 0,
          isActive: true,
          platformId,
          platformLogo: platformConfigs[platformId as keyof typeof platformConfigs]?.logo || null
        }))
    }

    // Convert platform links to the links array format
    const linksArray = convertPlatformLinksToArray(platformLinks)

    // Update user record with platform links
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        platform_links: platformLinks,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()

    if (userError) {
      console.error("❌ Error saving platform links:", userError)
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
    }

    if (!userData) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Also update the review_link table with the converted links
    const { error: reviewLinkError } = await supabase
      .from("review_link")
      .update({
        links: linksArray,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)

    if (reviewLinkError) {
      console.error("❌ Error updating review_link with links:", reviewLinkError)
      // Don't fail the entire request if this update fails, just log it
    } else {
      }

    return NextResponse.json({ success: true, data: userData })
  } catch (error) {
    console.error("❌ Error in save-platform-links API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}