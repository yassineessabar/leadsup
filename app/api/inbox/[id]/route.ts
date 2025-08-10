import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// GET - Fetch a specific message with conversation thread
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const params = await context.params
    const messageId = params.id

    // Fetch the message with related data
    const { data: message, error } = await supabaseServer
      .from('inbox_messages')
      .select(`
        *,
        campaign:campaigns(id, name, type, status),
        sequence:campaign_sequences(id, step_number, subject),
        contact:contacts(id, first_name, last_name, email)
      `)
      .eq('id', messageId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching message:', error)
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
    }

    // Fetch the entire conversation thread
    const { data: threadMessages, error: threadError } = await supabaseServer
      .from('inbox_messages')
      .select('*')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', userId)
      .order('sent_at', { ascending: true })

    if (threadError) {
      console.error('❌ Error fetching thread:', threadError)
      // Continue without thread if error
    }

    // Format the response
    const response = {
      message: {
        id: message.id,
        message_id: message.message_id,
        conversation_id: message.conversation_id,
        thread_id: message.thread_id,
        subject: message.subject,
        body_text: message.body_text,
        body_html: message.body_html,
        direction: message.direction,
        channel: message.channel,
        status: message.status,
        folder: message.folder,
        lead_status: message.lead_status,
        contact_name: message.contact_name,
        contact_email: message.contact_email,
        sender_email: message.sender_email,
        has_attachments: message.has_attachments,
        attachments: message.attachments,
        sent_at: message.sent_at,
        received_at: message.received_at,
        created_at: message.created_at,
        campaign: message.campaign,
        sequence: message.sequence,
        contact: message.contact
      },
      thread: threadMessages || [],
      conversation_id: message.conversation_id
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('❌ Error in inbox GET by id:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update message (mark read/unread, set lead status, move folder, etc.)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const params = await context.params
    const messageId = params.id
    const body = await request.json()

    console.log('📧 Updating inbox message:', { messageId, updates: body })

    // Prepare update data
    const updateData: any = {}
    
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    
    if (body.folder !== undefined) {
      updateData.folder = body.folder
    }
    
    if (body.lead_status !== undefined) {
      updateData.lead_status = body.lead_status
    }
    
    if (body.is_important !== undefined) {
      updateData.is_important = body.is_important
    }

    // Update the message
    const { data: message, error } = await supabaseServer
      .from('inbox_messages')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating message:', error)
      return NextResponse.json({ success: false, error: 'Failed to update message' }, { status: 500 })
    }

    // Log the action for audit trail
    const actionType = body.status ? (body.status === 'read' ? 'mark_read' : 'mark_unread') :
                     body.folder ? 'move_folder' :
                     body.lead_status ? 'set_lead_status' : 'update'

    const { error: actionError } = await supabaseServer
      .from('inbox_actions')
      .insert({
        user_id: userId,
        message_id: messageId,
        action_type: actionType,
        action_data: body,
        status: 'completed'
      })

    if (actionError) {
      console.error('❌ Error logging action:', actionError)
      // Don't fail the update if action logging fails
    }

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('❌ Error in inbox PATCH:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Soft delete message (move to trash)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const params = await context.params
    const messageId = params.id

    console.log('🗑️ Soft deleting inbox message:', messageId)

    // Soft delete by moving to trash folder and setting status to deleted
    const { data: message, error } = await supabaseServer
      .from('inbox_messages')
      .update({
        status: 'deleted',
        folder: 'trash',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error deleting message:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 })
    }

    // Log the delete action
    const { error: actionError } = await supabaseServer
      .from('inbox_actions')
      .insert({
        user_id: userId,
        message_id: messageId,
        action_type: 'delete',
        action_data: { folder: 'trash' },
        status: 'completed'
      })

    if (actionError) {
      console.error('❌ Error logging delete action:', actionError)
      // Don't fail the delete if action logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message moved to trash successfully'
    })

  } catch (error) {
    console.error('❌ Error in inbox DELETE:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}