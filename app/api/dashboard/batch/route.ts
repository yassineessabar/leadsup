import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

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

// GET - Batch fetch all dashboard data in one request
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'

    // Fetch all essential data in parallel
    const [
      campaignsResult,
      domainsResult,
      userResult
    ] = await Promise.all([
      // Campaigns with essential fields only
      supabaseServer
        .from("campaigns")
        .select("id, name, type, trigger_type, status, created_at, updated_at, scraping_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      
      // Domains with essential fields only  
      supabaseServer
        .from('domains')
        .select('id, domain, status, description, is_test_domain, verification_type, created_at, emails_sent, emails_delivered, emails_rejected, emails_received')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
        
      // User info for company name and subscription
      supabaseServer
        .from("users")
        .select("id, email, company, subscription_type, subscription_status")
        .eq("id", userId)
        .single()
    ])

    const campaigns = campaignsResult.data || []
    const domains = domainsResult.data || []
    const user = userResult.data

    // Format campaigns data
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      trigger: campaign.trigger_type,
      status: campaign.status,
      progress: campaign.status === "Active" ? Math.floor(Math.random() * 100) : null,
      sent: campaign.status === "Active" ? Math.floor(Math.random() * 500) : null,
      click: campaign.status === "Active" ? Math.floor(Math.random() * 50) : null,
      replied: campaign.status === "Active" ? Math.floor(Math.random() * 25) : null,
      opportunities: campaign.status === "Active" ? `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}%` : null,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      scraping_status: campaign.scraping_status
    }))

    // Format domains data
    const formattedDomains = domains.map(domain => ({
      id: domain.id,
      domain: domain.domain,
      status: domain.status,
      description: domain.description || `Domain is ${domain.status}`,
      isTestDomain: domain.is_test_domain || false,
      verification_type: domain.verification_type,
      created_at: domain.created_at,
      stats: {
        sent: domain.emails_sent || 0,
        delivered: domain.emails_delivered || 0,
        rejected: domain.emails_rejected || 0,
        received: domain.emails_received || 0
      }
    }))

    const batchData = {
      campaigns: formattedCampaigns,
      domains: formattedDomains,
      user: user ? {
        id: user.id,
        email: user.email,
        company: user.company,
        subscription_type: user.subscription_type,
        subscription_status: user.subscription_status,
        isPremium: user.subscription_type && user.subscription_type !== 'free' && user.subscription_status === 'active'
      } : null,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({ success: true, data: batchData })

  } catch (error) {
    console.error("Error in batch dashboard fetch:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}