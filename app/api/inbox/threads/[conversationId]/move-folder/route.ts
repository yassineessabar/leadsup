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

// PATCH - Move all messages in a conversation to a different folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const conversationId = params.conversationId
    const body = await request.json()
    const { folder } = body

    if (!folder) {
      return NextResponse.json({ success: false, error: "Folder is required" }, { status: 400 })
    }

    console.log('📧 Moving entire conversation to folder:', { conversationId, folder, userId })

    // Update ALL messages in this conversation
    const { data: updatedMessages, error } = await supabaseServer
      .from('inbox_messages')
      .update({
        folder: folder,
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('❌ Error updating conversation messages:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log(`✅ Successfully moved ${updatedMessages?.length || 0} messages in conversation to ${folder}`)

    // Also update the thread record
    const { error: threadError } = await supabaseServer
      .from('inbox_threads')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (threadError) {
      console.error('⚠️ Warning: Could not update thread record:', threadError)
      // Don't fail the request for this
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation_id: conversationId,
        folder: folder,
        updated_count: updatedMessages?.length || 0
      }
    })

  } catch (error) {
    console.error("❌ Error moving conversation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}