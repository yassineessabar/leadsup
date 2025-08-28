import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get the first contact to see the schema
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 1561)
      .single()

    if (error) {
      console.error('Error fetching contact:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch contact',
        details: error
      }, { status: 500 })
    }

    // Get the column names
    const columnNames = contact ? Object.keys(contact) : []

    return NextResponse.json({
      success: true,
      contactId: 1561,
      columns: columnNames,
      hasNextEmailDue: columnNames.includes('next_email_due'),
      sampleData: contact,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Schema check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
