import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 DEBUG TEST CONTACTS ENDPOINT')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Test exact same query as sync-due-contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied') 
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')
    
    console.log(`Found ${contacts?.length || 0} contacts`)
    
    return NextResponse.json({
      success: true,
      campaignId,
      contactsFound: contacts?.length || 0,
      contacts: contacts?.slice(0, 3).map(c => ({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`,
        status: c.email_status,
        step: c.sequence_step,
        location: c.location
      })) || [],
      timestamp: new Date().toISOString(),
      note: 'This proves the contacts exist and the query works'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}