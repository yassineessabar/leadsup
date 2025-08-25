import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// GET - Track email clicks and redirect to original URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('id')
    const url = searchParams.get('url')
    const campaignId = searchParams.get('cid')
    const contactEmail = searchParams.get('email')

    console.log('📧 Email click tracking triggered:', { trackingId, url, campaignId, contactEmail })

    if (!trackingId || !url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing tracking ID or URL' 
      }, { status: 400 })
    }

    // Decode the URL
    const targetUrl = decodeURIComponent(url)

    // Find the email tracking record and update first_clicked_at
    const { data: tracking, error: findError } = await supabaseServer
      .from('email_tracking')
      .select('id, first_clicked_at, click_count, campaign_id, email')
      .eq('id', trackingId)
      .single()

    if (findError || !tracking) {
      console.error('❌ Email tracking record not found:', findError)
      // Still redirect even if tracking fails
      return NextResponse.redirect(targetUrl)
    }

    // Update click tracking - set first_clicked_at if not set, increment click_count
    const updateData: any = {
      click_count: (tracking.click_count || 0) + 1,
      status: 'clicked', // Update status to clicked
      updated_at: new Date().toISOString()
    }

    // Only set first_clicked_at if this is the first click
    if (!tracking.first_clicked_at) {
      updateData.first_clicked_at = new Date().toISOString()
      console.log('✅ First email click tracked for ID:', trackingId)
    } else {
      console.log('📧 Additional email click tracked for ID:', trackingId)
    }

    const { error: updateError } = await supabaseServer
      .from('email_tracking')
      .update(updateData)
      .eq('id', trackingId)

    if (updateError) {
      console.error('❌ Failed to update email click tracking:', updateError)
    } else {
      console.log('✅ Email click tracked successfully')
    }

    // Redirect to the original URL
    return NextResponse.redirect(targetUrl)

  } catch (error) {
    console.error('❌ Error in email click tracking:', error)
    
    // Try to redirect to URL even if tracking fails
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (url) {
      return NextResponse.redirect(decodeURIComponent(url))
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}