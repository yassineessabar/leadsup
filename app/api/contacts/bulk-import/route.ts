import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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
    return null
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contacts } = body

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'Contacts array is required' }, { status: 400 })
    }

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'At least one contact is required' }, { status: 400 })
    }

    console.log(`📥 Bulk importing ${contacts.length} contacts for user ${userId}`)

    // Prepare contacts for insertion
    const contactsToInsert = contacts.map(contact => ({
      user_id: userId,
      first_name: contact.first_name || contact.firstName || '',
      last_name: contact.last_name || contact.lastName || '',
      email: contact.email || '',
      email_status: 'Unknown', // Will be verified later
      title: contact.title || contact.position || '',
      company: contact.company || '',
      location: contact.location || '',
      industry: contact.industry || '',
      linkedin: contact.linkedin || '',
      image_url: contact.image_url || null,
      campaign_id: contact.campaign_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Check for existing contacts to avoid duplicates
    const emails = contactsToInsert.filter(c => c.email).map(c => c.email)
    let existingEmails: string[] = []
    
    if (emails.length > 0) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('email')
        .eq('user_id', userId)
        .in('email', emails)
      
      existingEmails = existing ? existing.map(c => c.email) : []
    }

    // Filter out duplicates
    const newContacts = contactsToInsert.filter(contact => 
      !contact.email || !existingEmails.includes(contact.email)
    )

    console.log(`📊 Import summary: ${contactsToInsert.length} total, ${existingEmails.length} duplicates, ${newContacts.length} new`)

    if (newContacts.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: existingEmails.length,
        total: contactsToInsert.length,
        message: 'All contacts already exist'
      })
    }

    // Insert new contacts
    const { data: insertedContacts, error } = await supabase
      .from('contacts')
      .insert(newContacts)
      .select()

    if (error) {
      console.error('❌ Error inserting contacts:', error)
      return NextResponse.json({ 
        error: 'Failed to import contacts', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Successfully imported ${insertedContacts.length} contacts`)

    // Trigger automatic sequence scheduling for contacts with active campaigns
    let scheduledCount = 0
    const contactsWithCampaigns = insertedContacts.filter(c => c.campaign_id)
    
    if (contactsWithCampaigns.length > 0) {
      console.log(`🎯 Checking for automatic sequence scheduling for ${contactsWithCampaigns.length} contacts with campaigns`)
      
      // Group by campaign to batch process
      const campaignGroups = contactsWithCampaigns.reduce((groups, contact) => {
        const campaignId = contact.campaign_id
        if (!groups[campaignId]) groups[campaignId] = []
        groups[campaignId].push(contact)
        return groups
      }, {})

      for (const [campaignId, campaignContacts] of Object.entries(campaignGroups)) {
        try {
          // Check if campaign is active
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id, name, status')
            .eq('id', campaignId)
            .single()

          if (campaign && campaign.status === 'Active') {
            console.log(`🎯 Auto-scheduling sequences for ${campaignContacts.length} contacts in active campaign: ${campaign.name}`)
            
            // Import the scheduler
            const { scheduleContactEmails } = await import('@/lib/email-scheduler')
            
            // Schedule sequences for contacts in this campaign
            const schedulingPromises = campaignContacts.map(async (contact) => {
              try {
                const result = await scheduleContactEmails({
                  contactId: contact.id,
                  campaignId: campaignId,
                  contactLocation: contact.location,
                  startDate: new Date()
                })

                if (result.success) {
                  // Update contact status to reflect scheduling
                  await supabase
                    .from('contacts')
                    .update({ 
                      email_status: 'Scheduled',
                      updated_at: new Date().toISOString() 
                    })
                    .eq('id', contact.id)
                  
                  return true
                } else {
                  console.error(`❌ Failed to schedule for ${contact.email}:`, result.message)
                  return false
                }
              } catch (error) {
                console.error(`❌ Error scheduling sequences for ${contact.email}:`, error)
                return false
              }
            })

            const results = await Promise.all(schedulingPromises)
            const campaignScheduled = results.filter(Boolean).length
            scheduledCount += campaignScheduled
            
            console.log(`✅ Scheduled sequences for ${campaignScheduled}/${campaignContacts.length} contacts in campaign ${campaign.name}`)
          } else {
            console.log(`⏸️ Campaign ${campaignId} is not active (status: ${campaign?.status || 'not found'}), skipping auto-scheduling`)
          }
        } catch (error) {
          console.error(`❌ Error processing campaign ${campaignId} for scheduling:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: insertedContacts.length,
      duplicates: existingEmails.length,
      total: contactsToInsert.length,
      scheduled: scheduledCount,
      message: `Successfully imported ${insertedContacts.length} contacts${scheduledCount > 0 ? `, ${scheduledCount} sequences scheduled` : ''}`
    })

  } catch (error) {
    console.error('❌ Error in bulk import:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}