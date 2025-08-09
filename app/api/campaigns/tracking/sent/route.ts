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
    console.log('📧 Received tracking request body:', JSON.stringify(body, null, 2))
    console.log('📧 Body keys:', Object.keys(body))
    
    // Support multiple parameter name formats
    const campaignId = body.campaignId || body.campaign_id || body.CampaignId
    const contactId = body.contactId || body.contact_id || body.prospect_id || body.prospectId || body.ContactId
    const sequenceId = body.sequenceId || body.sequence_id || body.SequenceId
    const messageId = body.messageId || body.message_id || body.MessageId
    const sentAt = body.sentAt || body.sent_at || body.SentAt
    const status = body.status || body.Status || 'sent'
    const errorMessage = body.errorMessage || body.error_message || body.ErrorMessage
    const senderType = body.senderType || body.sender_type || body.SenderType

    console.log('📧 Extracted parameters:', {
      campaignId,
      contactId,
      sequenceId,
      messageId,
      sentAt,
      status,
      senderType,
      errorMessage
    })

    // Validate required fields
    if (!campaignId || !contactId || !sequenceId) {
      console.error('❌ Missing required fields:', { 
        campaignId: !!campaignId, 
        contactId: !!contactId, 
        sequenceId: !!sequenceId,
        availableKeys: Object.keys(body)
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: campaignId, contactId, sequenceId',
        received: Object.keys(body),
        expected: ['campaignId (or campaign_id)', 'contactId (or contact_id/prospect_id)', 'sequenceId (or sequence_id)']
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

    // Try to use prospect_sequence_progress table first, then fallback
    try {
      // Check if tracking record exists
      const { data: existing, error: checkError } = await supabaseServer
        .from('prospect_sequence_progress')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('prospect_id', contactId)
        .eq('sequence_id', sequenceId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
        // If table doesn't exist, create a fallback solution
        if (checkError.code === '42P01') {
          console.log('📝 prospect_sequence_progress table does not exist')
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
            message: 'Email tracking logged (table needs to be created)',
            data: { campaignId, contactId, sequenceId, status },
            note: 'Run the SQL script: create-prospect-sequence-progress-table.sql'
          })
        }
        
        console.error('Error checking existing record:', checkError)
        return NextResponse.json({ success: false, error: checkError.message }, { status: 500 })
      }

      let result

      if (existing) {
        // Update existing record
        const updateData = {
          status,
          sent_at: sentAt || new Date().toISOString(),
          message_id: messageId,
          updated_at: new Date().toISOString()
        }
        
        if (status === 'failed' && errorMessage) {
          updateData.error_message = errorMessage
        }
        
        if (senderType) {
          updateData.sender_type = senderType
        }

        const { data, error } = await supabaseServer
          .from('prospect_sequence_progress')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating tracking:', error)
          return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }
        
        result = data
        console.log('✅ Updated existing tracking record')
      } else {
        // Create new tracking record
        const insertData = {
          campaign_id: campaignId,
          prospect_id: contactId,
          sequence_id: sequenceId,
          status,
          sent_at: sentAt || new Date().toISOString(),
          message_id: messageId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        if (status === 'failed' && errorMessage) {
          insertData.error_message = errorMessage
        }
        
        if (senderType) {
          insertData.sender_type = senderType
        }

        const { data, error } = await supabaseServer
          .from('prospect_sequence_progress')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error('Error creating tracking:', error)
          return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }
        
        result = data
        console.log('✅ Created new tracking record')
      }

      // Update campaign statistics (optional)
      try {
        const { error: statsError } = await supabaseServer
          .rpc('increment_campaign_sent_count', { 
            campaign_id_param: campaignId 
          })

        if (statsError) {
          console.warn('Could not update campaign stats:', statsError)
        }
      } catch (statsError) {
        console.warn('Campaign stats function not available:', statsError)
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Email tracking updated successfully'
      })

    } catch (trackingError) {
      console.error('Error with prospect_sequence_progress table:', trackingError)
      
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
        data: { campaignId, contactId, sequenceId, status },
        note: 'Database table may need to be created'
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