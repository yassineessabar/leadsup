import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding missing SendGrid columns to database...')

    // List of columns to add to campaign_metrics
    const columnsToAdd = [
      { name: 'bounces', type: 'INTEGER DEFAULT 0' },
      { name: 'blocks', type: 'INTEGER DEFAULT 0' },
      { name: 'total_opens', type: 'INTEGER DEFAULT 0' },
      { name: 'total_clicks', type: 'INTEGER DEFAULT 0' },
      { name: 'spam_reports', type: 'INTEGER DEFAULT 0' },
      { name: 'bounce_rate', type: 'DECIMAL(5,2) DEFAULT 0' }
    ]

    const results = []

    for (const column of columnsToAdd) {
      try {
        // Check if column exists
        const { data: columnExists } = await supabase.rpc('sql', {
          query: `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaign_metrics' 
            AND column_name = '${column.name}'
          `
        })

        if (!columnExists || columnExists.length === 0) {
          // Add the column
          const { error } = await supabase.rpc('sql', {
            query: `ALTER TABLE campaign_metrics ADD COLUMN ${column.name} ${column.type};`
          })

          if (error) {
            console.error(`❌ Error adding column ${column.name}:`, error)
            results.push({ column: column.name, status: 'error', error: error.message })
          } else {
            console.log(`✅ Added column: ${column.name}`)
            results.push({ column: column.name, status: 'added' })
          }
        } else {
          console.log(`ℹ️ Column ${column.name} already exists`)
          results.push({ column: column.name, status: 'exists' })
        }
      } catch (error: any) {
        console.error(`❌ Error processing column ${column.name}:`, error)
        results.push({ column: column.name, status: 'error', error: error.message })
      }
    }

    // Try to refresh the schema cache
    try {
      await supabase.rpc('sql', { query: 'NOTIFY pgrst, \'reload schema\';' })
      console.log('🔄 Schema cache refresh requested')
    } catch (error) {
      console.warn('⚠️ Could not refresh schema cache:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'SendGrid columns update completed',
      results,
      summary: {
        added: results.filter(r => r.status === 'added').length,
        existing: results.filter(r => r.status === 'exists').length,
        errors: results.filter(r => r.status === 'error').length
      }
    })

  } catch (error: any) {
    console.error('❌ Error adding SendGrid columns:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add SendGrid columns',
      details: error
    }, { 
      status: 500 
    })
  }
}