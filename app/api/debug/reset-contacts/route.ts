import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // 1. Clear email tracking for these contacts
    console.log('🗑️ Clearing email tracking records...')
    const { data: deleted, error: deleteError } = await supabase
      .from('email_tracking')
      .delete()
      .eq('campaign_id', campaignId)
    
    if (deleteError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to clear email tracking',
        details: deleteError
      }, { status: 500 })
    }
    
    // 2. Reset contact sequence steps to 0
    console.log('🔄 Resetting contact sequence steps...')
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        sequence_step: 0,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset contacts',
        details: updateError
      }, { status: 500 })
    }
    
    // 3. Verify contacts are now at step 0
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, sequence_step')
      .eq('campaign_id', campaignId)
    
    return NextResponse.json({
      success: true,
      message: 'All contacts reset to step 0',
      contacts_reset: contacts?.length || 0,
      contacts: contacts?.map(c => ({
        email: c.email,
        sequence_step: c.sequence_step
      }))
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}