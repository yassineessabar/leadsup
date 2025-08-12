import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Testing domain creation without auth...')

    // Try to create a test domain to see what error we get
    const { data: newDomain, error } = await supabase
      .from('domains')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
        domain: 'test.com',
        status: 'pending',
        description: 'Test domain',
        verification_type: 'manual',
        is_test_domain: true
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Domain created successfully (this was just a test)',
      domain: newDomain
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Unexpected error: ' + error.message },
      { status: 500 }
    )
  }
}