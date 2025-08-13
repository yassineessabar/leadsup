import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createSenderIdentity } from "@/lib/sendgrid"

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

// GET /api/domains/[id]/senders - Get all sender accounts for a domain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params

    // Verify domain ownership and that it's verified
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    if (domain.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Domain must be verified to manage senders' },
        { status: 400 }
      )
    }

    // Get all sender accounts for this domain
    const { data: senders, error: sendersError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('domain_id', domainId)
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (sendersError) {
      console.error('Error fetching senders:', sendersError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sender accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      domain: {
        id: domain.id,
        domain: domain.domain,
        status: domain.status
      },
      senders: senders || []
    })

  } catch (error) {
    console.error('Error in GET /api/domains/[id]/senders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/domains/[id]/senders - Create a new sender account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params
    const body = await request.json()
    const { email, display_name, is_default } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Verify domain ownership and that it's verified
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    if (domain.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Domain must be verified to add senders' },
        { status: 400 }
      )
    }

    // Validate that email belongs to the domain
    const emailDomain = email.split('@')[1]
    if (emailDomain !== domain.domain) {
      return NextResponse.json(
        { success: false, error: `Email must end with @${domain.domain}` },
        { status: 400 }
      )
    }

    // Check if this email already exists for this domain
    const { data: existingSender } = await supabase
      .from('sender_accounts')
      .select('id')
      .eq('domain_id', domainId)
      .eq('email', email)
      .single()

    if (existingSender) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered as a sender for this domain' },
        { status: 400 }
      )
    }

    // If this is the first sender, make it default
    const { data: existingSenders } = await supabase
      .from('sender_accounts')
      .select('id')
      .eq('domain_id', domainId)
      .limit(1)

    const shouldBeDefault = is_default || (existingSenders?.length === 0)

    // Create the sender account (never set is_default in INSERT to avoid constraint violations)
    const { data: newSender, error: createError } = await supabase
      .from('sender_accounts')
      .insert({
        domain_id: domainId,
        user_id: userId,
        email,
        display_name: display_name || email.split('@')[0],
        is_default: false  // Always start as false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating sender:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create sender account' },
        { status: 500 }
      )
    }

    // If this should be default, use the function to ensure only one default
    if (shouldBeDefault) {
      const { error: defaultError } = await supabase.rpc('set_default_sender', { 
        sender_id: newSender.id 
      })
      
      if (defaultError) {
        console.error('Error setting default sender:', defaultError)
        // Don't fail the request, just log the error
      }
    }

    // Create SendGrid Sender Identity
    let sendgridStatus = 'pending'
    let sendgridSenderId = null
    
    try {
      console.log(`🆔 Creating SendGrid sender identity for ${email}`)
      
      const senderIdentityResult = await createSenderIdentity({
        nickname: `${display_name || email.split('@')[0]} - ${domain.domain}`,
        from: {
          email: email,
          name: display_name || email.split('@')[0]
        },
        reply_to: {
          email: email,
          name: display_name || email.split('@')[0]
        },
        address: '123 Main Street', // Default address - could be made configurable
        city: 'New York',
        zip: '10001', 
        country: 'United States'
        // Note: state field removed as it causes SendGrid "bad json payload" error
      })
      
      if (senderIdentityResult.success === false && senderIdentityResult.error === 'permission_denied') {
        console.log(`⚠️ SendGrid API key lacks permissions - sender identity creation skipped for ${email}`)
        sendgridStatus = 'permission_denied'
      } else {
        sendgridSenderId = senderIdentityResult.sender_id
        sendgridStatus = senderIdentityResult.verification_status || 'pending'
        console.log(`✅ SendGrid sender identity created: ${sendgridSenderId}`)
      }
      
    } catch (sendgridError) {
      console.error(`⚠️ Failed to create SendGrid sender identity for ${email}:`, sendgridError)
      sendgridStatus = 'failed'
      // Don't fail the sender creation, just log the error
    }
    
    // Update the sender with SendGrid information
    const { error: updateError } = await supabase
      .from('sender_accounts')
      .update({
        sendgrid_sender_id: sendgridSenderId,
        sendgrid_status: sendgridStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', newSender.id)
    
    if (updateError) {
      console.error('Error updating sender with SendGrid info:', updateError)
    }

    // Return updated sender data
    const updatedSender = {
      ...newSender,
      sendgrid_sender_id: sendgridSenderId,
      sendgrid_status: sendgridStatus
    }

    return NextResponse.json({
      success: true,
      sender: updatedSender,
      message: sendgridStatus === 'failed' 
        ? 'Sender account created, but SendGrid verification failed. You can retry verification later.'
        : 'Sender account created successfully. Check your email to verify with SendGrid.'
    })

  } catch (error) {
    console.error('Error in POST /api/domains/[id]/senders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}