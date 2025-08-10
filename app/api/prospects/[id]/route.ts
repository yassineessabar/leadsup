import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params

    console.log(`🔄 Updating prospect ${id} with data:`, body)

    // First check if the prospect exists
    const { data: existingProspect, error: checkError } = await supabase
      .from('prospects')
      .select('id, first_name, last_name, campaign_id')
      .eq('id', id)
      .single()

    if (checkError) {
      console.error('❌ Prospect not found:', checkError)
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    console.log(`📋 Existing prospect before update:`, existingProspect)

    const { data: prospect, error } = await supabase
      .from('prospects')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating prospect:', error)
      return NextResponse.json({ error: 'Failed to update prospect', details: error.message }, { status: 500 })
    }

    console.log(`✅ Successfully updated prospect ${id}:`, {
      id: prospect.id,
      name: `${prospect.first_name} ${prospect.last_name}`,
      old_campaign_id: existingProspect.campaign_id,
      new_campaign_id: prospect.campaign_id,
      updated_fields: Object.keys(body)
    })

    return NextResponse.json({ prospect })
  } catch (error) {
    console.error('❌ Error in prospects PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting prospect:', error)
      return NextResponse.json({ error: 'Failed to delete prospect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in prospects DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}