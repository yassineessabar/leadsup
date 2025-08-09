import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import nodemailer from "nodemailer"
import twilio from "twilio"

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to check if user has Pro/Enterprise subscription
async function checkAutomationAccess(): Promise<{ hasAccess: boolean; userId?: string; error?: string }> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return { hasAccess: false, error: "Not authenticated" }
    }

    // Get user session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return { hasAccess: false, error: "Invalid session" }
    }

    // Get user subscription details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_type, subscription_status")
      .eq("id", session.user_id)
      .single()

    if (userError || !user) {
      return { hasAccess: false, error: "User not found" }
    }

    // Check if user has Pro or Enterprise subscription
    const hasActiveSubscription = user.subscription_type &&
      user.subscription_type !== 'free' &&
      user.subscription_status === 'active'

    const hasAutomationAccess = hasActiveSubscription &&
      (user.subscription_type === 'pro' || user.subscription_type === 'enterprise')

    return {
      hasAccess: hasAutomationAccess,
      userId: session.user_id,
      error: hasAutomationAccess ? undefined : "Automation features require Pro or Enterprise subscription"
    }

  } catch (error) {
    console.error("Error checking automation access:", error)
    return { hasAccess: false, error: "Internal server error" }
  }
}

// POST endpoint to schedule automation based on templates
export async function POST(request: NextRequest) {
  try {
    // Check if user has automation access
    const accessCheck = await checkAutomationAccess()
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: accessCheck.error },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, reviewId, eventType } = body

    if (!userId && !reviewId) {
      return NextResponse.json(
        { success: false, error: "Either userId or reviewId is required" },
        { status: 400 }
      )
    }

    let processedJobs = 0
    const results = []

    if (reviewId) {
      // Schedule automation for a specific review
      const result = await scheduleAutomationForReview(reviewId)
      results.push(result)
      processedJobs += result.jobsScheduled || 0
    } else if (userId) {
      // Schedule automation for all recent customer interactions for a user
      const result = await scheduleAutomationForUser(userId, eventType)
      results.push(result)
      processedJobs += result.jobsScheduled || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        processedJobs,
        results
      }
    })

  } catch (error) {
    console.error("Error in automation scheduler:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to process pending scheduled automations
export async function GET(request: NextRequest) {
  try {
    // Check if user has automation access
    const accessCheck = await checkAutomationAccess()
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: accessCheck.error },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'process_pending'
    const testMode = searchParams.get('testMode') === 'true'

    if (action === 'process_pending') {
      const result = await processPendingAutomations(testMode)
      return NextResponse.json({
        success: true,
        data: result
      })
    }

    if (action === 'list_pending') {
      const result = await listPendingJobs()
      return NextResponse.json({
        success: true,
        data: result
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("Error processing automation scheduler GET:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function scheduleAutomationForReview(reviewId: string) {
  // Get the review details
  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .select(`
      *,
      users (
        id,
        email,
        company,
        subscription_type,
        subscription_status
      )
    `)
    .eq("id", reviewId)
    .single()

  if (reviewError || !review) {
    console.error("Review not found:", reviewError?.message)
    return { success: false, error: "Review not found", jobsScheduled: 0 }
  }

  // Get user's email and SMS templates
  const { data: emailTemplate } = await supabase
    .from("email_templates")
    .select("*")
    .eq("user_id", review.user_id)
    .single()

  const { data: smsTemplate } = await supabase
    .from("sms_templates")
    .select("*")
    .eq("user_id", review.user_id)
    .single()

  let jobsScheduled = 0
  const scheduledJobs = []

  // Schedule email automation if template exists
  if (emailTemplate) {
    const emailJob = await scheduleEmailJob(emailTemplate, review)
    if (emailJob.success) {
      scheduledJobs.push(emailJob)
      jobsScheduled++
    }
  }

  // Schedule SMS automation if template exists
  if (smsTemplate) {
    const smsJob = await scheduleSMSJob(smsTemplate, review)
    if (smsJob.success) {
      scheduledJobs.push(smsJob)
      jobsScheduled++
    }
  }

  return {
    success: true,
    reviewId,
    jobsScheduled,
    scheduledJobs
  }
}

async function scheduleEmailJob(template: any, review: any) {
  try {
    // Calculate when to send based on initial_trigger and initial_wait_days
    const scheduledFor = calculateScheduleTime(
      template.initial_trigger,
      template.initial_wait_days || 0
    )

    // Create automation job record
    const jobData = {
      user_id: review.user_id,
      review_id: review.id,
      template_id: template.id,
      template_type: 'email',
      customer_id: review.customer_id,
      customer_name: review.customer_name,
      customer_email: review.customer_email,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
      trigger_type: template.initial_trigger,
      wait_days: template.initial_wait_days || 0,
      created_at: new Date().toISOString()
    }

    const { data: job, error } = await supabase
      .from("automation_jobs")
      .insert(jobData)
      .select()
      .single()

    if (error) {
      console.error("Error creating email job:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      jobId: job.id,
      type: 'email',
      scheduledFor: scheduledFor.toISOString(),
      triggerType: template.initial_trigger,
      waitDays: template.initial_wait_days || 0
    }

  } catch (error) {
    console.error("Error scheduling email job:", error)
    return { success: false, error: error.message }
  }
}

async function scheduleSMSJob(template: any, review: any) {
  try {
    // Only schedule SMS if customer has phone number
    let customerPhone = null

    // Try to get phone from customer record
    if (review.customer_id && !review.customer_id.includes("anon")) {
      const { data: customer } = await supabase
        .from("customers")
        .select("phone")
        .eq("id", review.customer_id)
        .eq("user_id", review.user_id)
        .single()

      customerPhone = customer?.phone
    }

    if (!customerPhone) {
      return { success: false, error: "No phone number available" }
    }

    // Calculate when to send based on initial_trigger and initial_wait_days
    const scheduledFor = calculateScheduleTime(
      template.initial_trigger,
      template.initial_wait_days || 0
    )

    // Create automation job record
    const jobData = {
      user_id: review.user_id,
      review_id: review.id,
      template_id: template.id,
      template_type: 'sms',
      customer_id: review.customer_id,
      customer_name: review.customer_name,
      customer_phone: customerPhone,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
      trigger_type: template.initial_trigger,
      wait_days: template.initial_wait_days || 0,
      created_at: new Date().toISOString()
    }

    const { data: job, error } = await supabase
      .from("automation_jobs")
      .insert(jobData)
      .select()
      .single()

    if (error) {
      console.error("Error creating SMS job:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      jobId: job.id,
      type: 'sms',
      scheduledFor: scheduledFor.toISOString(),
      triggerType: template.initial_trigger,
      waitDays: template.initial_wait_days || 0
    }

  } catch (error) {
    console.error("Error scheduling SMS job:", error)
    return { success: false, error: error.message }
  }
}

function calculateScheduleTime(trigger: string, waitDays: number): Date {
  const now = new Date()

  switch (trigger) {
    case 'immediate':
      // Send immediately (within next 5 minutes to avoid overwhelming)
      now.setMinutes(now.getMinutes() + 5)
      return now

    case 'after_purchase':
    case 'after_interaction':
      // Send after specified wait days
      now.setDate(now.getDate() + waitDays)
      return now

    case 'weekly':
      // Send next week at same time
      now.setDate(now.getDate() + 7)
      return now

    case 'monthly':
      // Send next month at same time
      now.setMonth(now.getMonth() + 1)
      return now

    default:
      // Default to wait days
      now.setDate(now.getDate() + (waitDays || 1))
      return now
  }
}

async function processPendingAutomations(testMode: boolean = false) {
  // Get all pending jobs that are due to be sent
  const now = new Date().toISOString()

  const { data: pendingJobs, error } = await supabase
    .from("automation_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(50) // Process max 50 jobs at a time

  if (error) {
    console.error("Error fetching pending jobs:", error)
    return { success: false, error: error.message }
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    return {
      success: true,
      message: "No pending automation jobs to process",
      processedJobs: 0
    }
  }

  let processedCount = 0
  let successCount = 0
  const results = []

  for (const job of pendingJobs) {
    try {

      // Get the template and user data separately
      let template = null
      let user = null

      if (job.template_type === 'email') {
        const { data: emailTemplate } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", job.template_id)
          .single()
        template = emailTemplate
      } else if (job.template_type === 'sms') {
        const { data: smsTemplate } = await supabase
          .from("sms_templates")
          .select("*")
          .eq("id", job.template_id)
          .single()
        template = smsTemplate
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, company, email")
        .eq("id", job.user_id)
        .single()
      user = userData

      // Add template and user data to job object
      const enrichedJob = {
        ...job,
        email_templates: job.template_type === 'email' ? template : null,
        sms_templates: job.template_type === 'sms' ? template : null,
        users: user
      }

      let result
      if (job.template_type === 'email') {
        result = await processEmailJob(enrichedJob, testMode)
      } else if (job.template_type === 'sms') {
        result = await processSMSJob(enrichedJob, testMode)
      } else {
        result = { success: false, error: "Unknown template type" }
      }

      // Update job status
      const newStatus = result.success ? 'completed' : 'failed'
      const completedAt = result.success ? new Date().toISOString() : null

      await supabase
        .from("automation_jobs")
        .update({
          status: newStatus,
          completed_at: completedAt,
          error_message: result.error || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id)

      results.push({
        jobId: job.id,
        type: job.template_type,
        success: result.success,
        error: result.error,
        testMode
      })

      processedCount++
      if (result.success) {
        successCount++
      }

    } catch (error) {
      console.error('Error processing job ' + job.id + ':', error)

      // Mark job as failed
      await supabase
        .from("automation_jobs")
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id)

      results.push({
        jobId: job.id,
        type: job.template_type,
        success: false,
        error: error.message
      })

      processedCount++
    }
  }

  return {
    success: true,
    processedJobs: processedCount,
    successfulJobs: successCount,
    failedJobs: processedCount - successCount,
    results,
    testMode
  }
}

async function processEmailJob(job: any, testMode: boolean) {
  try {
    if (!job.customer_email) {
      throw new Error("No customer email available")
    }

    if (!job.email_templates) {
      throw new Error("Email template not found")
    }

    const template = job.email_templates
    const companyName = job.users?.company || "Your Company"

    // Get user's review link for personalization
    const { data: reviewLink } = await supabase
      .from("review_link")
      .select("review_url, company_name")
      .eq("user_id", job.user_id)
      .single()

    const trackableReviewUrl = reviewLink?.review_url
      ? reviewLink.review_url + '?cid=' + job.customer_id
      : "https://your-review-link.com"

    // Personalize the email content
    const personalizedSubject = personalizeTemplate(template.subject || "We'd love your feedback!", {
      customerName: job.customer_name || "Valued Customer",
      companyName: reviewLink?.company_name || companyName,
      reviewUrl: trackableReviewUrl
    })

    const personalizedContent = personalizeTemplate(template.content, {
      customerName: job.customer_name || "Valued Customer",
      companyName: reviewLink?.company_name || companyName,
      reviewUrl: trackableReviewUrl
    })

    const emailContent = {
      from: '"' + companyName + '" <' + (template.from_email || process.env.FROM_EMAIL || 'noreply@yourcompany.com') + '>',
      to: job.customer_email,
      subject: personalizedSubject,
      text: personalizedContent,
      html: createEmailHTML(personalizedSubject, personalizedContent, {
        customerName: job.customer_name || "Valued Customer",
        companyName: reviewLink?.company_name || companyName,
        reviewUrl: trackableReviewUrl
      })
    }

    if (testMode) {

      return {
        success: true,
        testMode: true,
        recipient: job.customer_email,
        subject: personalizedSubject
      }
    }

    // Actually send the email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const result = await transporter.sendMail(emailContent)

    return {
      success: true,
      recipient: job.customer_email,
      messageId: result.messageId
    }

  } catch (error) {
    console.error("Error processing email job:", error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function processSMSJob(job: any, testMode: boolean) {
  try {
    if (!job.customer_phone) {
      throw new Error("No customer phone available")
    }

    if (!job.sms_templates) {
      throw new Error("SMS template not found")
    }

    const template = job.sms_templates
    const companyName = job.users?.company || "Your Company"

    // Get user's review link for personalization
    const { data: reviewLink } = await supabase
      .from("review_link")
      .select("review_url, company_name")
      .eq("user_id", job.user_id)
      .single()

    const trackableReviewUrl = reviewLink?.review_url
      ? reviewLink.review_url + '?cid=' + job.customer_id
      : "https://your-review-link.com"

    // Personalize the SMS content
    const personalizedMessage = personalizeTemplate(template.content, {
      customerName: job.customer_name || "Valued Customer",
      companyName: reviewLink?.company_name || companyName,
      reviewUrl: trackableReviewUrl
    })

    if (testMode) {
      return {
        success: true,
        testMode: true,
        recipient: job.customer_phone,
        message: personalizedMessage
      }
    }

    // Actually send the SMS
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

  } catch (error) {
    console.error("Error processing SMS job:", error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function scheduleAutomationForUser(userId: string, eventType?: string) {
  // This would schedule automation for all recent customer interactions for a user
  // For now, we'll implement a basic version
  return {
    success: true,
    userId,
    eventType,
    jobsScheduled: 0,
    message: "User-based scheduling not implemented yet"
  }
}

async function listPendingJobs() {
  const { data: jobs, error } = await supabase
    .from("automation_jobs")
    .select(`
      *,
      users (company, email)
    `)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true })
    .limit(100)

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    pendingJobs: jobs || [],
    count: jobs?.length || 0
  }
}

function personalizeTemplate(template: string, data: any): string {
  return template
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{companyName\}\}/g, data.companyName)
    .replace(/\{\{reviewUrl\}\}/g, data.reviewUrl)
    .replace(/\[Name\]/g, data.customerName)
    .replace(/\[Company\]/g, data.companyName)
    .replace(/\[reviewUrl\]/g, data.reviewUrl)
}

function createEmailHTML(subject: string, body: string, data: any): string {
  // Use simple HTML without template literals to avoid parsing issues
  let html = '<!DOCTYPE html>'
  html += '<html lang="en">'
  html += '<head>'
  html += '<meta charset="UTF-8">'
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
  html += '<title>' + subject + '</title>'
  html += '<style>'
  html += '* { box-sizing: border-box; margin: 0; padding: 0; }'
  html += 'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; }'
  html += '</style>'
  html += '</head>'
  html += '<body style="margin: 0; padding: 0; background-color: #f8fafc;">'
  html += '<div style="max-width: 650px; margin: 0 auto; background-color: white; font-family: sans-serif;">'
  html += '<div style="background-color: white; padding: 24px;">'
  html += '<div style="height: 48px;"></div>'
  html += '<div style="text-align: center; margin-bottom: 24px;">'
  html += '<h2 style="font-size: 20px; font-weight: bold; color: #1f2937;">' + (data.customerName || 'Valued Customer') + '</h2>'
  html += '</div>'
  html += '<div style="text-align: center; margin-bottom: 32px; padding: 0 40px;">'
  html += '<p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">'
  html += 'We hope you loved your recent experience with <strong style="color: #8b5cf6;">' + (data.companyName || 'Your Company') + '</strong>! Your opinion means the world to us.'
  html += '</p>'
  html += '<p style="color: #374151; line-height: 1.6;">Would you mind taking just 30 seconds to share your thoughts?</p>'
  html += '</div>'
  
  if (data.reviewUrl) {
    html += '<div style="text-align: center; margin-bottom: 24px;">'
    html += '<a href="' + data.reviewUrl + '" target="_blank" style="display: inline-block; background: linear-gradient(to right, #a78bfa, #06b6d4); color: white; padding: 12px 32px; border-radius: 9999px; font-weight: 600; text-decoration: none;">'
    html += 'SHARE YOUR EXPERIENCE'
    html += '</a>'
    html += '</div>'
  }
  
  html += '<div style="text-align: center; margin-bottom: 24px;">'
  html += '<p style="color: #374151; margin-bottom: 8px;">Thank you for being an amazing customer!</p>'
  html += '<p style="color: #6b7280; font-style: italic;">With gratitude,</p>'
  html += '<p style="color: #1f2937; font-weight: 600;">The ' + (data.companyName || 'Your Business') + ' Team</p>'
  html += '</div>'
  html += '<div style="height: 32px;"></div>'
  html += '</div>'
  html += '<div style="background-color: black; color: white; padding: 24px; text-align: center; font-size: 14px;">'
  html += '<p style="margin-bottom: 8px;">You\'re receiving this email because a business you interacted with uses Loop Review.</p>'
  html += '<p>© ' + new Date().getFullYear() + ' Loop Review. All rights reserved.</p>'
  html += '</div>'
  html += '</div>'
  html += '</body>'
  html += '</html>'
  
  return html
}