import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function deriveTimezoneFromLocation(location: string): string {
  const timezoneMap: { [key: string]: string } = {
    'Spain': 'Europe/Madrid',
    'Italy': 'Europe/Rome', 
    'France': 'Europe/Paris',
    'Germany': 'Europe/Berlin',
    'UK': 'Europe/London',
    'United Kingdom': 'Europe/London',
    'Netherlands': 'Europe/Amsterdam',
    'Belgium': 'Europe/Brussels',
    'Portugal': 'Europe/Lisbon',
    'Switzerland': 'Europe/Zurich',
    'Austria': 'Europe/Vienna',
    'Poland': 'Europe/Warsaw',
    'Czech Republic': 'Europe/Prague',
    'Hungary': 'Europe/Budapest',
    'Romania': 'Europe/Bucharest',
    'Bulgaria': 'Europe/Sofia',
    'Greece': 'Europe/Athens',
    'Croatia': 'Europe/Zagreb',
    'Slovenia': 'Europe/Ljubljana',
    'Slovakia': 'Europe/Bratislava',
    'Lithuania': 'Europe/Vilnius',
    'Latvia': 'Europe/Riga',
    'Estonia': 'Europe/Tallinn',
    'Finland': 'Europe/Helsinki',
    'Sweden': 'Europe/Stockholm',
    'Norway': 'Europe/Oslo',
    'Denmark': 'Europe/Copenhagen',
    'Iceland': 'Atlantic/Reykjavik',
    'Ireland': 'Europe/Dublin',
    'Malta': 'Europe/Malta',
    'Cyprus': 'Asia/Nicosia',
    'Luxembourg': 'Europe/Luxembourg',
    'Liechtenstein': 'Europe/Vaduz',
    'Monaco': 'Europe/Monaco',
    'San Marino': 'Europe/San_Marino',
    'Vatican City': 'Europe/Vatican',
    'Andorra': 'Europe/Andorra',
    'Morocco': 'Africa/Casablanca',
    'United States': 'America/New_York',
    'USA': 'America/New_York',
    'Canada': 'America/Toronto',
    'Australia': 'Australia/Sydney',
    'New Zealand': 'Pacific/Auckland',
    'Japan': 'Asia/Tokyo',
    'China': 'Asia/Shanghai',
    'India': 'Asia/Kolkata',
    'South Korea': 'Asia/Seoul',
    'Singapore': 'Asia/Singapore',
    'Thailand': 'Asia/Bangkok',
    'Malaysia': 'Asia/Kuala_Lumpur',
    'Indonesia': 'Asia/Jakarta',
    'Philippines': 'Asia/Manila',
    'Vietnam': 'Asia/Ho_Chi_Minh',
    'Hong Kong': 'Asia/Hong_Kong',
    'Taiwan': 'Asia/Taipei',
    'South Africa': 'Africa/Johannesburg',
    'Egypt': 'Africa/Cairo',
    'Nigeria': 'Africa/Lagos',
    'Kenya': 'Africa/Nairobi',
    'Brazil': 'America/Sao_Paulo',
    'Argentina': 'America/Argentina/Buenos_Aires',
    'Chile': 'America/Santiago',
    'Mexico': 'America/Mexico_City',
    'Colombia': 'America/Bogota',
    'Peru': 'America/Lima',
    'Venezuela': 'America/Caracas',
    'Ecuador': 'America/Guayaquil',
    'Uruguay': 'America/Montevideo',
    'Paraguay': 'America/Asuncion',
    'Bolivia': 'America/La_Paz',
    'Russia': 'Europe/Moscow',
    'Turkey': 'Europe/Istanbul',
    'Israel': 'Asia/Jerusalem',
    'UAE': 'Asia/Dubai',
    'Saudi Arabia': 'Asia/Riyadh',
    'Iran': 'Asia/Tehran',
    'Iraq': 'Asia/Baghdad',
    'Pakistan': 'Asia/Karachi',
    'Bangladesh': 'Asia/Dhaka',
    'Sri Lanka': 'Asia/Colombo',
    'Nepal': 'Asia/Kathmandu',
    'Myanmar': 'Asia/Yangon',
    'Cambodia': 'Asia/Phnom_Penh',
    'Laos': 'Asia/Vientiane',
    'Mongolia': 'Asia/Ulaanbaatar',
    'Kazakhstan': 'Asia/Almaty',
    'Uzbekistan': 'Asia/Tashkent',
    'Turkmenistan': 'Asia/Ashgabat',
    'Kyrgyzstan': 'Asia/Bishkek',
    'Tajikistan': 'Asia/Dushanbe',
    'Afghanistan': 'Asia/Kabul',
    'Lebanon': 'Asia/Beirut',
    'Jordan': 'Asia/Amman',
    'Syria': 'Asia/Damascus',
    'Kuwait': 'Asia/Kuwait',
    'Qatar': 'Asia/Qatar',
    'Bahrain': 'Asia/Bahrain',
    'Oman': 'Asia/Muscat',
    'Yemen': 'Asia/Aden'
  }
  
  return timezoneMap[location] || 'UTC'
}

function getBusinessHoursStatus(timezone: string) {
  const now = new Date()
  const timeInZone = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric', 
    hour12: false,
    weekday: 'short'
  }).formatToParts(now)
  
  const hour = parseInt(timeInZone.find(part => part.type === 'hour')?.value || '0')
  const weekday = timeInZone.find(part => part.type === 'weekday')?.value
  
  const isWeekend = weekday === 'Sat' || weekday === 'Sun'
  const isBusinessHour = hour >= 9 && hour <= 17
  
  return {
    timezone,
    currentHour: hour,
    weekday,
    isWeekend,
    isBusinessHour,
    isInBusinessHours: !isWeekend && isBusinessHour
  }
}

function calculateNextEmailDate(contact: any, currentSequenceIndex: number, campaignSequences: any[]) {
  const sequence = campaignSequences[currentSequenceIndex]
  if (!sequence) return null
  
  const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
  
  let scheduleDate = new Date()
  const relative = sequence.relative || 'Immediate'
  const timeValue = sequence.time_value || 1
  const timeUnit = sequence.time_unit || 'days'
  
  if (relative === 'Immediate') {
    // Keep current time for immediate
  } else {
    // Add delay based on time_value and time_unit
    const multiplier = timeUnit === 'hours' ? 1 : 24
    scheduleDate.setHours(scheduleDate.getHours() + (timeValue * multiplier))
  }
  
  return {
    date: scheduleDate,
    timezone,
    relative,
    timeValue,
    timeUnit,
    step: currentSequenceIndex,
    sequence: sequence
  }
}

// Calculate if contact's next email is due (matching analytics logic)
async function isContactDue(contact: any, campaignSequences: any[]) {
  try {
    // Get count of emails actually sent to this contact
    const { data: emailsSent, count, error: trackingError } = await supabase
      .from('email_tracking')
      .select('id', { count: 'exact' })
      .eq('contact_id', contact.id)
      .eq('campaign_id', contact.campaign_id)
      .eq('status', 'sent')
    
    if (trackingError) {
      console.error(`❌ Error checking email tracking for contact ${contact.id}:`, trackingError)
      return false
    }
    
    console.log(`📧 Contact ${contact.email}: ${count || 0} emails sent`)
    
    const emailsSentCount = count || 0
    const currentSequenceIndex = emailsSentCount // Next email to send
    
    console.log(`📍 Contact ${contact.email}: currentSequenceIndex = ${currentSequenceIndex}`)
    
    if (currentSequenceIndex >= campaignSequences.length) {
      console.log(`✅ Contact ${contact.email}: All sequences completed (${currentSequenceIndex}/${campaignSequences.length})`)
      return false // All sequences completed
    }
    
    // For the first email (index 0), check if it should be sent immediately
    if (currentSequenceIndex === 0) {
      const firstSequence = campaignSequences[0]
      if (!firstSequence) return false
      
      if (firstSequence.relative === 'Immediate') {
        console.log(`✅ Contact ${contact.email}: First email is immediate - DUE`)
        return true
      }
    }
    
    // For subsequent emails, check timing based on previous email
    if (emailsSentCount > 0) {
      // Get the timestamp of the last sent email
      const { data: lastEmail, error: lastEmailError } = await supabase
        .from('email_tracking')
        .select('sent_at')
        .eq('contact_id', contact.id)
        .eq('campaign_id', contact.campaign_id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()
      
      if (lastEmailError || !lastEmail) {
        console.log(`❌ Contact ${contact.email}: Could not find last email timestamp`)
        return false
      }
      
      console.log(`📅 Contact ${contact.email}: Last email sent at ${lastEmail.sent_at}`)
      
      // Calculate when the next email should be sent
      const nextEmailData = calculateNextEmailDate(contact, currentSequenceIndex, campaignSequences)
      
      if (!nextEmailData || !nextEmailData.date) {
        return false // No next email scheduled
      }
      
      const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
      const businessHoursStatus = getBusinessHoursStatus(timezone)
      
      const now = new Date()
      const scheduledDate = nextEmailData.date
      let isTimeReached = false
      
      // For immediate emails, use timezone-aware logic
      if (nextEmailData.relative === 'Immediate') {
        const contactIdString = String(contact.id || '')
        const contactHash = contactIdString.split('').reduce((hash, char) => {
          return ((hash << 5) - hash) + char.charCodeAt(0)
        }, 0)
        const seedValue = (contactHash + 1) % 1000
        const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
        const intendedMinute = (seedValue * 7) % 60
        
        // Get current time in contact's timezone
        const currentHourInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false
        }).format(now))
        const currentMinuteInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          minute: 'numeric'
        }).format(now))
        
        console.log(`⏰ Contact ${contact.email}: Immediate email timing check`)
        console.log(`   Intended: ${intendedHour}:${intendedMinute.toString().padStart(2, '0')}`)
        console.log(`   Current: ${currentHourInContactTz}:${currentMinuteInContactTz.toString().padStart(2, '0')} (${timezone})`)
        console.log(`   Business hours: ${businessHoursStatus.isInBusinessHours}`)
        
        // Check if current time has passed the intended time and we're in business hours
        const currentTotalMinutes = currentHourInContactTz * 60 + currentMinuteInContactTz
        const intendedTotalMinutes = intendedHour * 60 + intendedMinute
        
        isTimeReached = currentTotalMinutes >= intendedTotalMinutes && businessHoursStatus.isInBusinessHours
      } else {
        // For delayed emails, check if enough time has passed
        isTimeReached = now >= scheduledDate
        console.log(`⏰ Contact ${contact.email}: Delayed email timing check`)
        console.log(`   Scheduled: ${scheduledDate.toISOString()}`)
        console.log(`   Current: ${now.toISOString()}`)
        console.log(`   Time reached: ${isTimeReached}`)
      }
      
      console.log(`📊 Contact ${contact.email}: isTimeReached = ${isTimeReached}`)
      
      return isTimeReached
    }
    
    console.log(`❓ Contact ${contact.email}: Unknown state`)
    return false
    
  } catch (error) {
    console.error(`❌ Error calculating due status for contact ${contact.email}:`, error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing due logic for essabar.yassine@gmail.com')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    const testEmail = 'essabar.yassine@gmail.com'
    
    // Get the test contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', testEmail)
      .eq('campaign_id', campaignId)
      .single()
    
    if (contactError || !contact) {
      return NextResponse.json({
        success: false,
        error: 'Test contact not found',
        details: contactError
      }, { status: 404 })
    }
    
    // Get campaign sequences
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (sequencesError || !campaignSequences) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get campaign sequences',
        details: sequencesError
      }, { status: 500 })
    }
    
    // Test the due logic
    const isDue = await isContactDue(contact, campaignSequences)
    
    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        location: contact.location,
        campaign_id: contact.campaign_id
      },
      sequences_count: campaignSequences.length,
      sequences: campaignSequences.map(s => ({
        step_number: s.step_number,
        subject: s.subject,
        relative: s.relative,
        time_value: s.time_value,
        time_unit: s.time_unit
      })),
      is_due: isDue,
      debug_info: {
        timezone: deriveTimezoneFromLocation(contact.location),
        business_hours: getBusinessHoursStatus(deriveTimezoneFromLocation(contact.location))
      }
    })
    
  } catch (error) {
    console.error('❌ Test due logic error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}