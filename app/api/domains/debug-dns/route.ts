import { NextRequest, NextResponse } from 'next/server'

// Copy the DNS records function for debugging
function getDefaultDnsRecords(domain: string, replySubdomain: string = 'reply') {
  // For leadsup.io, use SendGrid verified records only
  if (domain === 'leadsup.io' || domain.includes('leadsup.io')) {
    return [
      {
        type: 'CNAME',
        host: 'em7895',
        value: 'u55053564.wl065.sendgrid.net',
        purpose: 'Link tracking and email branding'
      },
      {
        type: 'CNAME',
        host: 's1._domainkey',
        value: 's1.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 1)'
      },
      {
        type: 'CNAME',
        host: 's2._domainkey',
        value: 's2.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 2)'
      },
      {
        type: 'TXT',
        host: '_dmarc',
        value: 'v=DMARC1; p=none;',
        purpose: 'DMARC policy'
      },
      {
        type: 'MX',
        host: replySubdomain,
        value: 'mx.sendgrid.net',
        priority: '10',
        purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp`
      }
    ]
  }

  // Generate default records for other domains
  const sendgridSubdomain = 'u55053564.wl065.sendgrid.net' // Use actual SendGrid account
  const emPrefix = `em${Math.floor(Math.random() * 9000) + 1000}`
  
  return [
    {
      type: 'CNAME',
      host: emPrefix,
      value: sendgridSubdomain,
      purpose: 'Link tracking and email branding'
    },
    {
      type: 'CNAME',
      host: 's1._domainkey',
      value: `s1.domainkey.${sendgridSubdomain}`,
      purpose: 'DKIM authentication (key 1)'
    },
    {
      type: 'CNAME',
      host: 's2._domainkey',
      value: `s2.domainkey.${sendgridSubdomain}`,
      purpose: 'DKIM authentication (key 2)'
    },
    {
      type: 'TXT',
      host: '@',
      value: 'v=spf1 include:sendgrid.net ~all',
      purpose: 'SPF - Authorizes SendGrid to send emails'
    },
    {
      type: 'TXT',
      host: '_dmarc',
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
      purpose: 'DMARC policy'
    },
    {
      type: 'MX',
      host: replySubdomain,
      value: 'mx.sendgrid.net',
      priority: '10',
      purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp`
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'example.com'
    const replySubdomain = searchParams.get('replySubdomain') || 'reply'
    
    console.log(`🔍 Debug DNS records for domain: ${domain}, reply: ${replySubdomain}`)
    
    const dnsRecords = getDefaultDnsRecords(domain, replySubdomain)
    
    // Find the MX record specifically
    const mxRecord = dnsRecords.find(record => record.type === 'MX')
    
    return NextResponse.json({
      success: true,
      domain,
      replySubdomain,
      replyHostname: `${replySubdomain}.${domain}`,
      totalRecords: dnsRecords.length,
      mxRecord: mxRecord || 'NOT FOUND',
      allRecords: dnsRecords,
      debug: {
        isLeadsUpDomain: domain === 'leadsup.io' || domain.includes('leadsup.io'),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Error debugging DNS records:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}