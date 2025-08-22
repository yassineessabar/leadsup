import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing webhook_logs table directly...')
    
    // Try to insert a test log entry
    const testEntry = {
      webhook_type: 'test',
      from_email: 'test@example.com',
      to_email: 'reply@reply.leadsup.io',
      subject: 'Test webhook_logs table',
      raw_data: {
        test: true,
        timestamp: new Date().toISOString()
      },
      received_at: new Date().toISOString()
    }
    
    console.log('📝 Attempting to insert test entry:', testEntry)
    
    const { data, error } = await supabase
      .from('webhook_logs')
      .insert(testEntry)
      .select()
    
    if (error) {
      console.error('❌ Insert error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert into webhook_logs',
        details: error,
        attempted_insert: testEntry
      })
    }
    
    console.log('✅ Successfully inserted:', data)
    
    // Now try to read it back
    const { data: readData, error: readError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_type', 'test')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (readError) {
      console.error('❌ Read error:', readError)
      return NextResponse.json({
        success: false,
        error: 'Failed to read from webhook_logs',
        details: readError,
        inserted_data: data
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'webhook_logs table is working',
      inserted: data,
      read_back: readData,
      count: readData?.length || 0
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
  try {
    // Check table structure and recent entries
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to query webhook_logs',
        details: error
      })
    }
    
    return NextResponse.json({
      success: true,
      total_entries: data?.length || 0,
      recent_entries: data || [],
      table_exists: true
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}