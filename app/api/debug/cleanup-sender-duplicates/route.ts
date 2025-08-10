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

// POST - Clean up duplicate sender records
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🧹 Cleaning up duplicate sender records...')

    // Get all sender records grouped by email and campaign_id
    const { data: allSenders, error: fetchError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id,
        email,
        campaign_id,
        access_token,
        refresh_token,
        created_at,
        updated_at,
        is_active
      `)
      .order('updated_at', { ascending: false }) // Most recent first

    if (fetchError) {
      console.error('❌ Error fetching senders:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      })
    }

    // Group by email + campaign_id combination
    const groupedSenders = new Map()
    allSenders?.forEach(sender => {
      const key = `${sender.email}_${sender.campaign_id}`
      if (!groupedSenders.has(key)) {
        groupedSenders.set(key, [])
      }
      groupedSenders.get(key).push(sender)
    })

    const cleanup = {
      kept: 0,
      deleted: 0,
      errors: [] as any[]
    }

    console.log(`📊 Found ${groupedSenders.size} unique email+campaign combinations`)

    // Process each group
    for (const [key, senders] of groupedSenders) {
      if (senders.length <= 1) {
        console.log(`✅ ${key}: Only 1 record, keeping it`)
        cleanup.kept++
        continue
      }

      console.log(`🔄 ${key}: Found ${senders.length} duplicates, keeping most recent with OAuth tokens`)

      // Sort by updated_at descending (most recent first)
      senders.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      // Find the best record to keep (prioritize ones with OAuth tokens)
      let keepRecord = null
      for (const sender of senders) {
        if (sender.access_token && sender.refresh_token) {
          keepRecord = sender
          break
        }
      }

      // If no OAuth tokens found, keep the most recent
      if (!keepRecord) {
        keepRecord = senders[0]
      }

      console.log(`  ✅ Keeping: ${keepRecord.id} (${keepRecord.updated_at})`)
      cleanup.kept++

      // Delete the rest
      for (const sender of senders) {
        if (sender.id !== keepRecord.id) {
          console.log(`  🗑️ Deleting: ${sender.id} (${sender.updated_at})`)
          
          try {
            const { error: deleteError } = await supabaseServer
              .from('campaign_senders')
              .delete()
              .eq('id', sender.id)

            if (deleteError) {
              console.error(`  ❌ Failed to delete ${sender.id}:`, deleteError)
              cleanup.errors.push({
                id: sender.id,
                email: sender.email,
                error: deleteError.message
              })
            } else {
              cleanup.deleted++
            }
          } catch (error) {
            console.error(`  ❌ Error deleting ${sender.id}:`, error)
            cleanup.errors.push({
              id: sender.id,
              email: sender.email,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    }

    console.log(`🎯 Cleanup complete: ${cleanup.kept} kept, ${cleanup.deleted} deleted`)

    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed',
      summary: {
        total_unique_combinations: groupedSenders.size,
        records_kept: cleanup.kept,
        records_deleted: cleanup.deleted,
        errors: cleanup.errors.length
      },
      errors: cleanup.errors,
      next_steps: [
        '✅ Duplicate records cleaned up',
        '🔄 Each email+campaign combination now has only 1 record',
        '🎯 Prioritized records with OAuth tokens',
        '',
        'Test email sending:',
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}