import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🚨 WEBHOOK TEST ENDPOINT HIT!')
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const body = await request.text()
    console.log('Body length:', body.length)
    console.log('Body preview:', body.substring(0, 500))
    
    return NextResponse.json({ 
      success: true, 
      received: true,
      timestamp: new Date().toISOString(),
      bodyLength: body.length
    })
  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process' })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook test endpoint active',
    timestamp: new Date().toISOString() 
  })
}