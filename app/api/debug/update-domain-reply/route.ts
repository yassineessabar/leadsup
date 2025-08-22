import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Updating leadsup.io domain reply-to configuration')
    
    // Update the main domain configuration to use reply@reply.leadsup.io
    const { data: updated, error: updateError } = await supabase
      .from('domains')
      .update({
        reply_to_email: 'reply@reply.leadsup.io'
      })
      .eq('domain', 'leadsup.io')
      .eq('user_id', 'd155d4c2-2f06-45b7-9c90-905e3648e8df') // Target specific user
      .select()
    
    console.log('Update result:', { updated, updateError })
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        details: updateError
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Domain reply-to updated successfully',
      updated_records: updated?.length || 0,
      updated: updated,
      new_reply_to: 'reply@reply.leadsup.io'
    })
    
  } catch (error) {
    console.error('❌ Domain update error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}