import { NextRequest, NextResponse } from 'next/server'
import { getInboundParseSettings } from "@/lib/sendgrid"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing SendGrid inbound parse configuration')
    
    // Get all configured inbound parse settings from SendGrid
    const result = await getInboundParseSettings()
    
    console.log(`✅ Found ${result.settings.length} inbound parse configurations`)
    
    return NextResponse.json({
      success: true,
      message: `Found ${result.settings.length} inbound parse configurations`,
      settings: result.settings,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error testing inbound parse:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}