import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Force testing warmup with detailed debugging...')
    
    // Get all campaigns regardless of status  
    const { data: allCampaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id, name, status, settings, user_id')
    
    console.log(`📊 Total campaigns in database: ${allCampaigns?.length || 0}`)
    allCampaigns?.forEach(c => {
      const settings = c.settings as any || {}
      console.log(`📋 ${c.name} (${c.status}): auto_warmup = ${settings.auto_warmup}`)
    })
    
    // Filter active campaigns
    const activeCampaigns = allCampaigns?.filter(c => ['Active', 'Warming'].includes(c.status)) || []
    console.log(`📊 Active campaigns: ${activeCampaigns.length}`)
    
    for (const campaign of activeCampaigns) {
      console.log(`\n🔍 Processing campaign: ${campaign.name}`)
      
      // Get ALL senders for this campaign, not just selected ones
      const { data: allSenders, error: allSendersError } = await supabaseServer
        .from('campaign_senders')
        .select('email, health_score, daily_limit, warmup_status, is_selected, last_warmup_sent, warmup_emails_sent_today')
        .eq('campaign_id', campaign.id)
      
      console.log(`👥 Total senders: ${allSenders?.length || 0}`)
      allSenders?.forEach(s => {
        console.log(`   📧 ${s.email}: health=${s.health_score}%, selected=${s.is_selected}, warmup_status=${s.warmup_status}, sent_today=${s.warmup_emails_sent_today}, last_sent=${s.last_warmup_sent}`)
      })
      
      // Get only selected senders
      const selectedSenders = allSenders?.filter(s => s.is_selected) || []
      console.log(`👥 Selected senders: ${selectedSenders.length}`)
      
      if (selectedSenders.length === 0) {
        console.log(`⚠️ No selected senders for campaign ${campaign.name}`)
        continue
      }
      
      // Check if any would be processed for warmup
      for (const sender of selectedSenders) {
        const healthScore = sender.health_score || 50
        
        if (healthScore >= 90) {
          console.log(`⏭️ Would skip ${sender.email} - health score ${healthScore}% already good`)
        } else {
          console.log(`✅ Would process ${sender.email} - health score ${healthScore}% needs warmup`)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      totalCampaigns: allCampaigns?.length || 0,
      activeCampaigns: activeCampaigns.length,
      details: activeCampaigns.map(c => ({
        name: c.name,
        status: c.status,
        auto_warmup: (c.settings as any)?.auto_warmup || false
      }))
    })
    
  } catch (error) {
    console.error('❌ Force warmup test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Force warmup test failed',  
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}