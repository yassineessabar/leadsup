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

// POST - Perform inbox actions (reply, forward, archive, etc.)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { action, message_id, message_ids = [], data = {} } = body

    console.log('📧 Inbox action requested:', { action, message_id, message_ids, data })

    // Handle batch actions
    const targetMessages = message_id ? [message_id] : message_ids

    if (!targetMessages.length) {
      return NextResponse.json({ success: false, error: "No messages specified" }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const msgId of targetMessages) {
      try {
        const result = await performAction(userId, msgId, action, data)
        results.push(result)
      } catch (error) {
        console.error(`❌ Error performing action ${action} on message ${msgId}:`, error)
        errors.push({ message_id: msgId, error: error.message })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors
      }
    })

  } catch (error) {
    console.error("❌ Error in inbox actions:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to perform individual actions
async function performAction(userId: string, messageId: string, action: string, data: any) {
  switch (action) {
    case 'reply':
      return await handleReply(userId, messageId, data)
    case 'forward':
      return await handleForward(userId, messageId, data)
    case 'archive':
      return await handleArchive(userId, messageId)
    case 'mark_read':
      return await handleMarkRead(userId, messageId, true)
    case 'mark_unread':
      return await handleMarkRead(userId, messageId, false)
    case 'move_folder':
      return await handleMoveFolder(userId, messageId, data.folder)
    case 'set_lead_status':
      return await handleSetLeadStatus(userId, messageId, data.lead_status)
    case 'set_important':
      return await handleSetImportant(userId, messageId, data.important)
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// Action handlers
async function handleReply(userId: string, messageId: string, data: any) {
  const { subject, body, to_email } = data

  // Get original message for context
  const { data: originalMessage, error: fetchError } = await supabaseServer
    .from('inbox_messages')
    .select('*')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !originalMessage) {
    throw new Error('Original message not found')
  }

  // Get the user's sender email
  const { data: senderAccount } = await supabaseServer
    .from('sender_accounts')
    .select('email')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single()
  
  const senderEmail = senderAccount?.email || originalMessage.sender_email || 'noreply@leadsup.io'

  // Create new outbound message with pending status (will be updated after sending)
  const { data: replyMessage, error: createError } = await supabaseServer
    .from('inbox_messages')
    .insert({
      user_id: userId,
      message_id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: originalMessage.conversation_id,
      campaign_id: originalMessage.campaign_id,
      sequence_id: originalMessage.sequence_id,
      contact_email: to_email || originalMessage.contact_email,
      contact_name: originalMessage.contact_name,
      sender_id: originalMessage.sender_id,
      sender_email: senderEmail,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      body_text: body,
      body_html: body.replace(/\n/g, '<br>'), // Convert newlines to HTML breaks
      direction: 'outbound',
      channel: originalMessage.channel,
      status: 'read', // Outbound messages are marked as read by default
      folder: 'sent',
      provider: originalMessage.provider,
      sent_at: new Date().toISOString(),
      in_reply_to: originalMessage.message_id
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create reply: ${createError.message}`)
  }

  // Update the thread's last message info
  await supabaseServer
    .from('inbox_threads')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.substring(0, 100),
      updated_at: new Date().toISOString()
    })
    .eq('conversation_id', originalMessage.conversation_id)
    .eq('user_id', userId)

  // Log the reply action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'reply',
      action_data: { reply_id: replyMessage.id, subject, body, to_email: to_email || originalMessage.contact_email },
      status: 'completed'
    })

  return { action: 'reply', message_id: messageId, reply_id: replyMessage.id }
}

async function handleForward(userId: string, messageId: string, data: any) {
  const { to_email, subject, body } = data

  // Get original message
  const { data: originalMessage, error: fetchError } = await supabaseServer
    .from('inbox_messages')
    .select('*')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !originalMessage) {
    throw new Error('Original message not found')
  }

  // Create forwarded message
  const { data: forwardMessage, error: createError } = await supabaseServer
    .from('inbox_messages')
    .insert({
      user_id: userId,
      message_id: `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: `fwd_${originalMessage.conversation_id}`,
      campaign_id: originalMessage.campaign_id,
      contact_email: to_email,
      sender_id: originalMessage.sender_id,
      sender_email: originalMessage.sender_email,
      subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`,
      body_text: body,
      direction: 'outbound',
      channel: originalMessage.channel,
      status: 'read',
      folder: 'sent',
      provider: originalMessage.provider,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create forward: ${createError.message}`)
  }

  // Log the forward action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'forward',
      action_data: { forward_id: forwardMessage.id, to_email, subject, body },
      status: 'completed'
    })

  return { action: 'forward', message_id: messageId, forward_id: forwardMessage.id }
}

async function handleArchive(userId: string, messageId: string) {
  const { data: message, error } = await supabaseServer
    .from('inbox_messages')
    .update({
      folder: 'archived',
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to archive message: ${error.message}`)
  }

  // Log the archive action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'archive',
      action_data: { folder: 'archived' },
      status: 'completed'
    })

  return { action: 'archive', message_id: messageId }
}

async function handleMarkRead(userId: string, messageId: string, isRead: boolean) {
  const { data: message, error } = await supabaseServer
    .from('inbox_messages')
    .update({
      status: isRead ? 'read' : 'unread',
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to mark message as ${isRead ? 'read' : 'unread'}: ${error.message}`)
  }

  // Log the action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: isRead ? 'mark_read' : 'mark_unread',
      action_data: { status: isRead ? 'read' : 'unread' },
      status: 'completed'
    })

  return { action: isRead ? 'mark_read' : 'mark_unread', message_id: messageId }
}

async function handleMoveFolder(userId: string, messageId: string, folder: string) {
  const { data: message, error } = await supabaseServer
    .from('inbox_messages')
    .update({
      folder: folder,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to move message to ${folder}: ${error.message}`)
  }

  // Log the action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'move_folder',
      action_data: { folder },
      status: 'completed'
    })

  return { action: 'move_folder', message_id: messageId, folder }
}

async function handleSetLeadStatus(userId: string, messageId: string, leadStatus: string) {
  const { data: message, error } = await supabaseServer
    .from('inbox_messages')
    .update({
      lead_status: leadStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to set lead status: ${error.message}`)
  }

  // Also update the thread lead status
  await supabaseServer
    .from('inbox_threads')
    .update({
      lead_status: leadStatus,
      updated_at: new Date().toISOString()
    })
    .eq('conversation_id', message.conversation_id)
    .eq('user_id', userId)

  // Log the action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'set_lead_status',
      action_data: { lead_status: leadStatus },
      status: 'completed'
    })

  return { action: 'set_lead_status', message_id: messageId, lead_status: leadStatus }
}

async function handleSetImportant(userId: string, messageId: string, important: boolean) {
  const { data: message, error } = await supabaseServer
    .from('inbox_messages')
    .update({
      is_important: important,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to set important flag: ${error.message}`)
  }

  // Log the action
  await supabaseServer
    .from('inbox_actions')
    .insert({
      user_id: userId,
      message_id: messageId,
      action_type: 'set_important',
      action_data: { important },
      status: 'completed'
    })

  return { action: 'set_important', message_id: messageId, important }
}