import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking domain configuration for leadsup.io')
    
    // Check for leadsup.io domain configuration
    const { data: domainConfigs, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('domain', 'leadsup.io')
    
    console.log('Domain query result:', { domainConfigs, domainError })
    
    const domainConfig = domainConfigs && domainConfigs.length > 0 ? domainConfigs[0] : null
    
    return NextResponse.json({
      success: true,
      domain: 'leadsup.io',
      configs: domainConfigs,
      count: domainConfigs?.length || 0,
      primary_config: domainConfig,
      error: domainError,
      has_reply_to: !!domainConfig?.reply_to_email,
      current_reply_to: domainConfig?.reply_to_email || 'Not set',
      recommended_reply_to: 'reply@reply.leadsup.io'
    })
    
  } catch (error) {
    console.error('❌ Domain check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}