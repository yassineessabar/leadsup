import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const userId = '37a70a5f-1f9a-4d2e-a76f-f303a85bc535'
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]
    
    console.log('🔍 Debug dashboard metrics for:', userId)
    
    // Get campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', userId)
    
    console.log('📊 Campaigns:', campaigns?.length || 0)
    
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        debug: 'No campaigns found',
        userId,
        campaigns: 0
      })
    }
    
    // Test getCampaignEmailTrackingMetrics for first campaign
    const { getCampaignEmailTrackingMetrics } = await import('@/lib/campaign-email-tracking-analytics')
    const metrics = await getCampaignEmailTrackingMetrics(campaigns[0].id, startDate, endDate)
    
    return NextResponse.json({
      debug: 'Dashboard metrics test',
      userId,
      campaigns: campaigns.length,
      campaignId: campaigns[0].id,
      campaignName: campaigns[0].name,
      dateRange: { startDate, endDate },
      metrics
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message })
  }
}