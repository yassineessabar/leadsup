import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    // Check if there are any active scraping jobs for this campaign
    // This could check job queues, background processes, or scraping status tables
    
    // For now, we'll check if there are recent scraping activities
    // You can modify this logic based on how your scraping system works
    
    // Check for recent scraping activities (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: scrapingJobs, error } = await supabase
      .from('scraping_jobs') // Assuming you have a scraping_jobs table
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'running')
      .gte('started_at', thirtyMinutesAgo)
    
    if (error && error.code !== 'PGRST116') { // Ignore "table not found" errors
      console.error('Error checking scraping status:', error)
    }

    // Alternative: Check for recent contact additions as indicator of active scraping
    const { data: recentContacts, error: contactsError } = await supabase
      .from('contacts')
      .select('created_at')
      .eq('campaign_id', campaignId)
      .gte('created_at', thirtyMinutesAgo)
      .limit(1)

    const hasRecentScrapingJobs = scrapingJobs && scrapingJobs.length > 0
    const hasRecentContacts = recentContacts && recentContacts.length > 0
    
    // Consider scraping active if there are running jobs OR recent contact additions
    const isActive = hasRecentScrapingJobs || hasRecentContacts

    return NextResponse.json({
      isActive,
      lastActivity: recentContacts?.[0]?.created_at || null,
      activeJobs: scrapingJobs?.length || 0
    })

  } catch (error) {
    console.error('Error in scraping status API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraping status' },
      { status: 500 }
    )
  }
}