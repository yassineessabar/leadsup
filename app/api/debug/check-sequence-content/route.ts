import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get the campaign sequence content
    const { data: sequences, error } = await supabase
      .from('campaign_sequences')
      .select('id, campaign_id, step_number, subject, content')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const analysis = sequences?.map(seq => ({
      id: seq.id,
      campaign_id: seq.campaign_id,
      step_number: seq.step_number,
      subject: seq.subject,
      content_raw: seq.content,
      content_escaped: JSON.stringify(seq.content),
      content_length: seq.content?.length || 0,
      has_newlines: seq.content?.includes('\n') || false,
      has_br_tags: seq.content?.includes('<br') || false,
      has_line_breaks: (seq.content?.includes('\n') || seq.content?.includes('<br')) || false,
      preview: seq.content?.substring(0, 150) + '...'
    }))
    
    return NextResponse.json({
      success: true,
      message: 'Sequence content analysis',
      sequences: analysis,
      debug_info: {
        total_found: sequences?.length || 0,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}