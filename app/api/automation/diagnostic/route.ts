import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check campaigns
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id, name, status')
      .order('created_at', { ascending: false })

    // Check contacts - use basic fields first
    const { data: contacts, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('id, campaign_id, email')
      .limit(10)

    // Check sender accounts
    const { data: senderAccounts, error: sendersError } = await supabaseServer
      .from('sender_accounts')
      .select('id, email, is_active')

    // Check campaign senders
    const { data: campaignSenders, error: campaignSendersError } = await supabaseServer
      .from('campaign_senders')
      .select('id, campaign_id, email, is_active, is_selected')

    return NextResponse.json({
      success: true,
      data: {
        campaigns: {
          data: campaigns || [],
          error: campaignsError?.message,
          total: campaigns?.length || 0,
          active: campaigns?.filter(c => c.status === 'Active').length || 0
        },
        contacts: {
          data: contacts || [],
          error: contactsError?.message,
          total: contacts?.length || 0
        },
        senderAccounts: {
          data: senderAccounts || [],
          error: sendersError?.message,
          total: senderAccounts?.length || 0,
          active: senderAccounts?.filter(s => s.is_active).length || 0
        },
        campaignSenders: {
          data: campaignSenders || [],
          error: campaignSendersError?.message,
          total: campaignSenders?.length || 0,
          selected: campaignSenders?.filter(cs => cs.is_selected && cs.is_active).length || 0
        }
      }
    })

  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}