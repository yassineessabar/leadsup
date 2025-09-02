import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import { createSenderIdentity, configureInboundParse, getSenderIdentities } from "@/lib/sendgrid"

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

// POST - Setup sender identity and inbound parse
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { senderEmail, senderName, address, city, state, zip, country } = body

    if (!senderEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "Sender email is required" 
      }, { status: 400 })
    }

    console.log(`🔧 Setting up SendGrid configuration for ${senderEmail}`)

    const results = {
      senderIdentity: null,
      inboundParse: null,
      errors: []
    }

    // 1. Check if sender identity already exists
    try {
      const identitiesResult = await getSenderIdentities()
      const existingIdentity = identitiesResult.senders.find((s: any) => s.from_email === senderEmail)
      
      if (existingIdentity) {
        console.log(`✅ Sender identity already exists for ${senderEmail}`)
        results.senderIdentity = {
          success: true,
          message: 'Sender identity already exists',
          status: existingIdentity.verified ? 'verified' : 'pending'
        }
      } else {
        // Create new sender identity
        console.log(`🆔 Creating sender identity for ${senderEmail}`)
        
        const identityResult = await createSenderIdentity({
          nickname: `LeadsUp - ${senderEmail}`,
          from: {
            email: senderEmail,
            name: senderName || senderEmail.split('@')[0]
          },
          reply_to: {
            email: senderEmail,
            name: senderName || senderEmail.split('@')[0]
          },
          address: address || "123 Business St",
          city: city || "Business City",
          state: state || "CA", 
          zip: zip || "12345",
          country: country || "United States"
        })
        
        results.senderIdentity = identityResult
        console.log(`✅ Sender identity setup result:`, identityResult)
      }
    } catch (identityError) {
      console.error(`❌ Sender identity setup failed:`, identityError)
      results.errors.push(`Sender identity: ${identityError.message}`)
      results.senderIdentity = {
        success: false,
        error: identityError.message
      }
    }

    // 2. Setup inbound parse webhook
    try {
      const senderDomain = senderEmail.split('@')[1]
      const inboundParseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsup.io'}/api/webhooks/sendgrid`
      
      console.log(`🔧 Setting up inbound parse for ${senderDomain}`)
      
      const parseResult = await configureInboundParse({
        hostname: senderDomain,
        url: inboundParseUrl,
        spam_check: true,
        send_raw: false
      })
      
      results.inboundParse = parseResult
      console.log(`✅ Inbound parse setup result:`, parseResult)
      
    } catch (parseError) {
      console.error(`❌ Inbound parse setup failed:`, parseError)
      results.errors.push(`Inbound parse: ${parseError.message}`)
      results.inboundParse = {
        success: false,
        error: parseError.message
      }
    }

    // Return comprehensive results
    const overallSuccess = results.senderIdentity?.success !== false && results.inboundParse?.success !== false
    
    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? 'SendGrid setup completed successfully' : 'SendGrid setup completed with some errors',
      results,
      instructions: {
        senderIdentity: results.senderIdentity?.success === false 
          ? 'Please manually create sender identity in SendGrid dashboard: https://app.sendgrid.com/settings/sender_auth'
          : results.senderIdentity?.verification_status === 'pending'
          ? 'Check your email for verification link or authenticate your domain'
          : 'Sender identity is ready',
        inboundParse: results.inboundParse?.success === false
          ? 'Please manually configure inbound parse in SendGrid dashboard'
          : 'Inbound parse webhook is configured'
      }
    })

  } catch (error) {
    console.error("❌ Error in SendGrid setup API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}