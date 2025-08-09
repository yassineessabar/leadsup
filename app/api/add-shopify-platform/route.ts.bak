import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST() {
  try {

    // First, check current constraint
    const { data: constraints } = await supabase
      .from('information_schema.check_constraints')
      .select('*')
      .eq('constraint_name', 'review_integrations_platform_name_check')

    // Try direct SQL execution
    const { data, error } = await supabase
      .from('review_integrations')
      .select('platform_name')
      .limit(1)

    if (error) {
      console.error('Table access error:', error)
      return NextResponse.json({
        success: false,
        error: 'Cannot access review_integrations table: ' + error.message
      }, { status: 500 })
    }

    // For now, return info about what needs to be done
    return NextResponse.json({
      success: false,
      error: 'Manual SQL execution required',
      message: 'Please run the following SQL in your Supabase dashboard:',
      sql: [
        'ALTER TABLE public.review_integrations DROP CONSTRAINT review_integrations_platform_name_check;',
        "ALTER TABLE public.review_integrations ADD CONSTRAINT review_integrations_platform_name_check CHECK (platform_name IN ('google', 'trustpilot', 'facebook', 'yelp', 'shopify'));"
      ]
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}