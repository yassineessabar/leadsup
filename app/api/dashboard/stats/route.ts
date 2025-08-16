import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'

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
  } catch (err) {
    return null
  }
}

export async function GET() {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // Fetch total leads (from contacts table - last 30 days)
    const { count: totalLeads } = await supabaseServer
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgoISO)

    // Fetch all-time total leads for comparison (to calculate growth)
    const { count: allTimeLeads } = await supabaseServer
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Fetch valid leads (contacts with valid email status - not Unknown/empty/null)
    const { count: validLeads } = await supabaseServer
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('email_status', 'in', '("Unknown","",null)')

    // Fetch active campaigns (status = 'Active')
    const { count: activeCampaigns } = await supabaseServer
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'Active')

    // Calculate verification rate (percentage of valid leads)
    const verificationRate = allTimeLeads > 0 ? ((validLeads / allTimeLeads) * 100).toFixed(1) : '0'

    // Calculate growth rate (simplified - would need historical data for accurate calculation)
    const growthRate = '+12.5%' // Placeholder - would need historical comparison

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: totalLeads || 0,
        validLeads: validLeads || 0,
        activeCampaigns: activeCampaigns || 0,
        verificationRate: `${verificationRate}%`,
        growthRate: growthRate,
        period: 'Last 30 days',
        allTimeLeads: allTimeLeads || 0
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch dashboard stats' 
    }, { status: 500 })
  }
}