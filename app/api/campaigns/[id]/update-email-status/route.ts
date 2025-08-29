import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { contactUpdates } = await request.json()
    
    if (!contactUpdates || !Array.isArray(contactUpdates)) {
      return NextResponse.json({ error: 'contactUpdates array is required' }, { status: 400 })
    }
    
    // Update each contact's email_status
    const updates = []
    for (const update of contactUpdates) {
      const { contactId, email_status } = update
      
      const { error } = await supabase
        .from('contacts')
        .update({ email_status })
        .eq('id', contactId)
        .eq('campaign_id', params.id)
      
      if (error) {
        console.error(`Error updating contact ${contactId}:`, error)
        updates.push({ contactId, success: false, error: error.message })
      } else {
        updates.push({ contactId, success: true })
      }
    }
    
    return NextResponse.json({
      success: true,
      updated: updates.filter(u => u.success).length,
      failed: updates.filter(u => !u.success).length,
      results: updates
    })
  } catch (error) {
    console.error('Error updating email status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}