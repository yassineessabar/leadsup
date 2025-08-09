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

    // Try to get connected Gmail accounts for the user from campaign_senders
    console.log('Fetching Gmail accounts for user:', userId)
    
    const { data: accounts, error } = await supabaseServer
      .from('campaign_senders')
      .select('id, email, name, profile_picture, created_at, campaign_id, health_score, daily_limit, warmup_status, is_active')
      .eq('user_id', userId)
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
    
    console.log('Found Gmail accounts:', accounts?.length || 0)

    return NextResponse.json(accounts || [])
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}