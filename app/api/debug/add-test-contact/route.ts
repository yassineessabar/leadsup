import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Adding test contact for automation workflow')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    const testEmail = 'essabar.yassine@gmail.com'
    
    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', testEmail)
      .eq('campaign_id', campaignId)
      .single()
    
    if (existing) {
      // Update existing contact to be ready for next email
      const { data: updated, error: updateError } = await supabase
        .from('contacts')
        .update({
          location: 'Australia',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update existing contact',
          details: updateError
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        action: 'updated',
        contact: updated,
        message: 'Test contact updated and ready for automation'
      })
    } else {
      // Create new contact
      const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert({
          email: testEmail,
          first_name: 'Yassine',
          last_name: 'Essabar',
          campaign_id: campaignId,
          location: 'Australia',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (insertError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create contact',
          details: insertError
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        action: 'created',
        contact: newContact,
        message: 'Test contact created and ready for automation'
      })
    }
    
  } catch (error) {
    console.error('❌ Add test contact error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}