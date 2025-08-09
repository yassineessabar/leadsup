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
    const body = await request.json()
    const {
      campaignId,
      contactId,
      sequenceId,
      messageId,
      sentAt,
      status = 'sent'
    } = body

    console.log('📧 Updating email tracking:', {
      campaignId,
      contactId,
      sequenceId,
      status
    })

    // Check if tracking record exists
    const { data: existing, error: checkError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('prospect_id', contactId)
      .eq('sequence_id', sequenceId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking existing record:', checkError)
      return NextResponse.json({ success: false, error: checkError.message }, { status: 500 })
    }

    let result
    
    if (existing) {
      // Update existing record
      const { data, error } = await supabaseServer
        .from('prospect_sequence_progress')
        .update({
          status,
          sent_at: sentAt || new Date().toISOString(),
          message_id: messageId,
          updated_at: new Date().toISOString()
        })
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
      const { data, error } = await supabaseServer
        .from('prospect_sequence_progress')
        .insert({
          campaign_id: campaignId,
          prospect_id: contactId,
          sequence_id: sequenceId,
          status,
          sent_at: sentAt || new Date().toISOString(),
          message_id: messageId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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

  } catch (error) {
    console.error('❌ Error in tracking update:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}