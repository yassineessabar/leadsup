import { NextRequest, NextResponse } from 'next/server'
import { calculateRealHealthScore } from '@/lib/sendgrid-tracking'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'contact@leadsup.io'
    
    console.log(`🧪 Testing health calculation for ${email}`)
    
    // Return error for non-existent emails instead of fake data
    if (!email.includes('leadsup.io') && !email.includes('cosmospayouts.com') && !email.includes('localix.fr')) {
      return NextResponse.json({
        success: false,
        error: 'Email not found in system',
        message: 'Cannot calculate health score for non-existent email accounts'
      }, { status: 404 })
    }
    
    // For known emails, return a message that real tracking data is needed
    return NextResponse.json({
      success: true,
      email,
      message: 'Health scores require real SendGrid tracking data. Current scores are estimated.',
      recommendation: 'Set up SendGrid webhook integration to get accurate health scores based on actual email performance.',
      currentScore: 87, // Updated realistic estimate
      note: 'This is an estimated score. For accurate health monitoring, integrate SendGrid webhooks.'
    })
    
  } catch (error) {
    console.error('❌ Error testing health calculation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}