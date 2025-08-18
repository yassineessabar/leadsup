import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🔍 Checking database tables...')
    
    // Check if campaign_sequences table exists
    const { data: sequences, error: seqError } = await supabase
      .from('campaign_sequences')
      .select('count')
      .limit(1)
    
    // Check campaigns table
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1)
    
    // Check contacts table
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('count')
      .limit(1)
    
    const tableStatus = {
      campaign_sequences: {
        exists: !seqError,
        error: seqError?.message || null
      },
      campaigns: {
        exists: !campError,
        error: campError?.message || null
      },
      contacts: {
        exists: !contactError,
        error: contactError?.message || null
      }
    }
    
    // If campaign_sequences exists, get a sample
    let sequenceSample = null
    if (!seqError) {
      const { data: sampleSeq } = await supabase
        .from('campaign_sequences')
        .select('*')
        .limit(3)
      sequenceSample = sampleSeq
    }
    
    // If contacts exist, get a sample
    let contactSample = null
    if (!contactError) {
      const { data: sampleContact } = await supabase
        .from('contacts')
        .select('id, email, campaign_id, sequence_step, created_at')
        .limit(3)
      contactSample = sampleContact
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tableStatus,
      samples: {
        campaign_sequences: sequenceSample,
        contacts: contactSample
      }
    })
    
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}