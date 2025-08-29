import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Checking warmup environment configuration...')
    
    const envCheck = {
      SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
      SENDGRID_API_KEY_LENGTH: process.env.SENDGRID_API_KEY?.length || 0,
      EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      willSendRealEmails: !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_SIMULATION_MODE !== 'true')
    }
    
    console.log('📊 Environment Check Results:', envCheck)
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment check completed'
    })
    
  } catch (error) {
    console.error('❌ Environment check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}