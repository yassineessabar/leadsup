import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get our test contacts and their campaign sequences
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, sequence_step, last_contacted_at, created_at, campaign_id')
      .in('id', [1527, 1528, 1529, 1530])
    
    const { data: sequences } = await supabase
      .from('campaign_sequences')  
      .select('step_number, timing_days, timing, subject')
      .eq('campaign_id', 'ed08e451-55a7-4118-b69e-de13858034f6')
      .order('step_number')
    
    const results = []
    
    for (const contact of contacts || []) {
      const currentStep = contact.sequence_step || 0
      const nextStepIndex = currentStep // Next email would be step currentStep + 1, but array is 0-based so step 4 = index 3  
      const nextSequence = sequences?.[nextStepIndex]
      
      let nextEmailDate = null
      let timingDays = null
      
      if (nextSequence) {
        timingDays = nextSequence.timing_days ?? nextSequence.timing ?? (nextStepIndex === 0 ? 0 : 1)
        
        // Calculate base date (use last_contacted_at if available, otherwise created_at)
        const baseDate = contact.last_contacted_at ? new Date(contact.last_contacted_at) : new Date(contact.created_at)
        
        // Add timing days
        nextEmailDate = new Date(baseDate)
        nextEmailDate.setDate(baseDate.getDate() + timingDays)
      }
      
      const now = new Date()
      const isDue = nextEmailDate ? nextEmailDate <= now : false
      
      results.push({
        contactId: contact.id,
        email: contact.email,
        currentStep: currentStep,
        nextStepNumber: currentStep + 1,
        nextSequenceExists: !!nextSequence,
        nextSequenceSubject: nextSequence?.subject,
        timingDays,
        lastContactedAt: contact.last_contacted_at,
        createdAt: contact.created_at,
        calculatedNextEmailDate: nextEmailDate?.toISOString(),
        currentTime: now.toISOString(),
        isDue,
        shouldShow: isDue ? "Due next" : `Pending Step ${currentStep + 1}/${sequences?.length || 0}`
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Next email calculation test',
      totalSequences: sequences?.length || 0,
      results
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}