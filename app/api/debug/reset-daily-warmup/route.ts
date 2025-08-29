import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🔄 Resetting daily warmup counters for testing...')
    
    // Reset warmup_emails_sent_today to 0 for all senders
    const { data, error } = await supabaseServer
      .from('campaign_senders')
      .update({ 
        warmup_emails_sent_today: 0,
        updated_at: new Date().toISOString()
      })
      .eq('is_selected', true)
      .select('email, warmup_emails_sent_today')
    
    if (error) {
      console.error('❌ Error resetting counters:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to reset counters',
        details: error.message
      }, { status: 500 })
    }
    
    console.log(`✅ Reset daily counters for ${data?.length || 0} senders`)
    data?.forEach(s => {
      console.log(`   📧 ${s.email}: reset to ${s.warmup_emails_sent_today}`)
    })
    
    // Also reset warmup recipients daily counter
    const { data: recipients, error: recipientsError } = await supabaseServer
      .from('warmup_recipients')
      .update({ 
        emails_received_today: 0,
        last_reset_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .select('email, emails_received_today')
    
    if (!recipientsError) {
      console.log(`✅ Reset recipient counters for ${recipients?.length || 0} recipients`)
    }
    
    return NextResponse.json({
      success: true,
      sendersReset: data?.length || 0,
      recipientsReset: recipients?.length || 0,
      message: 'Daily warmup counters reset - automation can now process senders'
    })
    
  } catch (error) {
    console.error('❌ Reset error:', error)
    return NextResponse.json({
      success: false,
      error: 'Reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}