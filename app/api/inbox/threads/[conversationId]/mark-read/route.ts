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

// POST - Mark all unread messages in a conversation/thread as read
export async function POST(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const params = await context.params
    const conversationId = params.conversationId

    console.log(`📧 Marking all unread messages as read in conversation: ${conversationId}`)

    // Update all unread messages in this conversation to read status
    const { data: updatedMessages, error } = await supabaseServer
      .from('inbox_messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .eq('status', 'unread')
      .select('id, subject, folder')

    if (error) {
      console.error('❌ Error marking messages as read:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const markedCount = updatedMessages?.length || 0
    console.log(`✅ Marked ${markedCount} messages as read`)

    // Update the thread's unread count
    if (markedCount > 0) {
      const { error: threadError } = await supabaseServer
        .from('inbox_threads')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)

      if (threadError) {
        console.error('❌ Error updating thread unread count:', threadError)
        // Don't fail the request if thread update fails
      }
    }

    // Log the action for audit trail
    if (markedCount > 0) {
      const { error: actionError } = await supabaseServer
        .from('inbox_actions')
        .insert(
          updatedMessages.map(msg => ({
            user_id: userId,
            message_id: msg.id,
            action_type: 'mark_read_thread',
            action_data: { 
              conversation_id: conversationId,
              marked_count: markedCount
            },
            status: 'completed'
          }))
        )

      if (actionError) {
        console.error('❌ Error logging actions:', actionError)
        // Don't fail the request if action logging fails
      }
    }

    return NextResponse.json({
      success: true,
      marked_count: markedCount,
      conversation_id: conversationId,
      message: markedCount > 0 
        ? `Marked ${markedCount} messages as read` 
        : 'No unread messages in this thread'
    })

  } catch (error) {
    console.error("❌ Error marking thread as read:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}