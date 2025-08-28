import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔍 Testing remove contacts behavior...')
    
    // Count contacts before
    const { count: beforeCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
    
    // Count total contacts in database  
    const { count: totalCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Before: ${beforeCount} contacts in campaign, ${totalCount} total contacts`)

    return NextResponse.json({
      success: true,
      debug: {
        campaignId: campaignId,
        contactsInCampaign: beforeCount || 0,
        totalContactsInDatabase: totalCount || 0,
        message: 'Use POST /api/debug/test-remove-contacts to simulate deletion',
        instruction: 'The fixed remove-all API will DELETE contacts completely instead of just setting campaign_id to null'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error testing remove contacts:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🧪 Simulating contact deletion behavior...')
    
    // Get contacts that would be deleted (for comparison)
    const { data: contactsToDelete, error: fetchError } = await supabase
      .from('contacts')
      .select('id, email, campaign_id')
      .eq('campaign_id', campaignId)
    
    if (fetchError) {
      console.error('Error fetching contacts:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch contacts',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log(`📋 Found ${contactsToDelete?.length || 0} contacts that would be deleted`)
    contactsToDelete?.forEach(contact => {
      console.log(`   - ${contact.email} (ID: ${contact.id})`)
    })

    return NextResponse.json({
      success: true,
      simulation: {
        campaignId: campaignId,
        contactsToDelete: contactsToDelete?.map(c => ({
          id: c.id,
          email: c.email
        })) || [],
        count: contactsToDelete?.length || 0,
        behavior: {
          old: 'Would set campaign_id to null (keep in database)',
          new: 'Will DELETE contacts completely from database'
        }
      },
      message: 'This is a simulation. Actual deletion happens via DELETE /api/campaigns/[id]/contacts/remove-all',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error simulating contact deletion:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}