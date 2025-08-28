import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get a sample sequence content
    const { data: sequences, error } = await supabase
      .from('campaign_sequences')
      .select('id, subject, content, step_number, campaign_id')
      .limit(3)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const analysis = sequences.map(seq => ({
      id: seq.id,
      campaign_id: seq.campaign_id,
      step_number: seq.step_number,
      subject: seq.subject,
      content_raw: seq.content,
      content_escaped: JSON.stringify(seq.content),
      content_length: seq.content.length,
      has_newlines: seq.content.includes('\n'),
      has_windows_breaks: seq.content.includes('\r\n'),
      has_br_tags: seq.content.includes('<br'),
      sample_chars: seq.content.substring(0, 200) + (seq.content.length > 200 ? '...' : '')
    }))
    
    return NextResponse.json({
      success: true,
      sequences: analysis,
      debug_info: {
        total_sequences: sequences.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}