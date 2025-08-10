import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all prospects with their campaign assignments
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, first_name, last_name, email_address, campaign_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching prospects:', error)
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
    }

    // Get all campaigns for reference
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError)
    }

    return NextResponse.json({
      prospects: prospects || [],
      campaigns: campaigns || [],
      debug_info: {
        total_prospects: prospects?.length || 0,
        prospects_with_campaign: prospects?.filter(p => p.campaign_id).length || 0,
        prospects_without_campaign: prospects?.filter(p => !p.campaign_id).length || 0
      }
    })
  } catch (error) {
    console.error('Error in debug prospects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}