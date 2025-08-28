import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Creating tracking records for all contacts...')
    
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    const userId = 'a72cc86c-5fef-4ed5-b1ae-41d9cbdf6ba6'
    const sequenceId = '9fabf6b1-aeae-41c0-9736-7d309fec8ad8'
    
    // Contacts that need tracking records
    const contacts = [
      { id: '1575', email: 'crytopianconsulting@gmail.com' },
      { id: '1576', email: 'mouai.tax@gmail.com' },
      { id: '1577', email: 'ya.essabarry@gmail.com' }
    ]
    
    const results = []
    
    for (const contact of contacts) {
      const trackingRecord = {
        id: `track_${Date.now()}_${contact.id}`, // Required TEXT ID
        user_id: userId,
        campaign_id: campaignId,
        contact_id: contact.id,
        sequence_id: sequenceId,
        sequence_step: 1,
        email: contact.email, // Required field
        sg_message_id: `test_${Date.now()}_${contact.id}`,
        subject: 'Step 1 - Automation Email',
        status: 'sent',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log(`📧 Creating tracking record for ${contact.email}...`)
      const { data, error } = await supabase
        .from('email_tracking')
        .insert(trackingRecord)
        .select()
      
      if (error) {
        console.error(`❌ Failed to create tracking record for ${contact.email}:`, error)
        results.push({
          contact: contact.email,
          success: false,
          error: error.message
        })
      } else {
        console.log(`✅ Created tracking record for ${contact.email}`)
        results.push({
          contact: contact.email,
          success: true,
          record: data[0]
        })
      }
      
      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`📊 Created ${successCount}/${contacts.length} tracking records`)

    return NextResponse.json({
      success: true,
      message: `Created ${successCount}/${contacts.length} tracking records`,
      results: results,
      instructions: 'Refresh the frontend to see all sequences show as "Sent"',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error creating tracking records:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}