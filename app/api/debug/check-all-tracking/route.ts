import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Check email_tracking table
  const { data: tracking, error: trackingError } = await supabaseServer
    .from('email_tracking')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(10)
  
  // Check email_tracking_old table if it exists
  const { data: trackingOld, error: oldError } = await supabaseServer
    .from('email_tracking_old')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(10)
  
  return NextResponse.json({
    success: true,
    email_tracking: {
      count: tracking?.length || 0,
      records: tracking || [],
      error: trackingError?.message
    },
    email_tracking_old: {
      count: trackingOld?.length || 0,
      records: trackingOld || [],
      error: oldError?.message
    },
    summary: {
      hasTrackingRecords: (tracking?.length || 0) > 0,
      hasOldRecords: (trackingOld?.length || 0) > 0,
      totalRecords: (tracking?.length || 0) + (trackingOld?.length || 0)
    }
  })
}