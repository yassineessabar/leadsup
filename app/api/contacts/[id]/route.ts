import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const contactId = params.id

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (error) {
      console.error('Error fetching contact:', error)
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in contact GET by id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const contactId = params.id
    const body = await request.json()

    // Update contact fields
    const updateData: any = {}
    
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.email !== undefined) updateData.email = body.email
    if (body.email_status !== undefined) updateData.email_status = body.email_status
    if (body.privacy !== undefined) updateData.privacy = body.privacy
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.linkedin !== undefined) updateData.linkedin = body.linkedin
    if (body.title !== undefined) updateData.title = body.title
    if (body.location !== undefined) updateData.location = body.location
    if (body.company !== undefined) updateData.company = body.company
    if (body.industry !== undefined) updateData.industry = body.industry
    if (body.note !== undefined) updateData.note = body.note

    updateData.updated_at = new Date().toISOString()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      // If table doesn't exist, return success anyway for demo
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ 
          contact: { id: contactId, ...updateData },
          message: 'Contact updated (demo mode)' 
        })
      }
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in contact PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const contactId = params.id

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting contact:', error)
      // If table doesn't exist, return success anyway for demo
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ message: 'Contact deleted (demo mode)' })
      }
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Error in contact DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}