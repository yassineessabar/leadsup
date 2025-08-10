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

// Timezone configurations
const TIMEZONE_CONFIG = {
  'T1': { name: 'America/New_York', offset: -5, description: 'Eastern Time' },
  'T2': { name: 'America/Chicago', offset: -6, description: 'Central Time' },
  'T3': { name: 'Europe/London', offset: 0, description: 'Europe Time' },
  'T4': { name: 'Asia/Singapore', offset: 8, description: 'Asia Time' }
}

// Check if current time is within business hours for a timezone
function isWithinBusinessHours(timezoneGroup: string): boolean {
  const config = TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG]
  if (!config) return false

  const now = new Date()
  const utcHours = now.getUTCHours()
  const localHours = (utcHours + config.offset + 24) % 24

  // Business hours: 9 AM to 5 PM local time
  return localHours >= 9 && localHours <= 17
}

// POST - Test timezone business hours logic
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const now = new Date()
    const utcTime = now.toISOString()
    
    console.log('🕐 Testing timezone business hours logic...')

    const results = {}
    
    // Test all timezone groups
    for (const [timezoneGroup, config] of Object.entries(TIMEZONE_CONFIG)) {
      const utcHours = now.getUTCHours()
      const localHours = (utcHours + config.offset + 24) % 24
      const localMinutes = now.getUTCMinutes()
      
      const localTime = `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`
      const isBusinessHours = isWithinBusinessHours(timezoneGroup)
      
      results[timezoneGroup as keyof typeof results] = {
        timezone_name: config.name,
        description: config.description,
        utc_offset: config.offset,
        local_time: localTime,
        local_hour: localHours,
        is_business_hours: isBusinessHours,
        business_window: '09:00 - 17:00',
        status: isBusinessHours ? '✅ SEND EMAILS' : '⏰ WAIT (outside business hours)'
      }
    }

    return NextResponse.json({
      success: true,
      current_utc_time: utcTime,
      current_utc_hour: now.getUTCHours(),
      timezone_analysis: results,
      summary: {
        total_timezones: 4,
        ready_to_send: Object.values(results).filter((r: any) => r.is_business_hours).length,
        waiting: Object.values(results).filter((r: any) => !r.is_business_hours).length
      },
      explanation: [
        '🌍 System checks each timezone group for business hours (9 AM - 5 PM local time)',
        '✅ Emails are sent only during business hours in the prospect\'s timezone',
        '⏰ Emails are queued/skipped when outside business hours',
        '🔄 This ensures professional timing and better engagement rates'
      ]
    })

  } catch (error) {
    console.error('❌ Error testing timezone hours:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test timezone hours',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}