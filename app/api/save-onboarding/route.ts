import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { authCache } from "@/lib/auth-cache"

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
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value
    const userId = await getUserIdFromSession()

    if (!userId || !sessionToken) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('📥 Save onboarding: JSON parse error:', parseError)
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const {
      companyName,
      businessCategory,
      selectedTemplate,
      selectedPlatforms,
      platformLinks,
      companyProfile
    } = body

    // Prepare user table update data
    const userUpdateData: any = {
      updated_at: new Date().toISOString()
    }

    // Update company name from either companyName or companyProfile.displayName
    if (companyName) {
      userUpdateData.company = companyName
    } else if (companyProfile?.displayName) {
      userUpdateData.company = companyProfile.displayName
    }

    // Store business category in store_type if provided
    // Temporarily disabled due to Supabase schema cache issue
    if (businessCategory?.category) {
      // userUpdateData.store_type = businessCategory.category
    }

    // Update user record (only if we have meaningful data to update)
    let userData = null
    if (Object.keys(userUpdateData).length > 1) { // More than just updated_at
      try {
        const { data: updateResult, error: userError } = await supabase
          .from("users")
          .update(userUpdateData)
          .eq("id", userId)
          .select()
          .single()

        if (userError) {
          console.error("❌ Error updating user:", userError)
          console.error("❌ Error details:", {
            message: userError.message,
            details: userError.details,
            hint: userError.hint,
            code: userError.code
          })
          return NextResponse.json({
            success: false,
            error: userError.message,
            details: userError.details
          }, { status: 500 })
        }

        userData = updateResult
        } catch (updateError) {
        console.error("❌ Exception during user update:", updateError)
        return NextResponse.json({
          success: false,
          error: "Failed to update user data"
        }, { status: 500 })
      }
    } else {
      // Get existing user data if no updates needed
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single()

        if (fetchError) {
          console.error("❌ Error fetching user:", fetchError)
          return NextResponse.json({
            success: false,
            error: "Failed to fetch user data"
          }, { status: 500 })
        }

        userData = existingUser
      } catch (fetchError) {
        console.error("❌ Exception during user fetch:", fetchError)
        return NextResponse.json({
          success: false,
          error: "Failed to fetch user data"
        }, { status: 500 })
      }
    }

    // Save business category to customization_settings if provided
    if (businessCategory?.category) {
      try {
        const { data: existingSettings, error: settingsCheckError } = await supabase
          .from("customization_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()

        const categoryData = {
          user_id: userId,
          welcome_message_title: businessCategory.category,
          welcome_message_body: businessCategory.description || null,
          updated_at: new Date().toISOString()
        }

        if (existingSettings) {
          // Update existing settings
          const { error: updateError } = await supabase
            .from("customization_settings")
            .update(categoryData)
            .eq("id", existingSettings.id)

          if (updateError) {
            console.error("❌ Error updating business category in customization_settings:", updateError)
          } else {
            }
        } else {
          // Create new settings record
          const { error: insertError } = await supabase
            .from("customization_settings")
            .insert({
              ...categoryData,
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error("❌ Error creating business category in customization_settings:", insertError)
          } else {
            }
        }
      } catch (categoryError) {
        console.error("❌ Error handling business category:", categoryError)
        // Don't fail the entire request
      }
    }

    // Create or update review_link if we have platform data
    if (selectedPlatforms && selectedPlatforms.length > 0) {
      try {
        // Check if review_link already exists
        const { data: existingReviewLink, error: checkError } = await supabase
          .from("review_link")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
          console.error("❌ Error checking existing review_link:", checkError)
        }

        // Helper function to convert platform_links to links array format (same as save-platform-links)
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

        // Convert platform links to the links array format if provided
        // Create default links for all selected platforms if no explicit platformLinks provided
        let linksArray = []
        if (platformLinks) {
          linksArray = convertPlatformLinksToArray(platformLinks)
        } else if (selectedPlatforms && selectedPlatforms.length > 0) {
          // Create default links for all selected platforms
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

          linksArray = selectedPlatforms
            .filter(platformId => {
              // Only create links for platforms that have immediate functionality (like video testimonial)
              // Other platforms will be handled by the enabled_platforms logic in the mobile preview
              return platformId === 'video-testimonial'
            })
            .map((platformId, index) => {
              return {
                id: Date.now() + index,
                title: 'Video Testimonial',
                url: '#video-upload',
                buttonText: 'Upload Video Testimonial',
                clicks: 0,
                isActive: true,
                platformId: 'video-testimonial',
                platformLogo: '/video-testimonial-icon.svg'
              }
            })
        }

        const companyName = userUpdateData.company || userData.company
        const reviewLinkData = {
          user_id: userId,
          company_name: companyName || 'My Company',
          review_url: `https://app.loopreview.io/${companyName?.toLowerCase().replace(/\s+/g, '') || 'company'}`,
          enabled_platforms: selectedPlatforms,
          links: linksArray.length > 0 ? linksArray : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (existingReviewLink) {
          // Update existing review_link
          const updateData: any = {
            company_name: reviewLinkData.company_name,
            enabled_platforms: reviewLinkData.enabled_platforms,
            updated_at: reviewLinkData.updated_at
          }

          // Only update links if we have new ones
          if (linksArray.length > 0) {
            updateData.links = linksArray
          }

          const { data: reviewLinkUpdateData, error: reviewLinkUpdateError } = await supabase
            .from("review_link")
            .update(updateData)
            .eq("id", existingReviewLink.id)
            .select()
            .single()

          if (reviewLinkUpdateError) {
            console.error("❌ Error updating review_link:", reviewLinkUpdateError)
          } else {
            }
        } else {
          // Create new review_link
          const { data: reviewLinkCreateData, error: reviewLinkCreateError } = await supabase
            .from("review_link")
            .insert(reviewLinkData)
            .select()
            .single()

          if (reviewLinkCreateError) {
            console.error("❌ Error creating review_link:", reviewLinkCreateError)
          } else {
            }
        }
      } catch (reviewLinkError) {
        console.error("❌ Error handling review_link:", reviewLinkError)
        // Don't fail the entire request if review_link fails
      }
    }

    // Clear auth cache to ensure fresh data on next request
    const cacheKey = `auth:${sessionToken}`
    authCache.delete(cacheKey)

    return NextResponse.json({ success: true, data: userData })
  } catch (error) {
    console.error("❌ Unexpected error in save-onboarding API:", error)
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}