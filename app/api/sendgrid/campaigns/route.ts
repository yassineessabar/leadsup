import { NextRequest, NextResponse } from 'next/server'
import { sendGridAPI } from '@/lib/sendgrid-api'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching campaigns from SendGrid...')

    // Get all SendGrid campaigns (Single Sends)
    const campaigns = await sendGridAPI.getCampaigns(50)
    
    console.log(`📧 Found ${campaigns.length} SendGrid campaigns`)

    // Get recent global stats to show available data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const startDate = yesterday.toISOString().split('T')[0]
    
    let globalStats = null
    try {
      const stats = await sendGridAPI.getGlobalStats(startDate)
      globalStats = stats[0] || null
    } catch (error) {
      console.warn('⚠️ Could not fetch global stats:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at,
          send_at: campaign.send_at,
          categories: campaign.categories || []
        })),
        globalStats,
        totalCampaigns: campaigns.length,
        message: campaigns.length > 0 
          ? 'SendGrid campaigns found! Use these IDs for syncing.'
          : 'No SendGrid campaigns found. Create a campaign in SendGrid first.'
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching SendGrid campaigns:', error)
    
    let errorMessage = 'Failed to fetch SendGrid campaigns'
    let statusCode = 500
    
    if (error.message?.includes('SENDGRID_API_KEY')) {
      errorMessage = 'SendGrid API key not configured. Add SENDGRID_API_KEY to your environment variables.'
      statusCode = 401
    } else if (error.code === 401) {
      errorMessage = 'Invalid SendGrid API key. Check your SENDGRID_API_KEY environment variable.'
      statusCode = 401
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.response?.body || error.message
    }, { 
      status: statusCode
    })
  }
}