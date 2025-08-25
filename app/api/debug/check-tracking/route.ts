import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trackingId = searchParams.get('id') || 'track_1756113469255_pjd1j863y'
  
  const { data, error } = await supabaseServer
    .from('email_tracking')
    .select('*')
    .eq('id', trackingId)
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  
  return NextResponse.json({
    success: true,
    tracking: data,
    opened: !!data.first_opened_at || data.open_count > 0,
    clicked: !!data.first_clicked_at || data.click_count > 0
  })
}