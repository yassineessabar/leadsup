import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // 1. Check active campaigns
    const { data: campaigns, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        settings:campaign_settings(*)
      `)
      .eq('status', 'Active')
      .limit(5)
    
    console.log('🔍 Active campaigns:', campaigns?.length, campaignError?.message)
    
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        issue: 'No active campaigns found',
        campaigns: campaigns,
        error: campaignError
      })
    }
    
    const campaign = campaigns[0]
    console.log('🔍 First campaign:', campaign.id, campaign.name)
    
    // 2. Check contacts for first campaign
    const { data: contacts, error: contactError } = await supabaseServer
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaign.id)
      .limit(10)
    
    console.log('🔍 Contacts found:', contacts?.length, contactError?.message)
    
    // 3. Check sequences for first campaign
    const { data: sequences, error: sequenceError } = await supabaseServer
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('step_number', { ascending: true })
    
    console.log('🔍 Sequences found:', sequences?.length, sequenceError?.message)
    
    // 4. Check senders for first campaign  
    const { data: senders, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      
    // Also check senders without filters
    const { data: allSenders, error: allSenderError } = await supabaseServer
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
    
    console.log('🔍 Healthy senders found:', senders?.length, senderError?.message)
    
    return NextResponse.json({
      success: true,
      debug: {
        campaigns: {
          count: campaigns?.length || 0,
          first: campaign ? {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status
          } : null,
          error: campaignError?.message
        },
        contacts: {
          count: contacts?.length || 0,
          sample: contacts?.slice(0, 3).map(c => ({
            id: c.id,
            email: c.email,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim()
          })),
          error: contactError?.message
        },
        sequences: {
          count: sequences?.length || 0,
          steps: sequences?.map(s => ({
            step: s.step_number,
            subject: s.subject
          })),
          error: sequenceError?.message
        },
        senders: {
          count: senders?.length || 0,
          filtered: senders?.map(s => ({
            email: s.email,
            is_selected: s.is_selected,
            is_active: s.is_active
          })),
          all: allSenders?.map(s => ({
            email: s.email,
            is_selected: s.is_selected,
            is_active: s.is_active
          })),
          error: senderError?.message
        }
      }
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}