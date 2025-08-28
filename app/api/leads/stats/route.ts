import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Define what constitutes a "new lead" - contacts added in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    try {
      // Get new leads count from contacts table
      const { count: newLeadsCount, error: leadsError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)

      if (leadsError) {
        console.error('Error fetching new leads count:', leadsError)
        return NextResponse.json({
          success: true,
          data: {
            newLeadsCount: 0,
            message: 'Could not fetch leads data'
          }
        })
      }

      // Get total leads count
      const { count: totalLeadsCount, error: totalError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (totalError) {
        console.error('Error fetching total leads count:', totalError)
      }

      // Get recent leads for additional context (optional)
      const { data: recentLeads, error: recentError } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, created_at')
        .eq('user_id', userId)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentError) {
        console.error('Error fetching recent leads:', recentError)
      }

      return NextResponse.json({
        success: true,
        data: {
          newLeadsCount: newLeadsCount || 0,
          totalLeadsCount: totalLeadsCount || 0,
          recentLeads: recentLeads || [],
          timeframe: '24 hours',
          lastUpdated: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Database query error:', error)
      
      // Return demo data for development/testing
      return NextResponse.json({
        success: true,
        data: {
          newLeadsCount: 0,
          totalLeadsCount: 0,
          recentLeads: [],
          timeframe: '24 hours',
          lastUpdated: new Date().toISOString(),
          message: 'Using demo data - contacts table not available'
        }
      })
    }

  } catch (error) {
    console.error('Error in leads stats API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}