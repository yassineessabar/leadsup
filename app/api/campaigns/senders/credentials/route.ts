import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    // Check against environment variables
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Get n8n credential ID for a specific sender email
export async function POST(request: NextRequest) {
  // Validate authentication
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm=\"n8n API\"'
        }
      }
    )
  }

  try {
    const body = await request.json()
    const { sender_email } = body

    if (!sender_email) {
      return NextResponse.json(
        { success: false, error: 'sender_email is required' },
        { status: 400 }
      )
    }

    console.log(`🔐 Looking up n8n credential for: ${sender_email}`)

    // Look up the n8n credential ID for this sender email
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        n8n_credential_id,
        n8n_credential_name
      `)
      .eq('email', sender_email)
      .eq('is_active', true)
      .single()

    if (senderError || !senderData) {
      console.log(`❌ No active sender found for: ${sender_email}`)
      return NextResponse.json({
        success: false,
        error: `No active sender found for ${sender_email}`
      })
    }

    if (!senderData.n8n_credential_id) {
      console.log(`❌ No n8n credential configured for: ${sender_email}`)
      return NextResponse.json({
        success: false,
        error: `No n8n OAuth credential configured for ${sender_email}`
      })
    }

    console.log(`✅ Found credential for ${sender_email}: ${senderData.n8n_credential_id}`)

    return NextResponse.json({
      success: true,
      sender_email: sender_email,
      credential_id: senderData.n8n_credential_id,
      credential_name: senderData.n8n_credential_name || `Gmail ${sender_email}`,
      sender_name: senderData.name
    })

  } catch (error) {
    console.error('❌ Error in credentials lookup:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List all sender credentials (for debugging)
export async function GET(request: NextRequest) {
  // Validate authentication
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm=\"n8n API\"'
        }
      }
    )
  }

  try {
    console.log('📋 Listing all sender credentials...')

    const { data: sendersData, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        is_active,
        n8n_credential_id,
        n8n_credential_name
      `)
      .order('email')

    if (sendersError) {
      console.error('❌ Error fetching senders:', sendersError)
      return NextResponse.json(
        { success: false, error: sendersError.message },
        { status: 500 }
      )
    }

    const credentialMapping = sendersData?.map(sender => ({
      email: sender.email,
      name: sender.name,
      is_active: sender.is_active,
      has_credential: !!sender.n8n_credential_id,
      credential_id: sender.n8n_credential_id,
      credential_name: sender.n8n_credential_name
    })) || []

    console.log('📋 Credential mapping:', credentialMapping)

    return NextResponse.json({
      success: true,
      senders: credentialMapping,
      total: credentialMapping.length,
      with_credentials: credentialMapping.filter(s => s.has_credential).length
    })

  } catch (error) {
    console.error('❌ Error listing credentials:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}