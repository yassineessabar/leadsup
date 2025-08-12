import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from auth
    const userId = 'temp-user-id' // Replace with actual auth

    const { data: domains, error } = await supabaseServer
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ domains })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, verificationType = 'manual' } = body

    // TODO: Get user ID from auth
    const userId = 'temp-user-id' // Replace with actual auth

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabaseServer
      .from('domains')
      .select('id')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists' },
        { status: 409 }
      )
    }

    // Generate DNS records
    const dnsRecords = generateDNSRecords(domain)

    // Create domain record
    const { data: newDomain, error } = await supabaseServer
      .from('domains')
      .insert({
        user_id: userId,
        domain,
        subdomain: 'reply',
        verification_type: verificationType,
        status: 'pending',
        spf_record: dnsRecords.spf,
        dkim_record: dnsRecords.dkim,
        mx_record: dnsRecords.mx,
        verification_token: generateVerificationToken()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      domain: newDomain,
      dnsRecords 
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add domain' },
      { status: 500 }
    )
  }
}

function generateDNSRecords(domain: string) {
  // Generate unique DKIM selector for this domain
  const dkimSelector = `s${Date.now()}`
  
  return {
    spf: {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:sendgrid.net ~all',
      purpose: 'Authorize SendGrid to send emails for your domain'
    },
    dkim: {
      type: 'CNAME',
      name: `${dkimSelector}._domainkey`,
      value: `${dkimSelector}.domainkey.u30435661.wl250.sendgrid.net`,
      purpose: 'Enable DKIM email signing'
    },
    mx: {
      type: 'MX',
      name: 'reply',
      value: 'mx.sendgrid.net',
      priority: 10,
      purpose: 'Route replies back to LeadsUp'
    }
  }
}

function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}