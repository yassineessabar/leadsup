import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

// In-memory cache for quick campaign data (valid for 30 seconds)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 seconds

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// GET - Fetch quick campaign overview data with caching
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id
    const cacheKey = `${userId}-${campaignId}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ success: true, data: cached.data, cached: true })
    }

    // Fetch only essential campaign data for quick loading
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id, name, type, trigger_type, status, created_at, updated_at, scraping_status, form_data")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Get basic counts for tabs (using count instead of full selects)
    const [
      { count: sequenceCount },
      { count: senderCount },
      { count: contactCount }
    ] = await Promise.all([
      supabaseServer
        .from("campaign_sequences")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId),
      supabaseServer
        .from("campaign_senders")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId),
      supabaseServer
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
    ])

    const quickData = {
      campaign,
      counts: {
        sequences: sequenceCount || 0,
        senders: senderCount || 0,
        contacts: contactCount || 0
      },
      // Include form data for scraping tab if available
      scrapingData: campaign.form_data ? {
        industry: campaign.form_data.industry || '',
        keywords: campaign.form_data.keywords || [],
        locations: campaign.form_data.locations || [],
        company_size: campaign.form_data.company_size || '',
        daily_contacts_limit: campaign.form_data.daily_contacts_limit || 50
      } : null
    }

    // Cache the result
    cache.set(cacheKey, { data: quickData, timestamp: Date.now() })
    
    // Clean up old cache entries (simple cleanup)
    if (cache.size > 100) {
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      cache.clear()
      entries.slice(0, 50).forEach(([key, value]) => cache.set(key, value))
    }

    return NextResponse.json({ success: true, data: quickData })

  } catch (error) {
    console.error("Error in quick campaign fetch:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}