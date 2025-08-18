// Timezone derivation utilities for contact locations

// Common location to timezone mappings
const LOCATION_TIMEZONE_MAP: Record<string, string> = {
  // Major Cities - North America
  'new york': 'America/New_York',
  'nyc': 'America/New_York',
  'manhattan': 'America/New_York',
  'brooklyn': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  'sf': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'houston': 'America/Chicago',
  'toronto': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'montreal': 'America/Toronto',

  // Major Cities - Europe
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'madrid': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  'amsterdam': 'Europe/Amsterdam',
  'stockholm': 'Europe/Stockholm',
  'oslo': 'Europe/Oslo',
  'copenhagen': 'Europe/Copenhagen',
  'zurich': 'Europe/Zurich',
  'vienna': 'Europe/Vienna',
  'prague': 'Europe/Prague',
  'warsaw': 'Europe/Warsaw',
  'dublin': 'Europe/Dublin',

  // Major Cities - Asia Pacific
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'brisbane': 'Australia/Brisbane',
  'perth': 'Australia/Perth',
  'adelaide': 'Australia/Adelaide',
  'tokyo': 'Asia/Tokyo',
  'seoul': 'Asia/Seoul',
  'shanghai': 'Asia/Shanghai',
  'beijing': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  'singapore': 'Asia/Singapore',
  'bangkok': 'Asia/Bangkok',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'bangalore': 'Asia/Kolkata',

  // Countries - fallback to capital cities
  'usa': 'America/New_York',
  'united states': 'America/New_York',
  'canada': 'America/Toronto',
  'uk': 'Europe/London',
  'united kingdom': 'Europe/London',
  'england': 'Europe/London',
  'france': 'Europe/Paris',
  'germany': 'Europe/Berlin',
  'spain': 'Europe/Madrid',
  'italy': 'Europe/Rome',
  'netherlands': 'Europe/Amsterdam',
  'sweden': 'Europe/Stockholm',
  'norway': 'Europe/Oslo',
  'denmark': 'Europe/Copenhagen',
  'switzerland': 'Europe/Zurich',
  'austria': 'Europe/Vienna',
  'australia': 'Australia/Sydney',
  'japan': 'Asia/Tokyo',
  'south korea': 'Asia/Seoul',
  'korea': 'Asia/Seoul',
  'china': 'Asia/Shanghai',
  'singapore': 'Asia/Singapore',
  'thailand': 'Asia/Bangkok',
  'india': 'Asia/Kolkata',

  // US States
  'california': 'America/Los_Angeles',
  'new york state': 'America/New_York',
  'texas': 'America/Chicago',
  'florida': 'America/New_York',
  'illinois': 'America/Chicago',
  'washington': 'America/Los_Angeles',
  'oregon': 'America/Los_Angeles',
  'nevada': 'America/Los_Angeles',
  'arizona': 'America/Phoenix',
  'colorado': 'America/Denver',
  'utah': 'America/Denver',
  'montana': 'America/Denver',
  'wyoming': 'America/Denver',
  'north dakota': 'America/Chicago',
  'south dakota': 'America/Chicago',
  'nebraska': 'America/Chicago',
  'kansas': 'America/Chicago',
  'oklahoma': 'America/Chicago',
  'minnesota': 'America/Chicago',
  'iowa': 'America/Chicago',
  'missouri': 'America/Chicago',
  'arkansas': 'America/Chicago',
  'louisiana': 'America/Chicago',
  'wisconsin': 'America/Chicago',
  'michigan': 'America/New_York',
  'indiana': 'America/New_York',
  'ohio': 'America/New_York',
  'kentucky': 'America/New_York',
  'tennessee': 'America/Chicago',
  'mississippi': 'America/Chicago',
  'alabama': 'America/Chicago',
  'georgia': 'America/New_York',
  'south carolina': 'America/New_York',
  'north carolina': 'America/New_York',
  'virginia': 'America/New_York',
  'west virginia': 'America/New_York',
  'maryland': 'America/New_York',
  'delaware': 'America/New_York',
  'new jersey': 'America/New_York',
  'connecticut': 'America/New_York',
  'rhode island': 'America/New_York',
  'massachusetts': 'America/New_York',
  'vermont': 'America/New_York',
  'new hampshire': 'America/New_York',
  'maine': 'America/New_York',
  'pennsylvania': 'America/New_York',
}

// Canadian Provinces
const CANADIAN_PROVINCES: Record<string, string> = {
  'ontario': 'America/Toronto',
  'quebec': 'America/Toronto',
  'british columbia': 'America/Vancouver',
  'alberta': 'America/Edmonton',
  'saskatchewan': 'America/Regina',
  'manitoba': 'America/Winnipeg',
  'new brunswick': 'America/Moncton',
  'nova scotia': 'America/Halifax',
  'prince edward island': 'America/Halifax',
  'newfoundland': 'America/St_Johns',
  'yukon': 'America/Whitehorse',
  'northwest territories': 'America/Yellowknife',
  'nunavut': 'America/Iqaluit',
}

// Merge all mappings
const ALL_LOCATION_MAPPINGS = {
  ...LOCATION_TIMEZONE_MAP,
  ...CANADIAN_PROVINCES
}

/**
 * Derive timezone from location string
 * @param location - Location string (city, state, country, etc.)
 * @returns Timezone identifier or null if not found
 */
export function deriveTimezoneFromLocation(location: string | null | undefined): string | null {
  if (!location || typeof location !== 'string') {
    return null
  }

  const normalizedLocation = location.toLowerCase().trim()
  
  // Direct match
  if (ALL_LOCATION_MAPPINGS[normalizedLocation]) {
    return ALL_LOCATION_MAPPINGS[normalizedLocation]
  }

  // Try to find partial matches for compound locations like "Sydney, Australia"
  for (const [key, timezone] of Object.entries(ALL_LOCATION_MAPPINGS)) {
    if (normalizedLocation.includes(key)) {
      return timezone
    }
  }

  // Try reverse matching - check if any key is contained in the location
  for (const [key, timezone] of Object.entries(ALL_LOCATION_MAPPINGS)) {
    if (key.includes(normalizedLocation)) {
      return timezone
    }
  }

  return null
}

/**
 * Get current time in a specific timezone
 * @param timezone - Timezone identifier
 * @returns Formatted time string
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  try {
    const now = new Date()
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(now)
  } catch (error) {
    return 'Unknown'
  }
}

/**
 * Check if current time is within business hours for a timezone
 * @param timezone - Timezone identifier
 * @param startHour - Business start hour (24-hour format, default: 8)
 * @param endHour - Business end hour (24-hour format, default: 17)
 * @returns boolean indicating if it's business hours
 */
export function isBusinessHours(timezone: string, startHour: number = 8, endHour: number = 17): boolean {
  try {
    const now = new Date()
    
    // Get the day of week and hour in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const weekday = parts.find(p => p.type === 'weekday')?.value
    
    // Check if it's a business day (Monday-Friday)
    const businessDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const isBusinessDay = businessDays.includes(weekday || '')
    
    // Check if it's within business hours
    const isWithinHours = hour >= startHour && hour < endHour
    
    return isBusinessDay && isWithinHours
  } catch (error) {
    return false
  }
}

/**
 * Get business hours status with emoji and description
 * @param timezone - Timezone identifier
 * @returns Object with status info
 */
export function getBusinessHoursStatus(timezone: string): {
  isBusinessHours: boolean
  emoji: string
  text: string
  currentTime: string
} {
  try {
    const now = new Date()
    const isInBusinessHours = isBusinessHours(timezone)
    const currentTime = getCurrentTimeInTimezone(timezone)
    
    // Get more detailed status
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const weekday = parts.find(p => p.type === 'weekday')?.value
    
    const businessDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const isBusinessDay = businessDays.includes(weekday || '')
    const isWithinHours = hour >= 8 && hour < 17
    
    let text = 'Outside hours'
    if (isInBusinessHours) {
      text = 'Business hours'
    } else if (!isBusinessDay) {
      text = 'Weekend'
    } else if (!isWithinHours) {
      text = 'Outside hours'
    }
    
    return {
      isBusinessHours: isInBusinessHours,
      emoji: isInBusinessHours ? '🟢' : '🔴',
      text,
      currentTime
    }
  } catch (error) {
    const currentTime = getCurrentTimeInTimezone(timezone)
    return {
      isBusinessHours: false,
      emoji: '🔴',
      text: 'Outside hours',
      currentTime
    }
  }
}

/**
 * Batch process multiple contacts to add derived timezones
 * @param contacts - Array of contacts with location data
 * @returns Contacts with derived timezone field added
 */
export function addDerivedTimezones<T extends { location?: string | null }>(
  contacts: T[]
): (T & { derived_timezone?: string | null })[] {
  return contacts.map(contact => ({
    ...contact,
    derived_timezone: deriveTimezoneFromLocation(contact.location)
  }))
}