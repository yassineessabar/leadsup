import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    // Query user_sessions table to get user_id
    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const domainId = params.id

    // First check if the domain belongs to the user
    const { data: domain, error: fetchError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json(
        { success: false, error: "Domain not found or unauthorized" },
        { status: 404 }
      )
    }

    // Delete all related sender accounts first (cascade should handle this, but being explicit)
    await supabase
      .from('sender_accounts')
      .delete()
      .eq('domain_id', domainId)

    // Delete the domain
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting domain:', deleteError)
      return NextResponse.json(
        { success: false, error: "Failed to delete domain" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Domain deleted successfully"
    })

  } catch (error) {
    console.error('Error in DELETE /api/domains/[id]:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch a single domain
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const domainId = params.id

    const { data: domain, error } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (error || !domain) {
      return NextResponse.json(
        { success: false, error: "Domain not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      domain
    })

  } catch (error) {
    console.error('Error in GET /api/domains/[id]:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}