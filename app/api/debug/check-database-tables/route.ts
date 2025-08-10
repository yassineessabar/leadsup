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

// POST - Check database tables and relationships
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🔍 Checking database tables and data...')

    const tables = [
      'prospects', 
      'contacts', 
      'prospect_sequence_progress', 
      'campaigns', 
      'campaign_senders',
      'campaign_sequences'
    ]

    const tableResults = {}

    for (const table of tables) {
      try {
        const { data, error, count } = await supabaseServer
          .from(table)
          .select('*', { count: 'exact' })
          .limit(2)

        const columns = data && data[0] ? Object.keys(data[0]) : []

        tableResults[table] = {
          exists: !error,
          count: count || 0,
          sample_columns: columns,
          error: error?.message,
          sample_data: data?.map(row => {
            // Only show key identifying fields to avoid too much data
            const keyFields = {}
            const importantFields = ['id', 'email', 'name', 'first_name', 'last_name', 'campaign_id', 'prospect_id', 'sender_email', 'status']
            
            importantFields.forEach(field => {
              if (field in row) {
                keyFields[field] = row[field]
              }
            })
            return keyFields
          })
        }
      } catch (tableError) {
        tableResults[table] = {
          exists: false,
          error: tableError instanceof Error ? tableError.message : 'Unknown error'
        }
      }
    }

    // Try to understand the relationships by checking progress table
    let prospectProgressAnalysis = null
    try {
      const { data: progressData, error: progressError } = await supabaseServer
        .from('prospect_sequence_progress')
        .select('*')
        .limit(5)

      if (!progressError && progressData) {
        prospectProgressAnalysis = {
          total_records: progressData.length,
          sample_columns: progressData[0] ? Object.keys(progressData[0]) : [],
          has_prospect_id: progressData[0] ? 'prospect_id' in progressData[0] : false,
          has_contact_id: progressData[0] ? 'contact_id' in progressData[0] : false,
          sample_records: progressData.slice(0, 3)
        }
      }
    } catch (progressError) {
      prospectProgressAnalysis = { error: 'Could not analyze prospect_sequence_progress' }
    }

    return NextResponse.json({
      success: true,
      database_analysis: {
        tables: tableResults,
        prospect_progress_analysis: prospectProgressAnalysis
      },
      summary: {
        existing_tables: Object.entries(tableResults).filter(([_, data]) => (data as any).exists).map(([table]) => table),
        tables_with_data: Object.entries(tableResults).filter(([_, data]) => (data as any).count > 0).map(([table, data]) => `${table} (${(data as any).count})`),
        key_findings: [
          tableResults['prospects']?.exists ? '✅ prospects table exists' : '❌ prospects table missing',
          tableResults['contacts']?.exists ? '✅ contacts table exists' : '❌ contacts table missing', 
          tableResults['prospect_sequence_progress']?.exists ? '✅ prospect_sequence_progress table exists' : '❌ prospect_sequence_progress missing',
          (tableResults['prospects']?.count || 0) + (tableResults['contacts']?.count || 0) > 0 ? '✅ Prospect/contact data found' : '⚠️ No prospect/contact data found'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Error checking database tables:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check database tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}