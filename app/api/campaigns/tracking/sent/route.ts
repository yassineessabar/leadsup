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
    
    // Log everything for debugging
    console.log('🔍 === DEBUGGING EMAIL TRACKING REQUEST ===')
    console.log('📧 Full request body:', JSON.stringify(body, null, 2))
    console.log('📧 Body type:', typeof body)
    console.log('📧 Body keys:', Object.keys(body))
    console.log('📧 Body values:', Object.values(body))
    
    // Log each potential field name and its value
    console.log('🔍 Field Analysis:')
    const potentialFields = [
      'campaignId', 'campaign_id', 'CampaignId', 'Campaign_Id', 'CAMPAIGN_ID',
      'contactId', 'contact_id', 'ContactId', 'Contact_Id', 'CONTACT_ID',
      'prospect_id', 'prospectId', 'ProspectId', 'Prospect_Id', 'PROSPECT_ID',
      'sequenceId', 'sequence_id', 'SequenceId', 'Sequence_Id', 'SEQUENCE_ID',
      'messageId', 'message_id', 'MessageId', 'Message_Id', 'MESSAGE_ID',
      'status', 'Status', 'STATUS',
      'sentAt', 'sent_at', 'SentAt', 'Sent_At', 'SENT_AT'
    ]
    
    potentialFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        console.log(`   ✓ ${field}: ${JSON.stringify(body[field])}`)
      }
    })
    
    // Support extensive parameter name variations
    function findValue(patterns) {
      for (const pattern of patterns) {
        if (body[pattern] !== undefined && body[pattern] !== null && body[pattern] !== '') {
          return body[pattern]
        }
      }
      return null
    }
    
    const campaignId = findValue([
      'campaignId', 'campaign_id', 'CampaignId', 'Campaign_Id', 'CAMPAIGN_ID',
      'campaignID', 'campaign_ID', 'CampaignID'
    ])
    
    const contactId = findValue([
      'contactId', 'contact_id', 'ContactId', 'Contact_Id', 'CONTACT_ID',
      'contactID', 'contact_ID', 'ContactID',
      'prospect_id', 'prospectId', 'ProspectId', 'Prospect_Id', 'PROSPECT_ID',
      'prospectID', 'prospect_ID', 'ProspectID',
      'userId', 'user_id', 'UserId', 'User_Id', 'USER_ID',
      'recipientId', 'recipient_id', 'RecipientId'
    ])
    
    const sequenceId = findValue([
      'sequenceId', 'sequence_id', 'SequenceId', 'Sequence_Id', 'SEQUENCE_ID',
      'sequenceID', 'sequence_ID', 'SequenceID',
      'stepId', 'step_id', 'StepId', 'Step_Id', 'STEP_ID'
    ])
    
    const messageId = findValue([
      'messageId', 'message_id', 'MessageId', 'Message_Id', 'MESSAGE_ID',
      'messageID', 'message_ID', 'MessageID',
      'emailId', 'email_id', 'EmailId', 'Email_Id', 'EMAIL_ID'
    ])
    
    const sentAt = findValue([
      'sentAt', 'sent_at', 'SentAt', 'Sent_At', 'SENT_AT',
      'timestamp', 'Timestamp', 'TIMESTAMP',
      'createdAt', 'created_at', 'CreatedAt', 'Created_At', 'CREATED_AT'
    ])
    
    const status = findValue([
      'status', 'Status', 'STATUS',
      'state', 'State', 'STATE'
    ]) || 'sent'
    
    const errorMessage = findValue([
      'errorMessage', 'error_message', 'ErrorMessage', 'Error_Message', 'ERROR_MESSAGE',
      'error', 'Error', 'ERROR',
      'failureReason', 'failure_reason', 'FailureReason'
    ])
    
    const senderType = findValue([
      'senderType', 'sender_type', 'SenderType', 'Sender_Type', 'SENDER_TYPE',
      'provider', 'Provider', 'PROVIDER',
      'service', 'Service', 'SERVICE'
    ])

    console.log('📧 Extracted parameters:')
    console.log('   campaignId:', campaignId)
    console.log('   contactId:', contactId) 
    console.log('   sequenceId:', sequenceId)
    console.log('   messageId:', messageId)
    console.log('   sentAt:', sentAt)
    console.log('   status:', status)
    console.log('   senderType:', senderType)
    console.log('   errorMessage:', errorMessage)

    // Validate required fields with detailed debugging
    const missingFields = []
    if (!campaignId) missingFields.push('campaignId')
    if (!contactId) missingFields.push('contactId') 
    if (!sequenceId) missingFields.push('sequenceId')
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', { 
        missingFields,
        campaignId: !!campaignId, 
        contactId: !!contactId, 
        sequenceId: !!sequenceId,
        availableKeys: Object.keys(body),
        bodyContent: body
      })
      
      // Create a helpful response that shows what we found
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        debug: {
          received: Object.keys(body),
          bodyContent: body,
          extracted: { campaignId, contactId, sequenceId },
          missingFields,
          supportedFieldNames: {
            campaignId: ['campaignId', 'campaign_id', 'CampaignId', 'Campaign_Id', 'CAMPAIGN_ID'],
            contactId: ['contactId', 'contact_id', 'prospect_id', 'prospectId', 'userId', 'user_id'],
            sequenceId: ['sequenceId', 'sequence_id', 'stepId', 'step_id']
          }
        }
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