import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // This endpoint is deprecated - Gmail accounts are now stored in campaign_senders table
  return NextResponse.json({ 
    success: false, 
    message: 'Gmail setup endpoint is deprecated. Gmail accounts are now stored in campaign_senders table.',
    info: 'Please use the campaign-specific Gmail connection flow instead.'
  }, { status: 410 }) // 410 Gone - indicates the resource is no longer available
}