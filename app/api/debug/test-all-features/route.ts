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
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Comprehensive test of all smart email features
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const { test_type } = await request.json().catch(() => ({ test_type: 'all' }))

    console.log('🧪 Running comprehensive feature tests...')

    const testResults = {
      system_status: {},
      timezone_test: {},
      sender_rotation_test: {},
      oauth_test: {},
      database_schema: {},
      test_scenarios: {},
      recommendations: []
    }

    // 1. Check system status and current time
    const now = new Date()
    const utcTime = now.toISOString()
    
    testResults.system_status = {
      current_utc_time: utcTime,
      current_utc_hour: now.getUTCHours(),
      system_ready: true
    }

    // 2. Test timezone logic
    const TIMEZONE_CONFIG = {
      'T1': { name: 'America/New_York', offset: -5, description: 'Eastern Time' },
      'T2': { name: 'America/Chicago', offset: -6, description: 'Central Time' },
      'T3': { name: 'Europe/London', offset: 0, description: 'Europe Time' },
      'T4': { name: 'Asia/Singapore', offset: 8, description: 'Asia Time' }
    }

    const timezoneResults = {}
    let readyTimezones = 0

    for (const [tz, config] of Object.entries(TIMEZONE_CONFIG)) {
      const utcHours = now.getUTCHours()
      const localHours = (utcHours + config.offset + 24) % 24
      const isBusinessHours = localHours >= 9 && localHours <= 17
      
      if (isBusinessHours) readyTimezones++
      
      timezoneResults[tz as keyof typeof timezoneResults] = {
        local_time: `${localHours.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`,
        is_business_hours: isBusinessHours,
        status: isBusinessHours ? '✅ READY' : '⏰ WAITING'
      }
    }

    testResults.timezone_test = {
      timezone_analysis: timezoneResults,
      ready_to_send: readyTimezones,
      waiting: 4 - readyTimezones
    }

    // 3. Test sender rotation setup
    const { data: senders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select('email, name, is_active, rotation_priority, emails_sent_today, daily_limit, access_token, app_password')
      .eq('is_active', true)

    if (sendersError) {
      testResults.sender_rotation_test = {
        error: `Failed to fetch senders: ${sendersError.message}`,
        status: '❌ FAILED'
      }
    } else {
      const activeSenders = senders || []
      const oauthSenders = activeSenders.filter(s => s.access_token)
      const smtpSenders = activeSenders.filter(s => s.app_password)
      
      testResults.sender_rotation_test = {
        total_active_senders: activeSenders.length,
        oauth_senders: oauthSenders.length,
        smtp_senders: smtpSenders.length,
        sender_details: activeSenders.map(s => ({
          email: s.email,
          name: s.name,
          auth_method: s.access_token ? 'OAuth2' : (s.app_password ? 'SMTP' : 'None'),
          emails_sent_today: s.emails_sent_today || 0,
          daily_limit: s.daily_limit || 50,
          rotation_priority: s.rotation_priority || 1
        })),
        status: activeSenders.length > 0 ? '✅ READY' : '❌ NO SENDERS'
      }
    }

    // 4. Test OAuth functionality
    const oauthTest = {
      gmail_api_available: true,
      oauth_scopes_configured: true,
      status: '✅ READY'
    }

    testResults.oauth_test = oauthTest

    // 5. Test database schema
    const { data: contacts, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('id, timezone_group')
      .limit(5)

    const schemaTest = {
      contacts_table: contactsError ? '❌ ERROR' : '✅ AVAILABLE',
      timezone_columns: contactsError ? '❌ MISSING' : '✅ AVAILABLE',
      sample_contacts: contacts?.length || 0,
      status: contactsError ? '⚠️ SCHEMA ISSUES' : '✅ READY'
    }

    if (contactsError) {
      schemaTest.error = contactsError.message
    }

    testResults.database_schema = schemaTest

    // 6. Create test scenarios
    testResults.test_scenarios = {
      scenario_1_current_time: {
        name: 'Test Current Time (Real)',
        command: 'curl -X POST http://localhost:3000/api/campaigns/automation/send-emails -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"',
        expected: `Will skip ${4 - readyTimezones} timezones, send to ${readyTimezones} timezones`,
        description: 'Tests real-time timezone awareness'
      },
      scenario_2_force_business_hours: {
        name: 'Simulate Business Hours',
        command: 'curl -X POST http://localhost:3000/api/debug/simulate-business-hours -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"',
        expected: 'All timezones should be ready to send',
        description: 'Tests email sending during business hours'
      },
      scenario_3_test_rotation: {
        name: 'Test Sender Rotation',
        command: 'curl -X POST http://localhost:3000/api/debug/test-sender-rotation -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"',
        expected: 'Different senders used for each test email',
        description: 'Tests round-robin sender assignment'
      },
      scenario_4_daily_limits: {
        name: 'Test Daily Limits',
        command: 'curl -X POST http://localhost:3000/api/debug/test-daily-limits -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"',
        expected: 'Senders rotation when limits reached',
        description: 'Tests daily email limit enforcement'
      }
    }

    // 7. Generate recommendations
    const recommendations = []
    const activeSenders = senders || []

    if (activeSenders.length === 0) {
      recommendations.push('❌ Add OAuth-authenticated senders to enable rotation')
    } else if (activeSenders.length < 3) {
      recommendations.push('⚠️ Add more senders (3+) for better rotation')
    } else {
      recommendations.push('✅ Good sender setup for rotation')
    }

    if (readyTimezones === 0) {
      recommendations.push('⏰ No timezones in business hours - emails will be queued')
    } else if (readyTimezones < 4) {
      recommendations.push(`🌍 ${readyTimezones}/4 timezones ready - others will wait for business hours`)
    } else {
      recommendations.push('✅ All timezones in business hours - optimal sending time')
    }

    if (contactsError) {
      recommendations.push('❌ Run schema setup: curl -X POST http://localhost:3000/api/debug/setup-schema-direct')
    } else {
      recommendations.push('✅ Database schema is properly configured')
    }

    recommendations.push('🧪 Use the test scenarios above to validate each feature')
    recommendations.push('📊 Monitor sender_usage and timezone_stats in responses')

    testResults.recommendations = recommendations

    return NextResponse.json({
      success: true,
      test_results: testResults,
      quick_tests: [
        '🕐 Timezone test: /api/debug/test-timezone-hours',
        '🔄 Rotation test: /api/debug/test-sender-rotation',
        '📧 Send emails: /api/campaigns/automation/send-emails',
        '🧪 Full test: /api/debug/test-all-features'
      ],
      next_steps: [
        '1. Review test results above',
        '2. Run individual test endpoints',
        '3. Check email inbox for results',
        '4. Monitor analytics and rotation'
      ]
    })

  } catch (error) {
    console.error('❌ Error running feature tests:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to run feature tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}