import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import nodemailer from "nodemailer"
import twilio from "twilio"

// Create Supabase client with service role key
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
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// POST endpoint to manually trigger campaign automation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { action, testMode = false, contactIds = [] } = body

    console.log(`🎯 Campaign automation triggered: Campaign ${campaignId}, Action: ${action}`)

    // Verify campaign ownership and status
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    let result

    switch (action) {
      case "trigger_new_client":
        result = await triggerNewClientAutomation(campaign, testMode, contactIds)
        break
      case "process_sequence":
        result = await processSequenceAutomation(campaign, testMode)
        break
      case "send_immediate":
        result = await sendImmediateAutomation(campaign, testMode, contactIds)
        break
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error("Error in campaign automation:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to check automation status and pending jobs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "status"

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    if (action === "status") {
      const status = await getCampaignAutomationStatus(campaignId)
      return NextResponse.json({ success: true, data: status })
    }

    if (action === "jobs") {
      const jobs = await getCampaignJobs(campaignId)
      return NextResponse.json({ success: true, data: jobs })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("Error getting campaign automation status:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function triggerNewClientAutomation(campaign: any, testMode: boolean, contactIds: string[] = []) {
  console.log(`📧 Triggering "New Client" automation for campaign: ${campaign.name}`)

  // Get campaign sequences
  const { data: sequences, error: sequencesError } = await supabase
    .from("campaign_sequences")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("step_number", { ascending: true })

  if (sequencesError || !sequences || sequences.length === 0) {
    return { success: false, error: "No sequences found for campaign" }
  }

  // Get campaign schedule settings
  const { data: schedule } = await supabase
    .from("campaign_schedules")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("is_active", true)
    .single()

  // Get contacts to enroll (either specified contacts or all recent new clients)
  let contacts = []
  
  if (contactIds.length > 0) {
    // Use specified contact IDs
    const { data: specifiedContacts } = await supabase
      .from("review_requests")
      .select("id, contact_name, contact_email, contact_phone, campaign_id, created_at, user_id")
      .in("id", contactIds)
      .eq("user_id", campaign.user_id)

    contacts = specifiedContacts || []
  } else {
    // Get recent contacts that haven't been enrolled in this campaign
    const { data: recentContacts } = await supabase
      .from("review_requests")
      .select("id, contact_name, contact_email, contact_phone, campaign_id, created_at, user_id")
      .eq("user_id", campaign.user_id)
      .is("campaign_id", null) // Not yet enrolled in any campaign
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .limit(50)

    contacts = recentContacts || []
  }

  if (contacts.length === 0) {
    return { 
      success: true, 
      message: "No eligible contacts found for enrollment",
      enrolledContacts: 0,
      scheduledJobs: 0
    }
  }

  let enrolledContacts = 0
  let scheduledJobs = 0
  const results = []

  for (const contact of contacts) {
    try {
      // Enroll contact in campaign
      const { error: enrollError } = await supabase
        .from("review_requests")
        .update({ 
          campaign_id: campaign.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", contact.id)

      if (enrollError) {
        console.error(`Error enrolling contact ${contact.id}:`, enrollError)
        continue
      }

      enrolledContacts++

      // Schedule sequence jobs for this contact
      for (const [index, sequence] of sequences.entries()) {
        const scheduledFor = calculateSequenceScheduleTime(
          index === 0 ? 0 : sequence.timing_days || 1, // First step immediate, others based on timing
          schedule
        )

        const jobData = {
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          sequence_id: sequence.id,
          review_request_id: contact.id,
          customer_name: contact.contact_name,
          customer_email: contact.contact_email,
          customer_phone: contact.contact_phone,
          step_number: sequence.step_number,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
          template_type: campaign.type.toLowerCase(), // "email" or "sms"
          created_at: new Date().toISOString()
        }

        const { data: job, error: jobError } = await supabase
          .from("automation_jobs")
          .insert(jobData)
          .select()
          .single()

        if (!jobError) {
          scheduledJobs++
          results.push({
            contactId: contact.id,
            stepNumber: sequence.step_number,
            jobId: job.id,
            scheduledFor: scheduledFor.toISOString(),
            testMode
          })
        }
      }

    } catch (error) {
      console.error(`Error processing contact ${contact.id}:`, error)
    }
  }

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
    enrolledContacts,
    scheduledJobs,
    totalContacts: contacts.length,
    results,
    testMode
  }
}

async function processSequenceAutomation(campaign: any, testMode: boolean) {
  console.log(`🔄 Processing sequence automation for campaign: ${campaign.name}`)

  // Get pending automation jobs for this campaign that are due
  const now = new Date()
  
  // Get contacts for this campaign first
  const { data: campaignContacts } = await supabase
    .from("review_requests")
    .select("id")
    .eq("campaign_id", campaign.id)
  
  const contactIds = campaignContacts?.map(contact => contact.id) || []
  
  const { data: pendingJobs, error: jobsError } = await supabase
    .from("automation_jobs")
    .select("*")
    .in("review_id", contactIds)
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50)

  if (jobsError || !pendingJobs || pendingJobs.length === 0) {
    return {
      success: true,
      message: "No pending jobs to process",
      processedJobs: 0
    }
  }

  let processedJobs = 0
  let successfulJobs = 0
  const results = []

  for (const job of pendingJobs) {
    try {
      let result

      // Get sequence data for this job
      const { data: sequence } = await supabase
        .from("campaign_sequences")
        .select("*")
        .eq("id", job.template_id)
        .single()
      
      // Add sequence data to job for processing
      const jobWithSequence = { ...job, campaign_sequences: sequence }

      if (campaign.type === "Email") {
        result = await processEmailSequenceJob(jobWithSequence, campaign, testMode)
      } else if (campaign.type === "SMS") {
        result = await processSMSSequenceJob(jobWithSequence, campaign, testMode)
      } else {
        result = { success: false, error: "Unknown campaign type" }
      }

      // Update job status
      const newStatus = result.success ? "completed" : "failed"
      const completedAt = result.success ? new Date().toISOString() : null

      await supabase
        .from("automation_jobs")
        .update({
          status: newStatus,
          completed_at: completedAt,
          error_message: result.error || null,
          processed_at: new Date().toISOString()
        })
        .eq("id", job.id)

      results.push({
        jobId: job.id,
        stepNumber: sequence?.step_number || 1,
        contactName: job.customer_name,
        success: result.success,
        error: result.error,
        testMode
      })

      processedJobs++
      if (result.success) {
        successfulJobs++
      }

    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error)
      
      // Mark job as failed
      await supabase
        .from("automation_jobs")
        .update({
          status: "failed",
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq("id", job.id)

      results.push({
        jobId: job.id,
        stepNumber: 1, // Default step number when error occurs
        contactName: job.customer_name,
        success: false,
        error: error.message,
        testMode
      })

      processedJobs++
    }
  }

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
    processedJobs,
    successfulJobs,
    failedJobs: processedJobs - successfulJobs,
    results,
    testMode
  }
}

async function sendImmediateAutomation(campaign: any, testMode: boolean, contactIds: string[] = []) {
  console.log(`⚡ Sending immediate automation for campaign: ${campaign.name}`)

  if (contactIds.length === 0) {
    return { success: false, error: "No contact IDs provided for immediate sending" }
  }

  // Get first sequence step for immediate sending
  const { data: firstSequence, error: sequenceError } = await supabase
    .from("campaign_sequences")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("step_number", 1)
    .single()

  if (sequenceError || !firstSequence) {
    return { success: false, error: "No sequence found for immediate sending" }
  }

  // Get specified contacts
  const { data: contacts, error: contactsError } = await supabase
    .from("review_requests")
    .select("id, contact_name, contact_email, contact_phone, campaign_id, created_at, user_id")
    .in("id", contactIds)
    .eq("user_id", campaign.user_id)

  if (contactsError || !contacts || contacts.length === 0) {
    return { success: false, error: "No valid contacts found" }
  }

  let sentCount = 0
  const results = []

  for (const contact of contacts) {
    try {
      let result

      if (campaign.type === "Email") {
        result = await sendEmailImmediately(firstSequence, contact, campaign, testMode)
      } else if (campaign.type === "SMS") {
        result = await sendSMSImmediately(firstSequence, contact, campaign, testMode)
      } else {
        result = { success: false, error: "Unknown campaign type" }
      }

      if (result.success) {
        sentCount++
      }

      results.push({
        contactId: contact.id,
        contactName: contact.contact_name,
        success: result.success,
        error: result.error,
        testMode
      })

    } catch (error) {
      console.error(`Error sending to contact ${contact.id}:`, error)
      results.push({
        contactId: contact.id,
        contactName: contact.contact_name,
        success: false,
        error: error.message,
        testMode
      })
    }
  }

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
    sentCount,
    totalContacts: contacts.length,
    results,
    testMode
  }
}

function calculateSequenceScheduleTime(delayDays: number, schedule?: any): Date {
  const now = new Date()
  
  if (delayDays === 0) {
    // Immediate sending - add 2 minutes to avoid overwhelming
    now.setMinutes(now.getMinutes() + 2)
    return now
  }

  // Add delay days
  now.setDate(now.getDate() + delayDays)

  // If schedule is provided, respect the time window
  if (schedule) {
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]

    // Check if today is allowed in the schedule
    if (schedule[dayName] === false) {
      // Find next allowed day
      let daysToAdd = 1
      while (daysToAdd <= 7) {
        const checkDate = new Date(now)
        checkDate.setDate(checkDate.getDate() + daysToAdd)
        const checkDayName = dayNames[checkDate.getDay()]
        
        if (schedule[checkDayName] === true) {
          now.setDate(now.getDate() + daysToAdd)
          break
        }
        daysToAdd++
      }
    }

    // Set time based on schedule
    if (schedule.from_time) {
      const [hour, minute] = schedule.from_time.replace(/[AP]M/i, '').trim().split(':')
      const isPM = schedule.from_time.toUpperCase().includes('PM')
      let scheduleHour = parseInt(hour)
      
      if (isPM && scheduleHour !== 12) {
        scheduleHour += 12
      } else if (!isPM && scheduleHour === 12) {
        scheduleHour = 0
      }

      now.setHours(scheduleHour, parseInt(minute) || 0, 0, 0)
    }
  }

  return now
}

async function processEmailSequenceJob(job: any, campaign: any, testMode: boolean) {
  if (!job.customer_email) {
    throw new Error("No customer email available")
  }

  const sequence = job.campaign_sequences
  if (!sequence) {
    throw new Error("Sequence data not found")
  }

  // Get user's company information
  const { data: user } = await supabase
    .from("users")
    .select("company, email")
    .eq("id", campaign.user_id)
    .single()

  const companyName = user?.company || "Your Company"

  // Personalize content
  const personalizedSubject = personalizeTemplate(sequence.subject || `Message from ${companyName}`, {
    customerName: job.customer_name || "Valued Customer",
    companyName
  })

  const personalizedContent = personalizeTemplate(sequence.content || "Thank you for your business!", {
    customerName: job.customer_name || "Valued Customer",
    companyName
  })

  if (testMode) {
    return {
      success: true,
      testMode: true,
      recipient: job.customer_email,
      subject: personalizedSubject
    }
  }

  // Send actual email
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const emailResult = await transporter.sendMail({
    from: `"${companyName}" <${process.env.FROM_EMAIL || 'noreply@yourcompany.com'}>`,
    to: job.customer_email,
    subject: personalizedSubject,
    text: personalizedContent,
    html: createEmailHTML(personalizedSubject, personalizedContent, {
      customerName: job.customer_name || "Valued Customer",
      companyName
    })
  })

  return {
    success: true,
    recipient: job.customer_email,
    messageId: emailResult.messageId
  }
}

async function processSMSSequenceJob(job: any, campaign: any, testMode: boolean) {
  if (!job.customer_phone) {
    throw new Error("No customer phone available")
  }

  const sequence = job.campaign_sequences
  if (!sequence) {
    throw new Error("Sequence data not found")
  }

  // Get user's company information
  const { data: user } = await supabase
    .from("users")
    .select("company")
    .eq("id", campaign.user_id)
    .single()

  const companyName = user?.company || "Your Company"

  // Personalize content
  const personalizedMessage = personalizeTemplate(sequence.content || "Thank you for your business!", {
    customerName: job.customer_name || "Valued Customer",
    companyName
  })

  if (testMode) {
    return {
      success: true,
      testMode: true,
      recipient: job.customer_phone,
      message: personalizedMessage
    }
  }

  // Send actual SMS
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  const message = await client.messages.create({
    body: personalizedMessage,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: job.customer_phone
  })

  return {
    success: true,
    recipient: job.customer_phone,
    messageSid: message.sid
  }
}

async function sendEmailImmediately(sequence: any, contact: any, campaign: any, testMode: boolean) {
  // Similar to processEmailSequenceJob but for immediate sending
  return await processEmailSequenceJob({
    customer_email: contact.contact_email,
    customer_name: contact.contact_name,
    campaign_sequences: sequence
  }, campaign, testMode)
}

async function sendSMSImmediately(sequence: any, contact: any, campaign: any, testMode: boolean) {
  // Similar to processSMSSequenceJob but for immediate sending
  return await processSMSSequenceJob({
    customer_phone: contact.contact_phone,
    customer_name: contact.contact_name,
    campaign_sequences: sequence
  }, campaign, testMode)
}

async function getCampaignAutomationStatus(campaignId: string) {
  // Return empty status since automation jobs are disabled
  const statusCounts = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  }

  return {
    campaignId,
    totalJobs: 0,
    statusBreakdown: statusCounts,
    lastProcessed: null,
    message: "Automation jobs disabled - using n8n for workflow automation"
  }
}

async function getCampaignJobs(campaignId: string) {
  // Return empty jobs list since automation jobs are disabled
  return {
    campaignId,
    jobs: [],
    message: "Automation jobs disabled - using n8n for workflow automation"
  }
}

function personalizeTemplate(template: string, data: any): string {
  return template
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{companyName\}\}/g, data.companyName)
    .replace(/\{\{firstName\}\}/g, data.customerName?.split(' ')[0] || data.customerName)
    .replace(/\[Name\]/g, data.customerName)
    .replace(/\[Company\]/g, data.companyName)
}

function createEmailHTML(subject: string, body: string, data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #e66465 0%, #9198e5 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${subject}</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">${body.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This email was sent from ${data.companyName}</p>
      </div>
    </div>
  `
}