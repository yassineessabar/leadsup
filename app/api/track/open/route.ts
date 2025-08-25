import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// GET - Track email opens via tracking pixel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('id')
    const campaignId = searchParams.get('cid')
    const contactEmail = searchParams.get('email')

    console.log('📧 Email open tracking triggered:', { trackingId, campaignId, contactEmail })

    if (!trackingId) {
      // Return a transparent 1x1 pixel even if tracking ID is missing
      return new Response(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Content-Length': '43',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Find the email tracking record and update first_opened_at
    const { data: tracking, error: findError } = await supabaseServer
      .from('email_tracking')
      .select('id, first_opened_at, open_count, campaign_id, email')
      .eq('id', trackingId)
      .single()

    if (findError || !tracking) {
      console.error('❌ Email tracking record not found:', findError)
      // Still return pixel even if tracking fails
      return new Response(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Content-Length': '43',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Update open tracking - set first_opened_at if not set, increment open_count
    const updateData: any = {
      open_count: (tracking.open_count || 0) + 1,
      status: 'opened', // Update status to opened
      updated_at: new Date().toISOString()
    }

    // Only set first_opened_at if this is the first open
    if (!tracking.first_opened_at) {
      updateData.first_opened_at = new Date().toISOString()
      console.log('✅ First email open tracked for ID:', trackingId)
    } else {
      console.log('📧 Additional email open tracked for ID:', trackingId)
    }

    const { error: updateError } = await supabaseServer
      .from('email_tracking')
      .update(updateData)
      .eq('id', trackingId)

    if (updateError) {
      console.error('❌ Failed to update email tracking:', updateError)
    } else {
      console.log('✅ Email open tracked successfully')
    }

    // Return a transparent 1x1 pixel
    return new Response(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': '43',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Error in email open tracking:', error)
    
    // Always return a pixel even if tracking fails
    return new Response(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': '43',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}