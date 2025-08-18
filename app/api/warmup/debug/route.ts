import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🔍 Debug check started:', new Date().toISOString())
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
        emailSimulationMode: process.env.EMAIL_SIMULATION_MODE,
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
      },
      endpoints: {
        currentUrl: '/api/warmup/debug',
        expectedEndpoints: [
          '/api/warming/scheduler',
          '/api/warming/execute',
          '/api/warmup/health'
        ]
      }
    }
    
    // Test database connection
    try {
      const { data: testQuery, error: testError } = await supabase
        .from('warmup_campaigns')
        .select('count')
        .limit(1)
      
      debugInfo.database = {
        connected: !testError,
        error: testError?.message || null
      }
    } catch (dbError) {
      debugInfo.database = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }
    }
    
    // Check if warmup tables exist
    try {
      const { data: campaigns } = await supabase.from('warmup_campaigns').select('count').limit(1)
      const { data: activities } = await supabase.from('warmup_activities').select('count').limit(1) 
      const { data: recipients } = await supabase.from('warmup_recipients').select('count').limit(1)
      
      debugInfo.tables = {
        warmup_campaigns: !!campaigns,
        warmup_activities: !!activities,
        warmup_recipients: !!recipients
      }
    } catch (error) {
      debugInfo.tables = {
        error: error instanceof Error ? error.message : 'Table check failed'
      }
    }
    
    console.log('✅ Debug check completed')
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    console.error('❌ Debug check failed:', error)
    
    return NextResponse.json({
      status: 'debug_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}