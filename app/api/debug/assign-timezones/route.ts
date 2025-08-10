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

// POST - Assign timezone groups to existing contacts
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🌍 Assigning timezone groups to existing contacts using direct SQL...')

    // Use direct SQL to update contacts in round-robin fashion
    const { error: updateError } = await supabaseServer.rpc('sql', {
      query: `
        UPDATE contacts 
        SET 
          timezone_group = CASE 
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 1 THEN 'T1'
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 2 THEN 'T2' 
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 3 THEN 'T3'
            ELSE 'T4'
          END,
          timezone_name = CASE 
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 1 THEN 'America/New_York'
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 2 THEN 'America/Chicago'
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 3 THEN 'Europe/London' 
            ELSE 'Asia/Singapore'
          END,
          timezone_offset = CASE 
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 1 THEN -5
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 2 THEN -6
            WHEN (row_number() OVER (ORDER BY id)) % 4 = 3 THEN 0
            ELSE 8
          END
        WHERE timezone_group IS NULL OR timezone_group = 'T1'
      `
    })

    if (updateError) {
      throw new Error(`Failed to update contacts: ${updateError.message}`)
    }

    // Get contacts count by timezone group
    const { data: distribution, error: countError } = await supabaseServer
      .from('contacts')
      .select('timezone_group')

    let timezoneStats = { T1: 0, T2: 0, T3: 0, T4: 0 }
    if (distribution) {
      timezoneStats = distribution.reduce((acc, contact) => {
        if (contact.timezone_group) {
          acc[contact.timezone_group as keyof typeof acc] = (acc[contact.timezone_group as keyof typeof acc] || 0) + 1
        }
        return acc
      }, timezoneStats)
    }

    console.log(`✅ Assigned timezone groups to contacts`)

    // Get distribution summary
    const distributionSummary = {
      'T1 (Eastern)': timezoneStats.T1,
      'T2 (Central)': timezoneStats.T2, 
      'T3 (Europe)': timezoneStats.T3,
      'T4 (Asia)': timezoneStats.T4
    }

    return NextResponse.json({
      success: true,
      message: 'Timezone groups assigned successfully',
      total_contacts: Object.values(timezoneStats).reduce((a, b) => a + b, 0),
      distribution: distributionSummary,
      timezone_info: {
        'T1': 'Eastern Time (UTC-5) - America/New_York',
        'T2': 'Central Time (UTC-6) - America/Chicago', 
        'T3': 'Europe Time (UTC+0) - Europe/London',
        'T4': 'Asia Time (UTC+8) - Asia/Singapore'
      }
    })

  } catch (error) {
    console.error('❌ Error assigning timezone groups:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to assign timezone groups',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}