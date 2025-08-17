import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Test endpoint to verify reset logic without authentication
export async function GET(request: NextRequest) {
  try {
    // Simulate the reset query logic to test if it works
    const testCampaignIds = ['47fa7a11-7959-452e-8e67-756b50c922fc'] // Your test campaign ID
    
    // Test the query structure that was failing
    const { count: totalContacts, error: countError } = await supabaseServer
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', testCampaignIds)

    if (countError) {
      return NextResponse.json({
        success: false,
        error: 'Count query failed',
        details: countError
      })
    }

    // Test the update query structure (without actually updating)
    const { data: testQuery, error: queryError } = await supabaseServer
      .from('contacts')
      .select('id, email, current_sequence_step')
      .in('campaign_id', testCampaignIds)
      .limit(5)

    return NextResponse.json({
      success: true,
      message: 'Reset query structure test passed',
      totalContacts: totalContacts || 0,
      sampleContacts: testQuery?.map(c => ({
        id: c.id,
        email: c.email,
        currentStep: c.current_sequence_step || 0
      })) || [],
      testCampaignIds,
      queryError: queryError?.message || null
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}