import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { deriveTimezoneFromLocation } from '@/lib/timezone-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper function to randomize email send time within business hours
function randomizeWithinBusinessHours(baseDate: Date, timezone: string, emailStep?: number): Date {
  const randomizedDate = new Date(baseDate)
  
  // Define preferred time ranges based on email type for more natural patterns
  let timeRanges = [
    { start: 9, end: 11, weight: 0.3 },   // Morning: 9-11 AM (30% chance)
    { start: 11, end: 13, weight: 0.2 },  // Late morning: 11 AM-1 PM (20% chance)
    { start: 13, end: 15, weight: 0.25 }, // Early afternoon: 1-3 PM (25% chance)
    { start: 15, end: 17, weight: 0.25 }  // Late afternoon: 3-5 PM (25% chance)
  ]
  
  // Adjust preferences based on email step
  if (emailStep === 1) {
    // Initial outreach: prefer morning hours
    timeRanges = [
      { start: 9, end: 11, weight: 0.5 },
      { start: 11, end: 13, weight: 0.3 },
      { start: 13, end: 15, weight: 0.15 },
      { start: 15, end: 17, weight: 0.05 }
    ]
  } else if (emailStep && emailStep >= 4) {
    // Follow-ups: prefer afternoon hours
    timeRanges = [
      { start: 9, end: 11, weight: 0.1 },
      { start: 11, end: 13, weight: 0.2 },
      { start: 13, end: 15, weight: 0.35 },
      { start: 15, end: 17, weight: 0.35 }
    ]
  }
  
  // Select time range based on weighted random selection
  const random = Math.random()
  let cumulativeWeight = 0
  let selectedRange = timeRanges[0]
  
  for (const range of timeRanges) {
    cumulativeWeight += range.weight
    if (random <= cumulativeWeight) {
      selectedRange = range
      break
    }
  }
  
  // Generate random time within selected range
  const hourRange = selectedRange.end - selectedRange.start
  const randomHourOffset = Math.random() * hourRange
  const randomHour = Math.floor(selectedRange.start + randomHourOffset)
  const randomMinutes = Math.floor(Math.random() * 60)
  const randomSeconds = Math.floor(Math.random() * 60)
  
  randomizedDate.setHours(randomHour, randomMinutes, randomSeconds, 0)
  
  return randomizedDate
}

// Helper function to avoid weekends and optionally optimize day of week
function avoidWeekends(date: Date, emailStep?: number): Date {
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 0) {
    // Sunday - move to Monday
    date.setDate(date.getDate() + 1)
  } else if (dayOfWeek === 6) {
    // Saturday - move to Monday
    date.setDate(date.getDate() + 2)
  }
  
  // Add small chance (15%) to shift to preferred days for better open rates
  const optimizeDay = Math.random() < 0.15
  
  if (optimizeDay && emailStep) {
    const currentDay = date.getDay()
    
    // Research suggests Tuesday-Thursday are best for open rates
    // But add some variation to avoid patterns
    const preferredDays = emailStep === 1 ? [2, 3] : [2, 3, 4] // Tue, Wed, (Thu for follow-ups)
    
    if (!preferredDays.includes(currentDay)) {
      // Randomly pick a preferred day
      const targetDay = preferredDays[Math.floor(Math.random() * preferredDays.length)]
      const daysToAdd = (targetDay - currentDay + 7) % 7
      
      // Only shift if it's within a reasonable range (0-3 days)
      if (daysToAdd <= 3) {
        date.setDate(date.getDate() + daysToAdd)
      }
    }
  }
  
  return date
}

function parseCsvData(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const contacts = []

  // Check for required fields
  const requiredFields = ['email', 'first_name', 'last_name']
  const missingFields = requiredFields.filter(field => !headers.includes(field) && !headers.includes(field.replace('_', ' ')))
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}. Required: email, first_name, last_name`)
  }

  // Find column indices
  const emailIndex = headers.findIndex(h => h.includes('email'))
  const firstNameIndex = headers.findIndex(h => h.includes('first') && h.includes('name'))
  const lastNameIndex = headers.findIndex(h => h.includes('last') && h.includes('name'))
  const companyIndex = headers.findIndex(h => h.includes('company'))
  const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('position'))
  const locationIndex = headers.findIndex(h => h.includes('location') || h.includes('city'))
  const industryIndex = headers.findIndex(h => h.includes('industry'))
  const linkedinIndex = headers.findIndex(h => h.includes('linkedin'))

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
    
    if (values.length < headers.length) {
      console.warn(`Row ${i + 1} has fewer columns than headers, skipping`)
      continue
    }

    const email = values[emailIndex]?.trim()
    const firstName = values[firstNameIndex]?.trim()
    const lastName = values[lastNameIndex]?.trim()

    // Skip rows with missing required data
    if (!email || !firstName || !lastName) {
      console.warn(`Row ${i + 1} missing required data, skipping`)
      continue
    }

    // Validate email
    if (!validateEmail(email)) {
      console.warn(`Row ${i + 1} has invalid email: ${email}, skipping`)
      continue
    }

    contacts.push({
      email,
      first_name: firstName,
      last_name: lastName,
      company: companyIndex >= 0 ? values[companyIndex]?.trim() || null : null,
      title: titleIndex >= 0 ? values[titleIndex]?.trim() || null : null,
      location: locationIndex >= 0 ? values[locationIndex]?.trim() || null : null,
      industry: industryIndex >= 0 ? values[industryIndex]?.trim() || null : null,
      linkedin: linkedinIndex >= 0 ? values[linkedinIndex]?.trim() || null : null,
    })
  }

  return contacts
}

// Calculate next_email_due using same logic as UI
function calculateContactNextEmailDue(contact: any, sequences: any[], campaignSettings: any) {
  const currentStep = contact.sequence_step || 0
  
  // Find next sequence step (first email for new contacts)
  const nextStepIndex = currentStep === 0 ? 0 : currentStep
  const nextSequence = sequences[nextStepIndex]
  
  if (!nextSequence) {
    return null // No sequences defined
  }
  
  const timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
  const contactIdString = contact.id?.toString() || '0'
  
  // Use same hash-based timing logic as UI
  const contactHash = contactIdString.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0)
  }, 0)
  
  const seedValue = (contactHash + 1) % 1000
  const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
  const consistentMinute = (seedValue * 7) % 60
  
  // Calculate scheduled date
  let scheduledDate: Date
  const timingDays = nextSequence.timing_days || 0
  
  if (currentStep === 0) {
    // First email for new contact
    if (timingDays === 0) {
      scheduledDate = new Date()
    } else {
      scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    }
  } else {
    // This shouldn't happen for new contacts, but handle it
    scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + timingDays)
  }
  
  // Set consistent time
  scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
  
  // Handle campaign active days
  const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  
  function isActiveDayOfWeek(dayOfWeek: number) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = dayNames[dayOfWeek]
    return activeDays.includes(dayName)
  }
  
  // Skip inactive days
  let dayOfWeek = scheduledDate.getDay()
  while (!isActiveDayOfWeek(dayOfWeek)) {
    scheduledDate.setDate(scheduledDate.getDate() + 1)
    dayOfWeek = scheduledDate.getDay()
  }
  
  return scheduledDate
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    
    const userId = await getUserIdFromSession()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify campaign ownership and get campaign status
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id, status, name')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get campaign sequences and settings for next_email_due calculation
    const { data: campaignSequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })

    const { data: campaignSettings } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('csvFile') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
    }

    // Read and parse CSV
    const csvText = await file.text()
    let contacts: any[]
    
    try {
      contacts = parseCsvData(csvText)
    } catch (parseError) {
      return NextResponse.json({ 
        error: `CSV parsing error: ${parseError instanceof Error ? parseError.message : 'Invalid format'}` 
      }, { status: 400 })
    }

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No valid contacts found in CSV' }, { status: 400 })
    }

    if (contacts.length > 10000) {
      return NextResponse.json({ error: 'Maximum 10,000 contacts allowed' }, { status: 400 })
    }

    // Check for duplicate emails within the campaign
    const existingEmails = new Set()
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('campaign_id', campaignId)

    if (existingContacts) {
      existingContacts.forEach(contact => existingEmails.add(contact.email.toLowerCase()))
    }

    // Filter out duplicates and add campaign info
    const newContacts = contacts
      .filter(contact => !existingEmails.has(contact.email.toLowerCase()))
      .map(contact => ({
        ...contact,
        campaign_id: campaignId,
        user_id: userId,
        email_status: 'Valid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

    if (newContacts.length === 0) {
      return NextResponse.json({ 
        error: 'All contacts already exist in this campaign',
        duplicateCount: contacts.length 
      }, { status: 400 })
    }

    // Insert contacts in batches to avoid memory issues
    const batchSize = 1000
    let insertedCount = 0
    
    for (let i = 0; i < newContacts.length; i += batchSize) {
      const batch = newContacts.slice(i, i + batchSize)
      
      const { data: insertedBatch, error: insertError } = await supabase
        .from('contacts')
        .insert(batch)
        .select('id, email, location')

      if (insertError) {
        console.error('Error inserting batch:', insertError)
        throw insertError
      }
      
      insertedCount += batch.length
      
      // Calculate and update next_email_due for the inserted contacts
      if (insertedBatch && campaignSequences && campaignSequences.length > 0) {
        console.log(`📅 Calculating next_email_due for ${insertedBatch.length} contacts...`)
        
        for (const contact of insertedBatch) {
          const nextEmailDue = calculateContactNextEmailDue(contact, campaignSequences, campaignSettings)
          
          if (nextEmailDue) {
            const { error: updateError } = await supabase
              .from('contacts')
              .update({ next_email_due: nextEmailDue.toISOString() })
              .eq('id', contact.id)
            
            if (updateError) {
              console.error(`❌ Error updating next_email_due for ${contact.email}:`, updateError.message)
            } else {
              console.log(`✅ Set next_email_due for ${contact.email}: ${nextEmailDue.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
            }
          }
        }
      }
    }

    // Update campaign totalPlanned
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        totalPlanned: insertedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating campaign:', updateError)
    }

    console.log(`✅ Successfully imported ${insertedCount} contacts for campaign ${campaignId}`)

    // Auto-schedule email sequences if campaign is active
    let scheduledEmailsCount = 0
    if (campaign.status === 'Active') {
      console.log(`🔄 Campaign "${campaign.name}" is active, auto-scheduling email sequences for ${insertedCount} new contacts...`)
      
      try {
        // Get campaign sequences
        const { data: sequences, error: sequenceError } = await supabase
          .from('campaign_sequences')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('step_number', { ascending: true })

        if (sequenceError) {
          console.error('Error fetching campaign sequences:', sequenceError)
        } else if (sequences && sequences.length > 0) {
          // Get the newly inserted contacts with their IDs
          const { data: insertedContacts, error: contactsError } = await supabase
            .from('contacts')
            .select('id, email, first_name, created_at, timezone')
            .eq('campaign_id', campaignId)
            .in('email', newContacts.map(c => c.email))

          if (contactsError) {
            console.error('Error fetching inserted contacts:', contactsError)
          } else if (insertedContacts && insertedContacts.length > 0) {
            const scheduledEmails = []
            const now = new Date()

            for (const contact of insertedContacts) {
              for (const sequence of sequences) {
                const scheduledDate = new Date(now)
                
                // Calculate when this email should be sent based on sequence timing
                if (sequence.timing_days === 0) {
                  // First email - schedule for immediate sending (5 minutes from now)
                  scheduledDate.setMinutes(scheduledDate.getMinutes() + 5)
                } else {
                  // Subsequent emails - schedule based on timing from contact creation
                  scheduledDate.setDate(scheduledDate.getDate() + sequence.timing_days)
                }

                // Set to randomized business hours (9 AM - 5 PM) in contact's timezone
                scheduledDate = randomizeWithinBusinessHours(scheduledDate, contact.timezone || 'UTC', sequence.step_number)
                
                // Ensure email is not scheduled for weekend - move to next Monday if needed
                scheduledDate = avoidWeekends(scheduledDate, sequence.step_number)

                const scheduledEmail = {
                  campaign_id: campaignId,
                  contact_id: contact.id,
                  step: sequence.step_number,
                  subject: sequence.subject || `Email ${sequence.step_number}`,
                  scheduled_date: scheduledDate.toISOString(),
                  status: 'pending',
                  created_at: now.toISOString()
                }

                scheduledEmails.push(scheduledEmail)
              }
            }

            // Insert scheduled emails (only if scheduled_emails table exists)
            if (scheduledEmails.length > 0) {
              try {
                const { error: insertEmailError } = await supabase
                  .from('scheduled_emails')
                  .insert(scheduledEmails)

                if (insertEmailError) {
                  if (insertEmailError.code === 'PGRST205') {
                    console.log('ℹ️ Scheduled emails table does not exist - email scheduling feature disabled')
                  } else {
                    console.error('Error inserting scheduled emails:', insertEmailError)
                  }
                } else {
                  scheduledEmailsCount = scheduledEmails.length
                  console.log(`✅ Scheduled ${scheduledEmailsCount} emails for ${insertedContacts.length} new contacts`)
                }
              } catch (error) {
                console.log('ℹ️ Email scheduling not available - scheduled_emails table missing')
              }
            }
          }
        } else {
          console.log('ℹ️ No email sequences found for campaign - skipping auto-scheduling')
        }
      } catch (error) {
        console.error('Error in auto-scheduling:', error)
      }
    } else {
      console.log(`ℹ️ Campaign "${campaign.name}" is ${campaign.status} - skipping auto-scheduling`)
    }

    const message = scheduledEmailsCount > 0 
      ? `Successfully imported ${insertedCount} contacts and scheduled ${scheduledEmailsCount} emails`
      : `Successfully imported ${insertedCount} contacts`

    return NextResponse.json({
      success: true,
      message,
      importedCount: insertedCount,
      duplicateCount: contacts.length - newContacts.length,
      totalProcessed: contacts.length,
      scheduledEmailsCount
    })

  } catch (error: any) {
    console.error('❌ Error uploading CSV:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload CSV file'
    }, { status: 500 })
  }
}