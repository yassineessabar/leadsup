import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up email tracking for test contact to make it due')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    const testEmail = 'essabar.yassine@gmail.com'
    
    // Get the test contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', testEmail)
      .eq('campaign_id', campaignId)
      .single()
    
    if (!contact) {
      return NextResponse.json({
        success: false,
        error: 'Test contact not found'
      }, { status: 404 })
    }
    
    // Get the first sequence step
    const { data: firstSequence } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
      .limit(1)
      .single()
    
    if (!firstSequence) {
      return NextResponse.json({
        success: false,
        error: 'No sequences found for campaign'
      }, { status: 404 })
    }
    
    // Check if tracking record already exists
    const { data: existingTracking } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('campaign_id', campaignId)
      .single()
    
    if (existingTracking) {
      // Update existing to be sent 25 hours ago
      const { data: updated, error: updateError } = await supabase
        .from('email_tracking')
        .update({
          status: 'sent',
          sent_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTracking.id)
        .select()
        .single()
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update tracking record',
          details: updateError
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        action: 'updated',
        tracking: updated,
        message: 'Contact is now ready for next sequence step'
      })
    } else {
      // Create new tracking record
      const { data: newTracking, error: insertError } = await supabase
        .from('email_tracking')
        .insert({
          contact_id: contact.id,
          campaign_id: campaignId,
          sequence_id: firstSequence.id,
          status: 'sent',
          sent_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (insertError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create tracking record',
          details: insertError
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        action: 'created',
        tracking: newTracking,
        message: 'Contact is now ready for next sequence step'
      })
    }
    
  } catch (error) {
    console.error('❌ Setup tracking error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}