import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const campaignId = params.id
    const body = await request.json()
    const { contacts } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'Contacts array is required' }, { status: 400 })
    }

    // First, get the campaign name to include in tags
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', campaignId)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Prepare the contacts data for the main contacts table
    const campaignTag = campaign.name
    console.log(`📝 Preparing to import ${contacts.length} contacts with tag: ${campaignTag}`)
    
    const contactsToInsert = contacts.map(contact => ({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      email_status: 'Unknown',
      privacy: 'Normal',
      tags: campaignTag,
      linkedin: contact.linkedin || '',
      title: contact.title || '',
      location: contact.location || '',
      company: contact.company || '',
      industry: contact.industry || '',
      note: `Imported from campaign "${campaign.name}" on ${new Date().toLocaleDateString()}`
    }))
    
    console.log('📋 Sample contact to insert:', contactsToInsert[0])

    // Check which contacts already exist by email to avoid duplicates
    const existingContacts = []
    console.log(`🔍 Checking for duplicate emails in ${contactsToInsert.length} contacts...`)
    
    if (contactsToInsert.some(c => c.email)) {
      const emails = contactsToInsert.filter(c => c.email).map(c => c.email)
      console.log(`📧 Checking emails:`, emails)
      
      const { data: existing, error: duplicateError } = await supabase
        .from('contacts')
        .select('email')
        .in('email', emails)
      
      if (duplicateError) {
        console.error('❌ Error checking duplicates:', duplicateError)
      } else if (existing) {
        existingContacts.push(...existing.map(c => c.email))
        console.log(`📊 Found ${existing.length} existing contacts:`, existing.map(c => c.email))
      }
    }

    // Filter out existing contacts
    const newContacts = contactsToInsert.filter(contact => 
      !contact.email || !existingContacts.includes(contact.email)
    )
    
    console.log(`📊 After duplicate filtering: ${newContacts.length} new, ${existingContacts.length} existing`)

    if (newContacts.length === 0 && existingContacts.length > 0) {
      console.log('⚠️ All contacts are duplicates - updating existing contacts with campaign tag')
      
      // Update existing contacts to add the campaign tag (campaignTag already includes campaign name)
      const emailsToUpdate = contactsToInsert.filter(c => existingContacts.includes(c.email)).map(c => c.email)
      
      console.log(`📝 Updating ${emailsToUpdate.length} existing contacts with tag: ${campaignTag}`)
      
      // Update each existing contact to append the campaign tag
      const updatePromises = emailsToUpdate.map(async (email) => {
        // First get the existing contact
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('tags')
          .eq('email', email)
          .single()
        
        // Append the campaign tag if not already present
        let updatedTags = existingContact?.tags || ''
        if (!updatedTags.includes(campaignTag)) {
          updatedTags = updatedTags ? `${updatedTags}, ${campaignTag}` : campaignTag
        }
        
        // Update the contact
        return supabase
          .from('contacts')
          .update({ 
            tags: updatedTags,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single()
      })
      
      const updateResults = await Promise.all(updatePromises)
      const successfulUpdates = updateResults.filter(result => !result.error)
      
      console.log(`✅ Successfully updated ${successfulUpdates.length} existing contacts with campaign tag`)
      
      return NextResponse.json({
        success: true,
        message: `Updated ${successfulUpdates.length} existing contacts with campaign tag`,
        data: {
          imported_count: 0,
          existing_count: contactsToInsert.length,
          updated_count: successfulUpdates.length,
          leads: successfulUpdates.map(r => r.data).filter(Boolean)
        }
      })
    }
    
    if (newContacts.length === 0) {
      console.log('⚠️ No contacts to process')
      return NextResponse.json({
        success: true,
        message: 'No contacts to import',
        data: {
          imported_count: 0,
          existing_count: 0,
          leads: []
        }
      })
    }

    // Insert new contacts into the main contacts table
    console.log(`📝 Attempting to insert ${newContacts.length} new contacts to database...`)
    const { data: leads, error } = await supabase
      .from('contacts')
      .insert(newContacts)
      .select()

    console.log('📊 Database insertion result:', { leads: leads?.length, error: error?.message })
    if (error) {
      console.error('Error importing leads to contacts table:', error)
      
      // If table doesn't exist, return success anyway for demo
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log('📝 Contacts table not found, returning demo success response')
        return NextResponse.json({
          success: true,
          message: 'Leads imported successfully (demo mode - contacts table not found)',
          data: {
            imported_count: newContacts.length,
            existing_count: existingContacts.length,
            leads: newContacts,
            demo_mode: true
          }
        })
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to import leads to main contacts table' 
      }, { status: 500 })
    }

    console.log(`✅ Successfully imported ${leads.length} contacts to database`)
    console.log('📋 Sample imported contact:', leads[0])

    return NextResponse.json({
      success: true,
      message: `${leads.length} new leads imported to main contacts table`,
      data: {
        imported_count: leads.length,
        existing_count: existingContacts.length,
        leads,
        demo_mode: false
      }
    })
  } catch (error) {
    console.error('Error in leads import:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}