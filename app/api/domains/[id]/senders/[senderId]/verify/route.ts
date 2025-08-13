import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { resendSenderIdentityVerification, getSenderIdentities } from "@/lib/sendgrid"

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

// POST /api/domains/[id]/senders/[senderId]/verify - Resend verification email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, senderId: string }> }
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

    // Verify sender ownership
    const { data: sender, error: senderError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('id', senderId)
      .eq('domain_id', domainId)
      .eq('user_id', userId)
      .single()

    if (senderError || !sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      )
    }

    if (!sender.sendgrid_sender_id) {
      return NextResponse.json(
        { success: false, error: 'No SendGrid sender identity found' },
        { status: 400 }
      )
    }

    // Resend verification email
    try {
      await resendSenderIdentityVerification(sender.sendgrid_sender_id)
      
      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully'
      })
      
    } catch (sendgridError) {
      console.error('SendGrid verification resend error:', sendgridError)
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in POST /api/domains/[id]/senders/[senderId]/verify:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/domains/[id]/senders/[senderId]/verify - Check verification status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, senderId: string }> }
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

    // Verify sender ownership
    const { data: sender, error: senderError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('id', senderId)
      .eq('domain_id', domainId)
      .eq('user_id', userId)
      .single()

    if (senderError || !sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      )
    }

    if (!sender.sendgrid_sender_id) {
      return NextResponse.json(
        { success: false, error: 'No SendGrid sender identity found' },
        { status: 400 }
      )
    }

    // Get current verification status from SendGrid
    try {
      const { senders } = await getSenderIdentities()
      const sendgridSender = senders.find((s: any) => s.id.toString() === sender.sendgrid_sender_id)
      
      if (sendgridSender) {
        const newStatus = sendgridSender.verified_status
        
        // Update our database if status changed
        if (newStatus !== sender.sendgrid_status) {
          await supabase
            .from('sender_accounts')
            .update({
              sendgrid_status: newStatus,
              sendgrid_verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', senderId)
        }
        
        return NextResponse.json({
          success: true,
          verification_status: newStatus,
          verified: newStatus === 'verified',
          sender_identity: sendgridSender
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'Sender identity not found in SendGrid' },
          { status: 404 }
        )
      }
      
    } catch (sendgridError) {
      console.error('SendGrid status check error:', sendgridError)
      return NextResponse.json(
        { success: false, error: 'Failed to check verification status' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in GET /api/domains/[id]/senders/[senderId]/verify:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}