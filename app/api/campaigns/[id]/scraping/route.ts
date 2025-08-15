import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase';
import { scrapingService } from '@/lib/scraping-service';

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return null;
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single();
    
    if (error || !session) {
      return null;
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null;
    }

    return session.user_id;
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    const userId = await getUserIdFromSession();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get request body to check for mode and scraping parameters
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'full'; // 'full', 'profiles-only', or 'combined'
    const { keyword, location, industry, dailyLimit } = body;

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if scraping is already running
    if (scrapingService.isScrapingRunning(campaignId)) {
      return NextResponse.json({ 
        message: 'Scraping already in progress',
        status: 'running' 
      });
    }

    const scrapingJob = {
      campaignId,
      userId: userId,
      keyword: keyword || campaign.keyword || '',
      location: location || campaign.location || '',
      industry: industry || campaign.industry || '',
      maxPages: campaign.max_pages || 5
    };

    // Start scraping in the background based on mode
    if (mode === 'profiles-only') {
      // Run find_profiles.py
      scrapingService.findProfiles(scrapingJob).catch((error: any) => {
        if (error?.message !== 'Script execution cancelled' && error?.code !== 'ABORT_ERR') {
          console.error(`Background profile finding error for campaign ${campaignId}:`, error);
        }
      });
    } else if (mode === 'enrich-emails') {
      // Run get_emails.py
      scrapingService.enrichEmails(scrapingJob).catch((error: any) => {
        if (error?.message !== 'Script execution cancelled' && error?.code !== 'ABORT_ERR') {
          console.error(`Background email enrichment error for campaign ${campaignId}:`, error);
        }
      });
    } else if (mode === 'combined') {
      // Smart scraping: Check if there are unenriched profiles first
      scrapingService.smartCombinedScraping(scrapingJob).catch((error: any) => {
        if (error?.message !== 'Script execution cancelled' && error?.code !== 'ABORT_ERR') {
          console.error(`Background smart scraping error for campaign ${campaignId}:`, error);
        }
      });
    } else {
      // Default: just run get_emails.py (for "Start Scraping" button)
      scrapingService.enrichEmails(scrapingJob).catch((error: any) => {
        if (error?.message !== 'Script execution cancelled' && error?.code !== 'ABORT_ERR') {
          console.error(`Background email enrichment error for campaign ${campaignId}:`, error);
        }
      });
    }

    return NextResponse.json({ 
      message: mode === 'profiles-only' 
        ? 'Profile finding started successfully' 
        : mode === 'combined'
        ? 'Combined scraping and enrichment started successfully'
        : 'Email enrichment started successfully',
      status: 'running',
      mode
    });

  } catch (error) {
    console.error('Error starting scraping:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    const userId = await getUserIdFromSession();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get campaign scraping status
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('scraping_status, scraping_updated_at')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get progress metrics
    const progress = await scrapingService.getScrapingProgress(campaignId);

    return NextResponse.json({
      status: campaign.scraping_status || 'idle',
      updatedAt: campaign.scraping_updated_at,
      progress,
      isRunning: scrapingService.isScrapingRunning(campaignId)
    });

  } catch (error) {
    console.error('Error getting scraping status:', error);
    return NextResponse.json(
      { error: 'Failed to get scraping status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    
    const userId = await getUserIdFromSession();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Stop scraping
    await scrapingService.stopScraping(campaignId);

    return NextResponse.json({ 
      message: 'Scraping stopped successfully',
      status: 'idle'
    });

  } catch (error) {
    console.error('Error stopping scraping:', error);
    return NextResponse.json(
      { error: 'Failed to stop scraping' },
      { status: 500 }
    );
  }
}