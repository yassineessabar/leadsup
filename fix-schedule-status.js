const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixScheduleStatuses() {
  try {
    console.log('🔧 Fixing sequence schedule statuses based on current sequence_step...')
    
    // Get all contacts with schedules
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, sequence_schedule')
      .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
      .not('sequence_schedule', 'is', null)
    
    console.log(`📊 Found ${contacts.length} contacts with schedules`)
    
    for (const contact of contacts) {
      const currentStep = contact.sequence_step || 0
      const schedule = contact.sequence_schedule
      
      if (!schedule?.steps) continue
      
      console.log(`\n📧 Fixing ${contact.email} (sequence_step: ${currentStep})`)
      
      // Update step statuses based on current sequence_step
      const updatedSteps = schedule.steps.map(step => {
        let status = 'pending'
        if (step.step <= currentStep) {
          status = 'sent'
          console.log(`   Step ${step.step}: sent`)
        } else if (step.step === currentStep + 1) {
          status = 'pending'
          console.log(`   Step ${step.step}: pending (Up Next)`)
        } else {
          status = 'upcoming'
          console.log(`   Step ${step.step}: upcoming`)
        }
        
        return { ...step, status }
      })
      
      // Find next email due
      const nextStep = updatedSteps.find(step => step.step === currentStep + 1)
      const nextEmailDue = nextStep ? nextStep.scheduled_date : null
      
      const updateData = {
        sequence_schedule: { ...schedule, steps: updatedSteps }
      }
      
      if (nextEmailDue) {
        updateData.next_email_due = nextEmailDue
        console.log(`   Next due: ${new Date(nextEmailDue).toLocaleString('en-US', { timeZone: schedule.timezone })}`)
      } else {
        updateData.next_email_due = null
        console.log(`   Sequence complete`)
      }
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contact.id)
      
      if (error) {
        console.error(`❌ Error updating ${contact.email}:`, error.message)
      } else {
        console.log(`✅ Fixed ${contact.email}`)
      }
    }
    
    console.log('\n🏁 Finished fixing schedule statuses')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixScheduleStatuses()