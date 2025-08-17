import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    console.log(`🔄 Sequence changed for campaign ${campaignId} - triggering reschedule`)

    // Call the reschedule endpoint to update all email timings
    const rescheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/campaigns/${campaignId}/reschedule-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (rescheduleResponse.ok) {
      const result = await rescheduleResponse.json()
      console.log(`✅ Rescheduled ${result.rescheduled_count || 0} emails after sequence change`)
      
      return NextResponse.json({ 
        success: true, 
        message: `Rescheduled ${result.rescheduled_count || 0} emails after sequence change`,
        rescheduled_count: result.rescheduled_count || 0
      })
    } else {
      console.error('❌ Failed to reschedule emails after sequence change:', rescheduleResponse.statusText)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to reschedule emails after sequence change' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error handling sequence change reschedule:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}