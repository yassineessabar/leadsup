const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncContactTimings(campaignId) {
  console.log(`🔄 Syncing contact timings for campaign ${campaignId}`)

  // Get campaign sequences
  const { data: campaignSequences, error: sequencesError } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('step')

  if (sequencesError) {
    console.error('Error fetching sequences:', sequencesError)
    return
  }

  // Get campaign settings
  const { data: campaignSettings, error: settingsError } = await supabase
    .from('campaign_settings')
    .select('*')
    .eq('campaign_id', campaignId)
    .single()

  if (settingsError) {
    console.error('Error fetching settings:', settingsError)
    return
  }

  // Get all contacts for this campaign
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .eq('campaign_id', campaignId)

  if (contactsError) {
    console.error('Error fetching contacts:', contactsError)
    return
  }

  console.log(`📊 Found ${contacts?.length || 0} contacts to sync`)

  for (const contact of contacts || []) {
    try {
      const currentStep = contact.sequence_step || 0
      let nextEmailDue = null

      // Calculate next email due using same logic as UI
      if (currentStep < (campaignSequences?.length || 0)) {
        const nextStep = currentStep === 0 ? 1 : currentStep + 1
        const sequence = campaignSequences?.find(s => s.step === nextStep - 1) // sequences are 0-indexed

        if (sequence) {
          const timingDays = sequence.timing_days !== undefined ? sequence.timing_days : (sequence.timing !== undefined ? sequence.timing : 0)
          
          if (timingDays === 0 && currentStep === 0) {
            // Use hash-based consistent timing for immediate emails
            const contactIdString = String(contact.id || '')
            const contactHash = contactIdString.split('').reduce((hash, char) => {
              return ((hash << 5) - hash) + char.charCodeAt(0)
            }, 0)
            
            const seedValue = (contactHash + 1) % 1000
            const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
            const consistentMinute = (seedValue * 7) % 60
            
            const scheduledDate = new Date()
            scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
            
            // If time has passed today, move to next business day
            const now = new Date()
            if (now >= scheduledDate) {
              scheduledDate.setDate(scheduledDate.getDate() + 1)
              
              // Skip inactive days
              const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              
              let dayOfWeek = scheduledDate.getDay()
              while (!activeDays.includes(dayNames[dayOfWeek])) {
                scheduledDate.setDate(scheduledDate.getDate() + 1)
                dayOfWeek = scheduledDate.getDay()
              }
            }
            
            nextEmailDue = scheduledDate.toISOString()
          } else if (timingDays > 0 && contact.last_contacted_at) {
            // Calculate based on last contact + timing days
            const lastContactDate = new Date(contact.last_contacted_at)
            const scheduledDate = new Date(lastContactDate)
            scheduledDate.setDate(scheduledDate.getDate() + timingDays)
            scheduledDate.setHours(9, 0, 0, 0)
            
            nextEmailDue = scheduledDate.toISOString()
          }
        }
      }

      // Update the contact with consistent timing
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ 
          next_email_due: nextEmailDue 
        })
        .eq('id', contact.id)

      if (updateError) {
        console.error(`❌ Failed to update contact ${contact.id}:`, updateError)
      } else {
        console.log(`✅ Updated ${contact.email}: next_email_due = ${nextEmailDue}`)
      }
    } catch (error) {
      console.error(`❌ Error processing contact ${contact.id}:`, error)
    }
  }
}

// Run the sync
const campaignId = 'ed08e451-55a7-4118-b69e-de13858034f6'
syncContactTimings(campaignId).then(() => {
  console.log('✅ Contact timing sync completed')
}).catch(error => {
  console.error('❌ Sync failed:', error)
})