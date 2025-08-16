import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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
  const phoneIndex = headers.findIndex(h => h.includes('phone'))
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
      phone: phoneIndex >= 0 ? values[phoneIndex]?.trim() || null : null,
      linkedin_url: linkedinIndex >= 0 ? values[linkedinIndex]?.trim() || null : null,
    })
  }

  return contacts
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

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

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
        status: 'Pending',
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
      
      const { error: insertError } = await supabase
        .from('contacts')
        .insert(batch)

      if (insertError) {
        console.error('Error inserting batch:', insertError)
        throw insertError
      }
      
      insertedCount += batch.length
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

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} contacts`,
      importedCount: insertedCount,
      duplicateCount: contacts.length - newContacts.length,
      totalProcessed: contacts.length
    })

  } catch (error: any) {
    console.error('❌ Error uploading CSV:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to upload CSV file'
    }, { status: 500 })
  }
}