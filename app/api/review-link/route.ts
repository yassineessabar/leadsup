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
  } as const

  return Object.entries(platformLinks)
    .filter(([_, url]) => {
      // Only include if URL exists and is not a placeholder
      if (!url || url.trim() === '') return false

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
      buttonText: `Submit on ${platformConfigs[platformId as keyof typeof platformConfigs]?.name?.replace(' Reviews', '') || platformId.charAt(0).toUpperCase() + platformId.slice(1)}`,
      clicks: 0,
      isActive: true,
      platformId,
      platformLogo: platformConfigs[platformId as keyof typeof platformConfigs]?.logo || null
    }))
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Fetch both review_link data and user platform_links
    const [reviewLinkResult, userResult] = await Promise.all([
      supabase
        .from("review_link")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("users")
        .select("platform_links")
        .eq("id", userId)
        .single()
    ])

    const { data: reviewLink, error: reviewLinkError } = reviewLinkResult
    const { data: user, error: userError } = userResult

    if (reviewLinkError && reviewLinkError.code !== 'PGRST116') {
      console.error("❌ Error fetching review link:", reviewLinkError)
      return NextResponse.json({ success: false, error: reviewLinkError.message }, { status: 500 })
    }

    if (!reviewLink) {
      // Create a default review link for the user
      try {
        // Get user info for company name and selected platforms
        const { data: user } = await supabase
          .from("users")
          .select("company, selected_platforms")
          .eq("id", userId)
          .single()

        // Generate unique URL and QR code
        const generateRandomId = () => Math.random().toString(36).substring(2, 10)
        let newUrl, newQr

        try {
          const urlResult = await supabase.rpc('generate_unique_review_url')
          const qrResult = await supabase.rpc('generate_unique_qr_code')
          newUrl = urlResult.data
          newQr = qrResult.data

          // If the functions returned null/undefined, use fallback
          if (!newUrl || !newQr) {
            throw new Error("Functions returned null values")
          }
        } catch (funcError) {
          // Fallback: generate simple unique identifiers
          const randomId1 = generateRandomId()
          const randomId2 = generateRandomId()
          const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://app.loopreview.io'
          newUrl = `${baseUrl}/r/${randomId1}`
          newQr = randomId2.toUpperCase()
        }

        // Ensure we have valid values
        if (!newUrl) {
          const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://app.loopreview.io'
          newUrl = `${baseUrl}/r/${generateRandomId()}`
        }
        if (!newQr) {
          newQr = generateRandomId().toUpperCase()
        }

        // Determine enabled platforms based on user's selected platforms
        const enabledPlatforms = user?.selected_platforms && user.selected_platforms.length > 0
          ? user.selected_platforms
          : ["Google", "Trustpilot"] // Default fallback

        const { data: newLink, error: createError } = await supabase
          .from("review_link")
          .insert({
            user_id: userId,
            company_name: user?.company || "Your Company",
            review_url: newUrl,
            review_qr_code: newQr,
            enabled_platforms: enabledPlatforms,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating default review link:", createError)
          return NextResponse.json({ success: false, error: "Failed to create review link" }, { status: 500 })
        }

        // Use the newly created link
        reviewLink = newLink
        } catch (error) {
        console.error("Error creating default review link:", error)
        return NextResponse.json({ success: false, error: "Failed to create review link" }, { status: 500 })
      }
    }

    // Check if we need to update enabled_platforms based on user's selected_platforms
    if (!reviewLink.enabled_platforms || reviewLink.enabled_platforms.length === 0) {
      // Get user's selected platforms
      const { data: userPlatforms } = await supabase
        .from("users")
        .select("selected_platforms")
        .eq("id", userId)
        .single()

      if (userPlatforms?.selected_platforms && userPlatforms.selected_platforms.length > 0) {
        // Update the review link with enabled platforms
        const { error: updateError } = await supabase
          .from("review_link")
          .update({
            enabled_platforms: userPlatforms.selected_platforms
          })
          .eq("user_id", userId)

        if (!updateError) {
          reviewLink.enabled_platforms = userPlatforms.selected_platforms
          }
      }
    }

    // Use existing links from review_link table directly if they exist
    // Only fall back to platform_links conversion if no links have been explicitly configured
    const existingLinks = reviewLink.links || []

    let finalLinks = existingLinks

    // Only merge platform_links if user hasn't explicitly configured links yet
    if (existingLinks.length === 0 && user?.platform_links) {
      const convertedLinks = convertPlatformLinksToArray(user.platform_links)
      finalLinks = convertedLinks
    }

    // Filter out any links with invalid/placeholder URLs from the final result
    const uniqueLinks = finalLinks.filter(link => {
      if (!link.url || link.url.trim() === '') return false

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

      return !placeholderUrls.includes(link.url.trim())
    })

    const responseData = {
      ...reviewLink,
      links: uniqueLinks
    }

    // Add cache headers for better performance
    return NextResponse.json(
      { success: true, data: responseData },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'ETag': `"${Date.now()}"`,
        }
      }
    )
  } catch (error) {
    console.error("Error in GET /api/review-link:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const updates = await request.json()

    // Remove fields that shouldn't be updated by users
    const { id, user_id, review_url, review_qr_code, created_at, updated_at, ...allowedUpdates } = updates

    // First try to update existing record
    const { data, error } = await supabase
      .from("review_link")
      .update(allowedUpdates)
      .eq("user_id", userId)
      .select()
      .single()

    if (error && error.code === 'PGRST116') {
      // Record doesn't exist, create one

      // Get user info for company name
      const { data: user } = await supabase
        .from("users")
        .select("company")
        .eq("id", userId)
        .single()

      // Generate unique URL and QR code
      const generateRandomId = () => Math.random().toString(36).substring(2, 10)
      let newUrl, newQr

      try {
        const urlResult = await supabase.rpc('generate_unique_review_url')
        const qrResult = await supabase.rpc('generate_unique_qr_code')
        newUrl = urlResult.data
        newQr = qrResult.data

        // If the functions returned null/undefined, use fallback
        if (!newUrl || !newQr) {
          throw new Error("Functions returned null values")
        }
      } catch (funcError) {
        // Fallback: generate simple unique identifiers
        const randomId1 = generateRandomId()
        const randomId2 = generateRandomId()
        const baseUrl = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://app.loopreview.io'
        newUrl = `${baseUrl}/r/${randomId1}`
        newQr = randomId2.toUpperCase()
      }

      // Ensure we have valid values
      if (!newUrl) {
        const baseUrl = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://app.loopreview.io'
        newUrl = `${baseUrl}/r/${generateRandomId()}`
      }
      if (!newQr) {
        newQr = generateRandomId().toUpperCase()
      }

      const { data: newLink, error: createError } = await supabase
        .from("review_link")
        .insert({
          user_id: userId,
          company_name: user?.company || "Your Company",
          review_url: newUrl,
          review_qr_code: newQr,
          ...allowedUpdates
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating review link:", createError)
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
      }

      // Invalidate public review cache for newly created link
      if (newLink && newLink.review_url) {
        try {
          const reviewId = newLink.review_url.split('/r/')[1]
          if (reviewId) {
            const { invalidateReviewCache } = await import('@/app/api/public/review/[id]/route')
            invalidateReviewCache(reviewId)
          }
        } catch (error) {
          }
      }

      return NextResponse.json({ success: true, data: newLink })
    }

    if (error) {
      console.error("Error updating review link:", error)

      // Check if it's a column doesn't exist error
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: "Database migration required - some columns don't exist yet",
          details: error.message,
          action: "Run the database migration SQL in Supabase dashboard"
        }, { status: 500 })
      }

      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Review link not found or not authorized" },
        { status: 404 },
      )
    }

    // Invalidate public review cache if review_url exists
    if (data.review_url) {
      try {
        // Extract review ID from URL like "https://domain.com/r/abc123"
        const reviewId = data.review_url.split('/r/')[1]
        if (reviewId) {
          // Dynamic import to avoid circular dependency
          const { invalidateReviewCache } = await import('@/app/api/public/review/[id]/route')
          invalidateReviewCache(reviewId)
        }
      } catch (error) {
        }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-link:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Regenerate review URL (useful if user wants a new URL)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { action } = await request.json()

    if (action !== "regenerate_url") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Call the generate function and update the review_url
    const { data, error } = await supabase.rpc('generate_unique_review_url')

    if (error) {
      console.error("Error generating new URL:", error)
      return NextResponse.json({ success: false, error: "Failed to generate new URL" }, { status: 500 })
    }

    const newUrl = data

    const { data: updatedLink, error: updateError } = await supabase
      .from("review_link")
      .update({ review_url: newUrl })
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating review URL:", updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // Invalidate cache for both old and new URLs
    if (updatedLink?.review_url) {
      try {
        const reviewId = updatedLink.review_url.split('/r/')[1]
        if (reviewId) {
          const { invalidateReviewCache } = await import('@/app/api/public/review/[id]/route')
          invalidateReviewCache(reviewId)
          // Also clear all cache since URL changed
          invalidateReviewCache()
        }
      } catch (error) {
        }
    }

    return NextResponse.json({ success: true, data: updatedLink })
  } catch (error) {
    console.error("Error in POST /api/review-link:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}