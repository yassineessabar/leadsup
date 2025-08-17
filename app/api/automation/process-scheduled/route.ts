import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    console.log('🤖 Processing scheduled emails...')

    // Get all emails that are due to be sent (scheduled_date <= now and status = 'pending')
    const now = new Date()
    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select(`
        *,
        campaigns!inner(*),
        contacts!inner(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_date', now.toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('Error fetching scheduled emails:', fetchError)
      return NextResponse.json({ success: false, error: 'Failed to fetch scheduled emails' }, { status: 500 })
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No emails due for sending',
        processed: 0 
      })
    }

    console.log(`📧 Found ${scheduledEmails.length} emails ready to send`)

    let processedCount = 0
    let errorCount = 0

    for (const email of scheduledEmails) {
      try {
        // Skip if campaign is not active
        if (email.campaigns.status !== 'Active') {
          console.log(`⏭️ Skipping email for inactive campaign: ${email.campaigns.name}`)
          
          // Mark as paused if campaign is paused
          if (email.campaigns.status === 'Paused') {
            await supabase
              .from('scheduled_emails')
              .update({ status: 'paused' })
              .eq('id', email.id)
          }
          continue
        }

        // Skip if contact has unsubscribed or bounced
        if (['Unsubscribed', 'Bounced', 'Replied'].includes(email.contacts.status)) {
          console.log(`⏭️ Skipping email for contact status: ${email.contacts.status}`)
          
          await supabase
            .from('scheduled_emails')
            .update({ 
              status: 'cancelled',
              error_message: `Contact status: ${email.contacts.status}`
            })
            .eq('id', email.id)
          continue
        }

        // Here you would integrate with your email service (SendGrid, etc.)
        // For now, we'll just mark as sent and update contact progress
        
        console.log(`📤 Processing email: ${email.subject} to ${email.contacts.email}`)

        // Simulate email sending (replace with actual email service call)
        const emailSent = await simulateEmailSending(email)

        if (emailSent.success) {
          // Mark email as sent
          await supabase
            .from('scheduled_emails')
            .update({ 
              status: 'sent',
              sent_at: now.toISOString()
            })
            .eq('id', email.id)

          // Update contact's sequence progress
          await supabase
            .from('contacts')
            .update({ 
              sequence_step: email.step,
              status: `Email ${email.step}`,
              updated_at: now.toISOString()
            })
            .eq('id', email.contact_id)

          processedCount++
          console.log(`✅ Email sent successfully to ${email.contacts.email}`)
        } else {
          // Mark as failed
          await supabase
            .from('scheduled_emails')
            .update({ 
              status: 'failed',
              error_message: emailSent.error
            })
            .eq('id', email.id)

          errorCount++
          console.log(`❌ Failed to send email to ${email.contacts.email}: ${emailSent.error}`)
        }

      } catch (error) {
        console.error(`❌ Error processing email ${email.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', email.id)

        errorCount++
      }
    }

    console.log(`✅ Processed ${processedCount} emails successfully, ${errorCount} errors`)

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processedCount} emails`,
      processed: processedCount,
      errors: errorCount,
      total_scheduled: scheduledEmails.length
    })

  } catch (error) {
    console.error('❌ Error in process scheduled emails:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Simulate email sending (replace with actual email service integration)
async function simulateEmailSending(email: any): Promise<{ success: boolean; error?: string }> {
  // This is where you'd integrate with SendGrid, Mailgun, etc.
  // For now, we'll simulate success/failure
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate 95% success rate
    const success = Math.random() > 0.05
    
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Simulated email service error' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}