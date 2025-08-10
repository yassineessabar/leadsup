import { type NextRequest, NextResponse } from "next/server"

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

// POST - Simulate business hours for testing
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const { timezone_to_test, simulate_time } = await request.json().catch(() => ({}))

    console.log('🕐 Simulating business hours for testing...')

    const TIMEZONE_CONFIG = {
      'T1': { name: 'America/New_York', offset: -5, description: 'Eastern Time' },
      'T2': { name: 'America/Chicago', offset: -6, description: 'Central Time' },
      'T3': { name: 'Europe/London', offset: 0, description: 'Europe Time' },
      'T4': { name: 'Asia/Singapore', offset: 8, description: 'Asia Time' }
    }

    // Function to check if a given UTC hour would be business hours for a timezone
    function isBusinessHoursAtUTC(utcHour: number, timezoneGroup: string): boolean {
      const config = TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG]
      if (!config) return false

      const localHours = (utcHour + config.offset + 24) % 24
      return localHours >= 9 && localHours <= 17
    }

    const now = new Date()
    const currentUTC = now.getUTCHours()
    
    // Find UTC hours that would be business hours for all timezones
    const businessHourWindows = []
    
    for (let utcHour = 0; utcHour < 24; utcHour++) {
      const timezoneStatus = {}
      let allInBusinessHours = true
      
      for (const [tz, config] of Object.entries(TIMEZONE_CONFIG)) {
        const localHours = (utcHour + config.offset + 24) % 24
        const isBusinessHours = localHours >= 9 && localHours <= 17
        
        timezoneStatus[tz as keyof typeof timezoneStatus] = {
          local_time: `${localHours.toString().padStart(2, '0')}:00`,
          is_business_hours: isBusinessHours
        }
        
        if (!isBusinessHours) allInBusinessHours = false
      }
      
      if (allInBusinessHours) {
        businessHourWindows.push({
          utc_hour: utcHour,
          utc_time: `${utcHour.toString().padStart(2, '0')}:00`,
          timezone_status: timezoneStatus
        })
      }
    }

    // Current status
    const currentStatus = {}
    for (const [tz, config] of Object.entries(TIMEZONE_CONFIG)) {
      const localHours = (currentUTC + config.offset + 24) % 24
      const isBusinessHours = localHours >= 9 && localHours <= 17
      
      currentStatus[tz as keyof typeof currentStatus] = {
        local_time: `${localHours.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`,
        is_business_hours: isBusinessHours,
        status: isBusinessHours ? '✅ READY' : '⏰ WAITING'
      }
    }

    // Simulate sending emails with different UTC times
    const simulationResults = []
    const testTimes = simulate_time ? [simulate_time] : [9, 13, 17, 21] // Test different UTC hours

    for (const testUTC of testTimes) {
      const simResult = {
        test_utc_hour: testUTC,
        test_utc_time: `${testUTC.toString().padStart(2, '0')}:00`,
        timezone_results: {} as Record<string, any>,
        ready_count: 0,
        would_send_emails: false
      }

      for (const [tz, config] of Object.entries(TIMEZONE_CONFIG)) {
        const localHours = (testUTC + config.offset + 24) % 24
        const isBusinessHours = localHours >= 9 && localHours <= 17
        
        if (isBusinessHours) simResult.ready_count++
        
        simResult.timezone_results[tz] = {
          local_time: `${localHours.toString().padStart(2, '0')}:00`,
          is_business_hours: isBusinessHours,
          status: isBusinessHours ? '✅ SEND' : '⏰ WAIT'
        }
      }
      
      simResult.would_send_emails = simResult.ready_count > 0
      simulationResults.push(simResult)
    }

    return NextResponse.json({
      success: true,
      current_utc_time: `${currentUTC.toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`,
      current_status: currentStatus,
      business_hour_windows: {
        count: businessHourWindows.length,
        optimal_utc_hours: businessHourWindows.map(w => w.utc_time),
        details: businessHourWindows
      },
      simulation_results: simulationResults,
      testing_recommendations: [
        {
          scenario: 'Test All Timezones Ready',
          utc_hours: businessHourWindows.map(w => w.utc_hour),
          command: 'Temporarily modify system time or wait for optimal hours',
          expected: 'All timezone groups should send emails'
        },
        {
          scenario: 'Test Mixed Timezones',
          utc_hours: [6, 14, 22], // Some ready, some not
          command: 'Test at these UTC hours',
          expected: 'Only some timezone groups should send'
        },
        {
          scenario: 'Test No Timezones Ready',
          utc_hours: [3, 4, 5], // All sleeping
          command: 'Test at these UTC hours',
          expected: 'All emails should be skipped for timezone'
        }
      ],
      live_test_command: `curl -X POST http://localhost:3000/api/campaigns/automation/send-emails -H "Authorization: Basic $(echo -n 'admin:password' | base64)"`,
      explanation: [
        '🌍 The system checks if each timezone group is in business hours (9 AM - 5 PM)',
        '✅ Emails are sent only to timezone groups in business hours',
        '⏰ Other timezone groups are skipped and will be processed later',
        '🔄 This ensures professional timing across global recipients'
      ]
    })

  } catch (error) {
    console.error('❌ Error simulating business hours:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to simulate business hours',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}