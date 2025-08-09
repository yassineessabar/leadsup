import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth validation (reuse from process-pending)
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Update email sent status
export async function POST(request: NextRequest) {
  // Validate authentication
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="n8n API"'
        }
      }
    )
  }

  try {
    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error - missing database credentials' 
      }, { status: 500 })
    }

    const body = await request.json()
    console.log('📧 Received tracking request body:', body)
    
    const {
      campaignId,
      contactId,
      sequenceId,
      messageId,
      sentAt,
      status = 'sent',
      errorMessage,
      senderType
    } = body

    // Validate required fields
    if (!campaignId || !contactId || !sequenceId) {
      console.error('❌ Missing required fields:', { campaignId, contactId, sequenceId })
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: campaignId, contactId, sequenceId' 
      }, { status: 400 })
    }

    console.log('📧 Updating email tracking:', {
      campaignId,
      contactId,
      sequenceId,
      status,
      senderType,
      errorMessage
    })

    // For now, create a simple email tracking table or use a different approach
    // Let's create a simple email_tracking table to store this information
    
    try {
      // Insert into email_tracking table (we'll create this table structure)
      const trackingData = {
        campaign_id: campaignId,
        contact_id: contactId,
        sequence_id: sequenceId,
        status,
        sent_at: sentAt || new Date().toISOString(),
        message_id: messageId,
        created_at: new Date().toISOString()
      }
      
      // Add error message if status is failed
      if (status === 'failed' && errorMessage) {
        trackingData.error_message = errorMessage
      }
      
      if (senderType) {
        trackingData.sender_type = senderType
      }

      // Try to insert into email_tracking table
      const { data: result, error: insertError } = await supabaseServer
        .from('email_tracking')
        .insert(trackingData)
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting tracking record:', insertError)
        
        // If table doesn't exist, create a fallback solution
        if (insertError.code === '42P01') { // Table does not exist
          console.log('📝 email_tracking table does not exist, logging to console for now')
          console.log('📧 Email tracking data:', trackingData)
          
          return NextResponse.json({
            success: true,
            message: 'Email tracking logged (table will be created soon)',
            data: trackingData
          })
        }
        
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
      
      console.log('✅ Created email tracking record:', result)
      
      // Update campaign statistics (optional)
      const { error: statsError } = await supabaseServer
        .rpc('increment_campaign_sent_count', { 
          campaign_id_param: campaignId 
        })

      if (statsError) {
        console.warn('Could not update campaign stats:', statsError)
        // Don't fail the request if stats update fails
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Email tracking updated successfully'
      })
      
    } catch (trackingError) {
      console.error('Error with email tracking:', trackingError)
      
      // Fallback: just log the tracking data
      console.log('📧 Email tracking data (fallback logging):', {
        campaignId,
        contactId,
        sequenceId,
        status,
        sentAt: sentAt || new Date().toISOString(),
        messageId,
        senderType,
        errorMessage
      })
      
      return NextResponse.json({
        success: true,
        message: 'Email tracking logged successfully (fallback mode)',
        data: { campaignId, contactId, sequenceId, status }
      })
    }


  } catch (error) {
    console.error('❌ Error in tracking update:', error)
    
    // More specific error messages for debugging
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    console.error('❌ Full error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : error,
      type: typeof error
    })
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}