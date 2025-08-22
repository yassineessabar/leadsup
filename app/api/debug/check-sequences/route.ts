import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Get campaign sequences
    const { data: sequences, error } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sequences',
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      sequences: sequences,
      count: sequences?.length || 0,
      note: 'Check what fields exist in sequences table'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}