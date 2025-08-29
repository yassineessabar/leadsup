import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Checking campaign settings for auto warmup...')
    
    // Get campaigns with their settings
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id, name, status, settings, user_id')
      .in('status', ['Active', 'Warming'])
    
    console.log(`📊 Found ${campaigns?.length || 0} active campaigns`)
    
    // Check each campaign's auto_warmup setting
    const campaignDetails = campaigns?.map(campaign => {
      const settings = campaign.settings as any || {}
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        user_id: campaign.user_id,
        auto_warmup: settings.auto_warmup || false,
        settings: settings
      }
    }) || []
    
    campaignDetails.forEach(c => {
      console.log(`📋 ${c.name} (${c.status}): auto_warmup = ${c.auto_warmup}`)
    })
    
    // Get senders for campaigns without auto_warmup
    const campaignsWithoutWarmup = campaignDetails.filter(c => !c.auto_warmup)
    
    if (campaignsWithoutWarmup.length > 0) {
      console.log(`⚠️ Found ${campaignsWithoutWarmup.length} campaigns without auto_warmup enabled`)
      
      // Get senders for these campaigns
      for (const campaign of campaignsWithoutWarmup) {
        const { data: senders } = await supabaseServer
          .from('campaign_senders')
          .select('email, health_score, is_selected')
          .eq('campaign_id', campaign.id)
          .eq('is_selected', true)
        
        console.log(`👥 ${campaign.name}: ${senders?.length || 0} selected senders`)
        senders?.forEach(s => {
          console.log(`   📧 ${s.email}: ${s.health_score}% health`)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      campaigns: campaignDetails,
      totalCampaigns: campaignDetails.length,
      campaignsWithAutoWarmup: campaignDetails.filter(c => c.auto_warmup).length,
      campaignsWithoutAutoWarmup: campaignsWithoutWarmup.length,
      suggestion: campaignsWithoutWarmup.length > 0 ? 
        `Enable auto_warmup in settings for: ${campaignsWithoutWarmup.map(c => c.name).join(', ')}` :
        'All campaigns have auto_warmup enabled'
    })
    
  } catch (error) {
    console.error('❌ Campaign settings check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Campaign settings check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}