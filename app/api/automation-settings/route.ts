import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const { data: settings, error } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (error) {
      console.error('Error fetching automation settings:', error)
      // Return default settings if none exist
      const defaultSettings = {
        stopOnReply: true,
        openTracking: true,
        linkTracking: false,
        textOnlyEmails: false,
        firstEmailTextOnly: true,
        dailyLimit: 1000,
        selectedAccounts: [
          "contact@leadsupbase.com",
          "contact@leadsupdirect.co",
          "contact@leadsupdirect.com",
          "contact@leadsuplab.co",
          "contact@leadsuplab.com",
          "contact@leadsupresch.co"
        ]
      }
      return NextResponse.json({ settings: defaultSettings })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in automation settings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      campaignId,
      stopOnReply,
      openTracking,
      linkTracking,
      textOnlyEmails,
      firstEmailTextOnly,
      dailyLimit,
      selectedAccounts
    } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Check if settings already exist for this campaign
    const { data: existingSettings } = await supabase
      .from('automation_settings')
      .select('id')
      .eq('campaign_id', campaignId)
      .single()

    if (existingSettings) {
      // Update existing settings
      const { data: settings, error } = await supabase
        .from('automation_settings')
        .update({
          stop_on_reply: stopOnReply,
          open_tracking: openTracking,
          link_tracking: linkTracking,
          text_only_emails: textOnlyEmails,
          first_email_text_only: firstEmailTextOnly,
          daily_limit: dailyLimit,
          selected_accounts: selectedAccounts,
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .select()
        .single()

      if (error) {
        console.error('Error updating automation settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
      }

      return NextResponse.json({ settings, message: 'Settings updated successfully' })
    } else {
      // Create new settings
      const { data: settings, error } = await supabase
        .from('automation_settings')
        .insert({
          campaign_id: campaignId,
          stop_on_reply: stopOnReply,
          open_tracking: openTracking,
          link_tracking: linkTracking,
          text_only_emails: textOnlyEmails,
          first_email_text_only: firstEmailTextOnly,
          daily_limit: dailyLimit,
          selected_accounts: selectedAccounts
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating automation settings:', error)
        return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
      }

      return NextResponse.json({ settings, message: 'Settings created successfully' })
    }
  } catch (error) {
    console.error('Error in automation settings POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}