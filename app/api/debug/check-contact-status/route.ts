import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get contact status and their sequence progress
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, email, first_name, campaign_id, created_at, updated_at')
      .in('id', [1525, 1526])
      .order('id')
      
    // Get progression records for these contacts  
    const { data: progressions, error: progError } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .in('prospect_id', ['1525', '1526'])
      .order('prospect_id')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Contact status and progression check',
      contacts: contacts,
      progressions: progressions,
      debug_info: {
        total_contacts: contacts?.length || 0,
        total_progressions: progressions?.length || 0,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}