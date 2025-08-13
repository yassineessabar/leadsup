import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking campaign_senders table structure...')

    // Check if table exists and get a sample record
    const { data: sampleData, error: sampleError } = await supabase
      .from('campaign_senders')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('❌ Error checking campaign_senders table:', sampleError)
      return NextResponse.json({
        success: false,
        error: sampleError.message,
        tableExists: false
      })
    }

    console.log('✅ Sample campaign_senders data:', sampleData)

    // Try to get table structure information
    const { data: allData, error: allError } = await supabase
      .from('campaign_senders')
      .select('*')
      .limit(5)

    if (allError) {
      console.error('❌ Error fetching all campaign_senders data:', allError)
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      sampleRecord: sampleData?.[0] || null,
      totalRecords: allData?.length || 0,
      allRecords: allData || [],
      columns: sampleData?.[0] ? Object.keys(sampleData[0]) : []
    })

  } catch (error) {
    console.error('❌ Error in check-campaign-senders-table:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}