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

// GET - Fetch user's inbox folders
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { data: folders, error } = await supabaseServer
      .from('inbox_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching folders:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Get message counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const { count: messageCount } = await supabaseServer
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('folder', folder.name.toLowerCase())
          .neq('status', 'deleted')

        const { count: unreadCount } = await supabaseServer
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('folder', folder.name.toLowerCase())
          .eq('status', 'unread')

        return {
          ...folder,
          message_count: messageCount || 0,
          unread_count: unreadCount || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: foldersWithCounts
    })

  } catch (error) {
    console.error("❌ Error fetching folders:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new custom folder
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color = '#6B7280', icon = 'folder' } = body

    if (!name) {
      return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
    }

    // Get the highest sort order to append new folder at the end
    const { data: lastFolder } = await supabaseServer
      .from('inbox_folders')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextSortOrder = (lastFolder?.sort_order || 0) + 1

    const { data: folder, error } = await supabaseServer
      .from('inbox_folders')
      .insert({
        user_id: userId,
        name,
        description,
        color,
        icon,
        sort_order: nextSortOrder,
        is_system: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating folder:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ success: false, error: "A folder with this name already exists" }, { status: 400 })
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...folder,
        message_count: 0,
        unread_count: 0
      }
    })

  } catch (error) {
    console.error("❌ Error creating folder:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update folder order
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { folders } = body // Array of { id, sort_order }

    if (!folders || !Array.isArray(folders)) {
      return NextResponse.json({ success: false, error: "Invalid folders data" }, { status: 400 })
    }

    // Update each folder's sort order
    const updates = await Promise.all(
      folders.map(async ({ id, sort_order }) => {
        const { error } = await supabaseServer
          .from('inbox_folders')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)

        return { id, success: !error, error: error?.message }
      })
    )

    const errors = updates.filter(update => !update.success)

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        updated: updates.length - errors.length,
        errors: errors.length,
        details: errors
      }
    })

  } catch (error) {
    console.error("❌ Error updating folder order:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}