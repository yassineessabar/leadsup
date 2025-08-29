import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    // Check the campaign's scrapping_status field directly
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('scrapping_status')
      .eq('id', campaignId)
      .single()
    
    if (error) {
      console.error('Error fetching campaign scrapping_status:', error)
      return NextResponse.json({ isActive: false })
    }

    // Show as active only if scrapping_status is 'Active'
    const isActive = campaign?.scrapping_status === 'Active'

    return NextResponse.json({
      isActive,
      status: campaign?.scrapping_status || 'Inactive'
    })

  } catch (error) {
    console.error('Error in scraping status API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraping status' },
      { status: 500 }
    )
  }
}