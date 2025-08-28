import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Running migration to add sequence_step column...')
    
    // Check if sequence_step column already exists
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'contacts')
      .eq('column_name', 'sequence_step')
    
    if (schemaError) {
      return NextResponse.json({
        success: false,
        error: `Schema check failed: ${schemaError.message}`
      }, { status: 500 })
    }
    
    const columnExists = columns && columns.length > 0
    
    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: 'sequence_step column already exists in contacts table'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'sequence_step column does not exist - manual database migration required'
      }, { status: 500 })
    }
    
    if (alterError) {
      console.error('Migration error:', alterError)
      return NextResponse.json({
        success: false,
        error: alterError.message
      }, { status: 500 })
    }
    
    console.log('✅ Migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed: added sequence_step and last_contacted_at columns to contacts table'
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}