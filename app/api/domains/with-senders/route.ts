import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
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
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 Optimized fetch: domains with senders for user:', userId)
    const startTime = Date.now()

    // Fetch domains and senders in parallel for better performance
    const [domainsResult, sendersResult] = await Promise.all([
      // Get all verified domains
      supabase
        .from('domains')
        .select('id, domain, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'verified')
        .order('created_at', { ascending: false }),
      
      // Get all sender accounts for this user's domains
      supabase
        .from('sender_accounts')
        .select(`
          id,
          email,
          display_name,
          is_default,
          created_at,
          domain_id,
          domains!inner(user_id, status)
        `)
        .eq('domains.user_id', userId)
        .eq('domains.status', 'verified')
    ])

    if (domainsResult.error) {
      console.error('❌ Error fetching domains:', domainsResult.error)
      throw domainsResult.error
    }

    if (sendersResult.error) {
      console.error('❌ Error fetching senders:', sendersResult.error)
      throw sendersResult.error
    }

    const domains = domainsResult.data || []
    const senders = sendersResult.data || []

    // Group senders by domain
    const sendersMap = new Map()
    senders.forEach((sender: any) => {
      if (!sendersMap.has(sender.domain_id)) {
        sendersMap.set(sender.domain_id, [])
      }
      sendersMap.get(sender.domain_id).push({
        id: sender.id,
        email: sender.email,
        display_name: sender.display_name,
        is_default: sender.is_default,
        setup_status: 'completed', // Default status
        daily_limit: 50, // Default limit
        health_score: 85, // Default health score
        emails_sent: 0, // Default sent count
        created_at: sender.created_at
      })
    })

    // Combine domains with their senders
    const domainsWithSenders = domains.map((domain: any) => ({
      ...domain,
      senders: sendersMap.get(domain.id) || []
    }))

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`✅ Optimized fetch completed in ${duration}ms`)
    console.log(`📊 Found ${domains.length} domains with ${senders.length} total senders`)

    return NextResponse.json({
      success: true,
      domains: domainsWithSenders,
      message: `Found ${domains.length} verified domains`,
      performance: {
        duration_ms: duration,
        domains_count: domains.length,
        senders_count: senders.length
      }
    })

  } catch (error: any) {
    console.error('❌ Error in optimized domains/with-senders API:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}