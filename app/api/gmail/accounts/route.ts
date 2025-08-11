import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'

export async function GET(request: NextRequest) {
  try {
    // Get current user ID from session
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Get campaign ID from query parameters
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Try to get connected Gmail accounts for the specific campaign
    console.log(`Fetching Gmail accounts for user: ${userId}, campaign: ${campaignId}`)
    
    const { data: accounts, error } = await supabaseServer
      .from('campaign_senders')
      .select('id, email, name, profile_picture, created_at, campaign_id, health_score, daily_limit, warmup_status, is_active')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .eq('sender_type', 'email')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Gmail accounts from campaign_senders' },
        { status: 500 }
      )
    }
    
    console.log(`Found Gmail accounts for campaign ${campaignId}:`, accounts?.length || 0)

    return NextResponse.json(accounts || [])
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}