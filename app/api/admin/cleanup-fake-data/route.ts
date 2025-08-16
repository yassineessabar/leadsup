import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of fake SendGrid data...')

    // Get all campaigns with their contact counts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, sent, sendgrid_metrics')
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    let cleanedMetrics = 0
    let updatedCampaigns = 0
    const results: any[] = []

    for (const campaign of campaigns || []) {
      // Check if campaign has any contacts
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)

      const hasContacts = (contactsCount || 0) > 0
      const hasSentEmails = (campaign.sent || 0) > 0
      const hasFakeMetrics = campaign.sendgrid_metrics && !hasContacts && !hasSentEmails

      console.log(`Campaign ${campaign.name}: contacts=${contactsCount}, sent=${campaign.sent}, hasMetrics=${!!campaign.sendgrid_metrics}`)

      // If campaign has no contacts and no real sent emails, clean it up
      if (!hasContacts && !hasSentEmails) {
        // Delete any campaign metrics
        const { error: deleteMetricsError } = await supabase
          .from('campaign_metrics')
          .delete()
          .eq('campaign_id', campaign.id)

        if (!deleteMetricsError) {
          cleanedMetrics++
        }

        // Reset campaign sent and sendgrid_metrics
        if (campaign.sent || campaign.sendgrid_metrics) {
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({ 
              sent: null, 
              sendgrid_metrics: null 
            })
            .eq('id', campaign.id)

          if (!updateError) {
            updatedCampaigns++
          }
        }

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          action: 'cleaned',
          contactsCount,
          oldSent: campaign.sent,
          hadMetrics: !!campaign.sendgrid_metrics
        })
      } else {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          action: 'kept',
          reason: hasContacts ? 'has contacts' : 'has sent emails',
          contactsCount,
          sent: campaign.sent
        })
      }
    }

    console.log(`✅ Cleanup complete: cleaned ${cleanedMetrics} metric records, updated ${updatedCampaigns} campaigns`)

    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleanedMetrics} metric records and updated ${updatedCampaigns} campaigns`,
      cleanedMetrics,
      updatedCampaigns,
      totalCampaigns: campaigns?.length || 0,
      results
    })

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cleanup fake data',
      details: error
    }, { 
      status: 500 
    })
  }
}