import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🚀 Testing sender accounts system...')

    // Check all domains in the database
    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, domain, status, user_id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error accessing domains:', error)
      return NextResponse.json({ error: 'Failed to access domains table', details: error }, { status: 500 })
    }

    console.log('✅ Domains table accessible, found', domains?.length || 0, 'domains')

    return NextResponse.json({
      success: true,
      message: 'Sender accounts system ready for testing! 📧',
      details: {
        domainsCount: domains?.length || 0,
        domains: domains?.map(d => ({ id: d.id, domain: d.domain, status: d.status }))
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error', details: error.message }, { status: 500 })
  }
}