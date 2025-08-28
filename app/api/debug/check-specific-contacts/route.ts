import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check the specific contacts that just received step 2 emails
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, email, first_name, sequence_step, last_contacted_at, updated_at')
      .in('id', [1527, 1528, 1529, 1530])
      .order('id')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Recent automation contacts check',
      contacts: contacts,
      debug_info: {
        total_found: contacts?.length || 0,
        timestamp: new Date().toISOString(),
        note: "These contacts should show sequence_step = 2 after receiving step 2 emails"
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}