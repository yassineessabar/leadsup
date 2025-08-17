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

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get count before deletion
    const { count: totalLogs } = await supabaseServer
      .from('automation_logs')
      .select('*', { count: 'exact', head: true })

    // Clear all automation logs
    const { error } = await supabaseServer
      .from('automation_logs')
      .delete()
      .not('id', 'is', null) // Delete all records

    if (error) {
      console.error('Error clearing logs:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Log the cleanup action
    await supabaseServer
      .from('automation_logs')
      .insert({
        run_id: crypto.randomUUID(),
        log_type: 'system_cleanup',
        status: 'success',
        message: `🧹 System Cleanup: All automation logs cleared (${totalLogs || 0} logs removed)`,
        details: {
          clearedLogs: totalLogs || 0,
          cleanedBy: userId,
          cleanedAt: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${totalLogs || 0} automation logs`,
      clearedCount: totalLogs || 0
    })

  } catch (error) {
    console.error('Error in DELETE /api/automation/clear-logs:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}