import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('email_tracking')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        table_exists: false
      })
    }

    // If we got data, show the structure
    const structure = data.length > 0 ? Object.keys(data[0]) : []

    return NextResponse.json({
      success: true,
      table_exists: true,
      columns: structure,
      sample_data: data[0] || null,
      message: `Table has ${structure.length} columns`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check table structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}