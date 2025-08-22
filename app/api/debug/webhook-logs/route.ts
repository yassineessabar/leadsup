import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking webhook logs...')
    
    // Get the last 50 webhook logs
    const { data: logs, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error && error.code === '42P01') {
      // Table doesn't exist, create it
      console.log('📦 Creating webhook_logs table...')
      
      const { error: createError } = await supabase.rpc('create_webhook_logs_table', {
        sql: `
          CREATE TABLE IF NOT EXISTS webhook_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            webhook_type VARCHAR(50),
            from_email VARCHAR(255),
            to_email VARCHAR(255),
            subject TEXT,
            received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed BOOLEAN DEFAULT false,
            error TEXT,
            raw_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
          CREATE INDEX idx_webhook_logs_from_email ON webhook_logs(from_email);
        `
      }).single()
      
      if (createError) {
        console.log('⚠️ Could not create table via RPC, table might not exist')
        return NextResponse.json({
          success: false,
          message: 'webhook_logs table does not exist. Create it manually or through webhook activity.',
          create_sql: `
CREATE TABLE webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_type VARCHAR(50),
  from_email VARCHAR(255),
  to_email VARCHAR(255),
  subject TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  error TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
        })
      }
      
      return NextResponse.json({
        success: true,
        message: 'webhook_logs table created',
        logs: []
      })
    }
    
    // Get summary stats
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const recent24h = logs?.filter(l => l.created_at > last24Hours).length || 0
    const recentHour = logs?.filter(l => l.created_at > lastHour).length || 0
    const processed = logs?.filter(l => l.processed).length || 0
    const failed = logs?.filter(l => l.error).length || 0
    
    return NextResponse.json({
      success: true,
      summary: {
        total_logs: logs?.length || 0,
        last_24h: recent24h,
        last_hour: recentHour,
        processed: processed,
        failed: failed,
        latest_at: logs?.[0]?.created_at || null
      },
      logs: logs || []
    })
    
  } catch (error) {
    console.error('❌ Error checking webhook logs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}