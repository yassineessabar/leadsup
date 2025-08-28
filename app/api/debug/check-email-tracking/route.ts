import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get email tracking for contacts 1525 and 1526
    const { data: tracking, error } = await supabase
      .from('email_tracking')
      .select('*')
      .in('contact_id', [1525, 1526])
      .order('contact_id, sent_at')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Group by contact for easier reading
    const groupedTracking = tracking?.reduce((acc: any, record) => {
      const contactId = record.contact_id
      if (!acc[contactId]) acc[contactId] = []
      acc[contactId].push(record)
      return acc
    }, {}) || {}
    
    return NextResponse.json({
      success: true,
      message: 'Email tracking check',
      tracking_raw: tracking,
      tracking_grouped: groupedTracking,
      debug_info: {
        total_records: tracking?.length || 0,
        contacts_with_tracking: Object.keys(groupedTracking).length,
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