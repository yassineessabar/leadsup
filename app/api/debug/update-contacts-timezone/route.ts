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

// POST - Update contacts with timezone groups via direct table update
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🌍 Updating contacts with timezone groups via direct update...')

    // Get all contacts
    const { data: contacts, error: fetchError } = await supabaseServer
      .from('contacts')
      .select('id')

    if (fetchError) {
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`)
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No contacts found',
        updated: 0
      })
    }

    console.log(`Found ${contacts.length} contacts to update`)

    // Update contacts in batches with timezone assignments
    const timezoneGroups = ['T1', 'T2', 'T3', 'T4']
    const timezoneData = {
      'T1': { name: 'America/New_York', offset: -5 },
      'T2': { name: 'America/Chicago', offset: -6 },
      'T3': { name: 'Europe/London', offset: 0 },
      'T4': { name: 'Asia/Singapore', offset: 8 }
    }

    let updateCount = 0
    const batchSize = 100

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      
      const updates = batch.map((contact, index) => {
        const globalIndex = i + index
        const timezoneGroup = timezoneGroups[globalIndex % timezoneGroups.length]
        const tzData = timezoneData[timezoneGroup as keyof typeof timezoneData]
        
        return {
          id: contact.id,
          timezone_group: timezoneGroup,
          timezone_name: tzData.name,
          timezone_offset: tzData.offset
        }
      })

      const { error: batchError } = await supabaseServer
        .from('contacts')
        .upsert(updates, { onConflict: 'id' })

      if (batchError) {
        console.error(`Error updating batch ${i}-${i + batch.length}:`, batchError)
      } else {
        updateCount += batch.length
        console.log(`✅ Updated batch ${i}-${Math.min(i + batchSize, contacts.length)}`)
      }
    }

    // Get distribution stats
    const { data: stats } = await supabaseServer
      .from('contacts')
      .select('timezone_group')

    const distribution = stats?.reduce((acc, contact) => {
      const tz = contact.timezone_group || 'unknown'
      acc[tz] = (acc[tz] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    console.log(`✅ Updated ${updateCount} contacts with timezone groups`)

    return NextResponse.json({
      success: true,
      message: 'Timezone groups assigned successfully',
      updated: updateCount,
      total_contacts: contacts.length,
      distribution: {
        'T1 (Eastern)': distribution.T1 || 0,
        'T2 (Central)': distribution.T2 || 0,
        'T3 (Europe)': distribution.T3 || 0,
        'T4 (Asia)': distribution.T4 || 0
      },
      timezone_info: {
        'T1': 'Eastern Time (UTC-5) - America/New_York',
        'T2': 'Central Time (UTC-6) - America/Chicago',
        'T3': 'Europe Time (UTC+0) - Europe/London',
        'T4': 'Asia Time (UTC+8) - Asia/Singapore'
      }
    })

  } catch (error) {
    console.error('❌ Error updating contacts with timezone groups:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update contacts with timezone groups',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}