import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// GET - Retrieve campaign settings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const campaignId = params.id

    // First verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campaign not found' 
      }, { status: 404 })
    }

    // Fetch settings from campaign_settings table
    const { data: settings, error: settingsError } = await supabaseServer
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (settingsError) {
      console.error('Error fetching campaign settings:', settingsError)
      return NextResponse.json({
        success: true,
        settings: {} // Return empty settings if none found
      })
    }

    return NextResponse.json({
      success: true,
      settings: settings || {}
    })

  } catch (error) {
    console.error('Error fetching campaign settings:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST - Update campaign settings
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const campaignId = params.id
    const body = await request.json()

    // Get existing campaign settings
    const { data: campaign, error: fetchError } = await supabaseServer
      .from('campaigns')
      .select('settings')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ 
        success: false, 
        error: 'Campaign not found' 
      }, { status: 404 })
    }

    // Merge new settings with existing ones
    const currentSettings = campaign.settings || {}
    const updatedSettings = {
      ...currentSettings,
      ...body
    }

    // Update campaign settings
    const { error: updateError } = await supabaseServer
      .from('campaigns')
      .update({ settings: updatedSettings })
      .eq('id', campaignId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating campaign settings:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update settings' 
      }, { status: 500 })
    }

    console.log(`✅ Updated settings for campaign ${campaignId}:`, updatedSettings)

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Campaign settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating campaign settings:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}