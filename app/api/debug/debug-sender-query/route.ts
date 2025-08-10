import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Debug the exact sender query used by rotation
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const { campaign_id } = await request.json().catch(() => ({}))
    const testCampaignId = campaign_id || '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'

    console.log(`🔍 Debugging sender query for campaign: ${testCampaignId}`)

    // This is the exact query used in the getNextAvailableSender function
    const { data: senders, error, count } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type,
        rotation_priority, last_used_at, emails_sent_today, daily_limit
      `, { count: 'exact' })
      .eq('campaign_id', testCampaignId)
      .eq('is_active', true)
      .order('rotation_priority', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })

    console.log(`Query result: ${count} senders found`)
    if (error) {
      console.error('Query error:', error)
    }

    // Also try without the rotation columns that might not exist
    const { data: simpleSenders, error: simpleError, count: simpleCount } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type
      `, { count: 'exact' })
      .eq('campaign_id', testCampaignId)
      .eq('is_active', true)

    console.log(`Simple query result: ${simpleCount} senders found`)

    // Get raw table structure to see what columns exist
    const { data: allColumns, error: columnsError } = await supabaseServer
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', testCampaignId)
      .limit(1)

    const availableColumns = allColumns && allColumns[0] ? Object.keys(allColumns[0]) : []

    return NextResponse.json({
      success: true,
      campaign_id: testCampaignId,
      debug_results: {
        complex_query: {
          count: count,
          error: error?.message,
          senders: senders?.map(s => ({
            email: s.email,
            name: s.name,
            has_rotation_priority: 'rotation_priority' in s,
            rotation_priority: s.rotation_priority,
            last_used_at: s.last_used_at
          }))
        },
        simple_query: {
          count: simpleCount,
          error: simpleError?.message,
          senders: simpleSenders?.map(s => ({
            email: s.email,
            name: s.name,
            auth_type: s.auth_type,
            has_oauth: !!s.access_token,
            has_smtp: !!s.app_password
          }))
        },
        table_structure: {
          available_columns: availableColumns,
          has_rotation_priority: availableColumns.includes('rotation_priority'),
          has_last_used_at: availableColumns.includes('last_used_at'),
          has_emails_sent_today: availableColumns.includes('emails_sent_today'),
          has_daily_limit: availableColumns.includes('daily_limit')
        }
      },
      recommendations: [
        count === 0 ? 'Query with rotation columns found no senders' : `Query with rotation columns found ${count} senders`,
        simpleCount === 0 ? 'Simple query found no senders' : `Simple query found ${simpleCount} senders`,
        availableColumns.includes('rotation_priority') ? 'Rotation columns exist in table' : 'Rotation columns missing from table schema'
      ]
    })

  } catch (error) {
    console.error('❌ Error debugging sender query:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to debug sender query',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}