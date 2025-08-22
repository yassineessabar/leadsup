import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { subject, from_email, to_email } = await request.json()
    
    console.log('🧪 Testing webhook processing logic...')
    console.log(`   From: ${from_email}`)
    console.log(`   To: ${to_email}`)
    console.log(`   Subject: ${subject}`)
    
    // Step 1: Look for original message
    if (subject && subject.startsWith('Re: ')) {
      const originalSubject = subject.replace(/^Re:\s*/, '')
      console.log(`🔍 Looking for original message with subject: "${originalSubject}"`)
      
      const { data: originalMessages, error } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('direction', 'outbound')
        .ilike('subject', `%${originalSubject}%`)
        .order('sent_at', { ascending: false })
        .limit(5)
      
      if (originalMessages && originalMessages.length > 0) {
        console.log(`✅ Found ${originalMessages.length} original messages`)
        return NextResponse.json({
          success: true,
          found_original: true,
          original_messages: originalMessages.map(m => ({
            id: m.id,
            subject: m.subject,
            sender_email: m.sender_email,
            contact_email: m.contact_email,
            user_id: m.user_id,
            campaign_id: m.campaign_id,
            sent_at: m.sent_at
          }))
        })
      } else {
        console.log('❌ No original message found')
        return NextResponse.json({
          success: false,
          found_original: false,
          error: error?.message || 'No matching outbound message'
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Subject must start with "Re: "'
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  // Test with a known automation email subject
  const testSubject = 'Re: Quick question about Uboard'
  const originalSubject = testSubject.replace(/^Re:\s*/, '')
  
  console.log(`🧪 Testing lookup for: "${originalSubject}"`)
  
  const { data: messages, error } = await supabase
    .from('inbox_messages')
    .select('id, subject, sender_email, contact_email, user_id, campaign_id, sent_at')
    .eq('direction', 'outbound')
    .ilike('subject', `%${originalSubject}%`)
    .order('sent_at', { ascending: false })
    .limit(10)
  
  return NextResponse.json({
    test_subject: testSubject,
    search_for: originalSubject,
    found: messages?.length || 0,
    messages: messages || [],
    error: error?.message || null
  })
}