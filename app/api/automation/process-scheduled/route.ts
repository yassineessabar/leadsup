import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for scheduled processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('testMode') === 'true'
    const lookAheadMinutes = parseInt(searchParams.get('lookAhead') || '15') // Default 15 minutes lookahead
    
    console.log(`🕐 Processing scheduled emails - Test Mode: ${testMode}`)
    
    // Get emails that are due within the next 15 minutes (or specified lookahead)
    const now = new Date()
    const lookAheadTime = new Date(now.getTime() + (lookAheadMinutes * 60 * 1000))
    
    // Get contacts who are due for their next email in the sequence
    const { data: dueContacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50) // Check contacts to find due ones

    if (fetchError) {
      console.error('❌ Error fetching contacts:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 })
    }
    
    if (!dueContacts || dueContacts.length === 0) {
      console.log('✅ No contacts found for processing')
      return NextResponse.json({
        success: true,
        message: 'No contacts found',
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }
    
    // Filter contacts who are actually due for their next email
    const emailsDue = []
    
    for (const contact of dueContacts) {
      if (!contact.email || !contact.campaign_id) continue
      
      // Get campaign details
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('id', contact.campaign_id)
        .single()
      
      if (!campaign || campaign.status !== 'Active') continue
      
      // Get campaign sequences
      const { data: campaignSequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', contact.campaign_id)
        .order('step_number', { ascending: true })
      
      if (!campaignSequences || campaignSequences.length === 0) continue
      
      const currentStep = contact.sequence_step || 0
      
      // Check if there's a next step
      if (currentStep >= campaignSequences.length) continue // Sequence complete
      
      // Calculate when the next email should be sent
      const contactCreatedAt = new Date(contact.created_at)
      let cumulativeDays = 0
      
      // Calculate cumulative days up to current step
      for (let i = 0; i <= currentStep; i++) {
        const sequence = campaignSequences[i]
        if (sequence) {
          const timing = sequence.timing_days || (i === 0 ? 0 : 1)
          if (i === currentStep) {
            cumulativeDays += timing
            break
          } else if (i > 0) {
            cumulativeDays += timing
          }
        }
      }
      
      // Calculate scheduled send time
      const scheduledDate = new Date(contactCreatedAt)
      scheduledDate.setDate(scheduledDate.getDate() + cumulativeDays)
      
      // Add business hours (9-17, avoid weekends)
      const contactHash = String(contact.id).split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + (currentStep + 1)) % 1000
      const hour = 9 + (seedValue % 8) // 9-16
      const minute = (seedValue * 7) % 60
      scheduledDate.setHours(hour, minute, 0, 0)
      
      // Skip weekends
      const dayOfWeek = scheduledDate.getDay()
      if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1)
      if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2)
      
      // Check if email is due (within lookAhead window)
      if (scheduledDate <= lookAheadTime) {
        const nextSequence = campaignSequences[currentStep]
        if (nextSequence) {
          emailsDue.push({
            contact,
            campaign,
            sequence: nextSequence,
            scheduledFor: scheduledDate.toISOString(),
            currentStep: currentStep + 1 // Next step number
          })
        }
      }
    }
    
    if (emailsDue.length === 0) {
      console.log('✅ No emails due for processing')
      return NextResponse.json({
        success: true,
        message: 'No emails due for processing',
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`📧 Found ${emailsDue.length} emails due for processing`)
    
    let processedCount = 0
    let sentCount = 0
    let skippedCount = 0
    let errorCount = 0
    const results: any[] = []
    
    for (const emailJob of emailsDue) {
      try {
        processedCount++
        const { contact, sequence, scheduledFor, currentStep } = emailJob
        
        // Skip if contact has final status
        if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.status)) {
          skippedCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email,
            status: 'skipped',
            reason: `Contact status: ${contact.status}`
          })
          continue
        }
        
        // Get a sender for this campaign (simple round-robin for now)
        const { data: senders } = await supabase
          .from('campaign_senders')
          .select('email')
          .eq('campaign_id', contact.campaign_id)
          .eq('is_active', true)
          .eq('is_selected', true)
          .limit(1)
        
        if (!senders || senders.length === 0) {
          errorCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email,
            status: 'failed',
            reason: 'No active senders'
          })
          continue
        }
        
        // Send the email
        const sendResult = await sendSequenceEmail({
          contact,
          sequence,
          senderEmail: senders[0].email,
          testMode
        })
        
        if (sendResult.success) {
          // Update contact's sequence progress
          await updateContactSequenceProgress(contact.id, currentStep)
          
          sentCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email,
            sequenceStep: currentStep,
            status: 'sent',
            messageId: sendResult.messageId,
            testMode,
            scheduledFor
          })
          
          console.log(`✅ ${testMode ? '[TEST] ' : ''}Email sent: ${senders[0].email} → ${contact.email} (Step ${currentStep})`)
        } else {
          errorCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email,
            status: 'failed',
            error: sendResult.error
          })
          
          console.error(`❌ Email failed: ${contact.email} - ${sendResult.error}`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing contact ${emailJob.contact.id}:`, error)
        errorCount++
        results.push({
          contactId: emailJob.contact.id,
          contactEmail: emailJob.contact.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const executionTime = Date.now() - startTime
    const summary = {
      success: true,
      processed: processedCount,
      sent: sentCount,
      skipped: skippedCount,
      errors: errorCount,
      executionTimeMs: executionTime,
      testMode,
      timestamp: new Date().toISOString(),
      lookAheadMinutes,
      results
    }
    
    console.log(`🎯 Processing complete: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors (${executionTime}ms)`)
    
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('❌ Fatal error processing scheduled emails:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime
    }, { status: 500 })
  }
}

async function sendSequenceEmail({ contact, sequence, senderEmail, testMode }: any) {
  try {
    if (testMode) {
      // Simulate email sending
      return {
        success: true,
        messageId: `test_${Date.now()}_${contact.id}`,
        simulation: true
      }
    }
    
    // Check if we should send via SendGrid or simulate
    const SIMULATION_MODE = process.env.EMAIL_SIMULATION_MODE !== 'false'
    
    if (SIMULATION_MODE) {
      console.log(`🧪 SIMULATED SEQUENCE EMAIL:`)
      console.log(`   From: ${senderEmail}`)
      console.log(`   To: ${contact.email}`)
      console.log(`   Subject: ${sequence.subject}`)
      console.log(`   Step: ${sequence.step_number}`)
      
      return {
        success: true,
        messageId: `simulated_${Date.now()}_${contact.id}`,
        simulation: true
      }
    }
    
    // Real email sending via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      // Personalize content
      const personalizedSubject = sequence.subject
        .replace(/\{\{firstName\}\}/g, contact.first_name || 'there')
        .replace(/\{\{lastName\}\}/g, contact.last_name || '')
        .replace(/\{\{company\}\}/g, contact.company || 'your company')
      
      const personalizedContent = sequence.content
        .replace(/\{\{firstName\}\}/g, contact.first_name || 'there')
        .replace(/\{\{lastName\}\}/g, contact.last_name || '')
        .replace(/\{\{company\}\}/g, contact.company || 'your company')
      
      const msg = {
        to: contact.email,
        from: {
          email: senderEmail,
          name: senderEmail.split('@')[0]
        },
        subject: personalizedSubject,
        html: personalizedContent,
        text: personalizedContent.replace(/<[^>]*>/g, '') // Strip HTML
      }
      
      console.log(`📧 SENDING SEQUENCE EMAIL:`)
      console.log(`   From: ${senderEmail}`)
      console.log(`   To: ${contact.email}`)
      console.log(`   Subject: ${personalizedSubject}`)
      console.log(`   Step: ${sequence.step_number}`)
      
      const result = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || `sg_${Date.now()}_${contact.id}`,
        simulation: false
      }
    }
    
    // Fallback: simulation if no email service
    console.log(`⚠️  No SendGrid API key. Simulating email send.`)
    return {
      success: true,
      messageId: `fallback_${Date.now()}_${contact.id}`,
      simulation: true
    }
    
  } catch (error) {
    console.error('❌ Error sending sequence email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

async function updateContactSequenceProgress(contactId: number, sequenceStep: number) {
  try {
    // Update contact with latest sequence step and last contacted time
    const { error } = await supabase
      .from('contacts')
      .update({
        sequence_step: sequenceStep,
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
    
    if (error) {
      console.error('Error updating contact progress:', error)
    } else {
      console.log(`📝 Updated contact ${contactId} to step ${sequenceStep}`)
    }
  } catch (error) {
    console.error('Error in updateContactSequenceProgress:', error)
  }
}