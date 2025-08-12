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

// PUT /api/domains/[id]/senders/[senderId] - Update sender account (e.g., set as default)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; senderId: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId, senderId } = await params
    const body = await request.json()
    const { is_default, display_name } = body

    // Verify sender exists and user owns it
    const { data: sender, error: senderError } = await supabase
      .from('sender_accounts')
      .select('*, domains(domain, user_id)')
      .eq('id', senderId)
      .eq('domain_id', domainId)
      .single()

    if (senderError || !sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      )
    }

    // Verify domain ownership
    if (sender.domains.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    if (display_name !== undefined) {
      updateData.display_name = display_name
    }

    // Handle default setting using the database function
    if (is_default === true) {
      await supabase.rpc('set_default_sender', { sender_id: senderId })
    }

    // Update other fields if provided
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('sender_accounts')
        .update(updateData)
        .eq('id', senderId)

      if (updateError) {
        console.error('Error updating sender:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update sender account' },
          { status: 500 }
        )
      }
    }

    // Get updated sender data
    const { data: updatedSender, error: fetchError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('id', senderId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated sender:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated sender' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sender: updatedSender,
      message: 'Sender account updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/domains/[id]/senders/[senderId]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/domains/[id]/senders/[senderId] - Delete sender account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; senderId: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId, senderId } = await params

    // Verify sender exists and user owns it
    const { data: sender, error: senderError } = await supabase
      .from('sender_accounts')
      .select('*, domains(domain, user_id)')
      .eq('id', senderId)
      .eq('domain_id', domainId)
      .single()

    if (senderError || !sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      )
    }

    // Verify domain ownership
    if (sender.domains.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if this is the only sender (prevent deletion of the last sender)
    const { data: allSenders, error: countError } = await supabase
      .from('sender_accounts')
      .select('id')
      .eq('domain_id', domainId)

    if (countError) {
      console.error('Error counting senders:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify sender count' },
        { status: 500 }
      )
    }

    if (allSenders.length === 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the last sender account. Add another sender first.' },
        { status: 400 }
      )
    }

    // If deleting the default sender, set another one as default
    if (sender.is_default) {
      const { data: otherSender } = await supabase
        .from('sender_accounts')
        .select('id')
        .eq('domain_id', domainId)
        .neq('id', senderId)
        .limit(1)
        .single()

      if (otherSender) {
        await supabase.rpc('set_default_sender', { sender_id: otherSender.id })
      }
    }

    // Delete the sender
    const { error: deleteError } = await supabase
      .from('sender_accounts')
      .delete()
      .eq('id', senderId)

    if (deleteError) {
      console.error('Error deleting sender:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete sender account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sender account deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/domains/[id]/senders/[senderId]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}