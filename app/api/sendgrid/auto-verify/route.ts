import { NextRequest, NextResponse } from 'next/server'
import { autoVerifyUnverifiedSenders, autoVerifyDomainSenders } from '@/lib/auto-verify-senders'

// POST /api/sendgrid/auto-verify - Auto-verify all unverified senders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { domain } = body
    
    let result
    
    if (domain) {
      console.log(`🎯 Auto-verifying senders for domain: ${domain}`)
      result = await autoVerifyDomainSenders(domain)
    } else {
      console.log('🔄 Auto-verifying all unverified senders')
      result = await autoVerifyUnverifiedSenders()
    }
    
    if (result.success) {
      const message = domain 
        ? `Auto-verified ${result.processed}/${result.total} senders for ${domain}`
        : `Auto-verified ${result.processed}/${result.total} senders`
      
      return NextResponse.json({
        success: true,
        message,
        processed: result.processed,
        total: result.total,
        domain: result.domain || null
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        processed: result.processed
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Auto-verification API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to auto-verify senders',
      details: error.message
    }, { status: 500 })
  }
}

// GET /api/sendgrid/auto-verify - Check status of unverified senders
export async function GET() {
  try {
    const { getSenderIdentities } = await import('@/lib/sendgrid')
    const { senders } = await getSenderIdentities()
    
    if (!senders) {
      return NextResponse.json({
        success: true,
        total: 0,
        verified: 0,
        unverified: 0,
        senders: []
      })
    }
    
    const verified = senders.filter(s => s.verified)
    const unverified = senders.filter(s => !s.verified)
    
    // Group by domain
    const domainStats = {}
    senders.forEach(sender => {
      const domain = sender.from_email.split('@')[1]
      if (!domainStats[domain]) {
        domainStats[domain] = { total: 0, verified: 0, unverified: 0 }
      }
      domainStats[domain].total++
      if (sender.verified) {
        domainStats[domain].verified++
      } else {
        domainStats[domain].unverified++
      }
    })
    
    return NextResponse.json({
      success: true,
      total: senders.length,
      verified: verified.length,
      unverified: unverified.length,
      domains: domainStats,
      unverifiedSenders: unverified.map(s => ({
        id: s.id,
        email: s.from_email,
        domain: s.from_email.split('@')[1],
        nickname: s.nickname
      }))
    })
    
  } catch (error) {
    console.error('❌ Error checking sender status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check sender status',
      details: error.message
    }, { status: 500 })
  }
}