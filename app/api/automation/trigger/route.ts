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

// POST endpoint to manually trigger automation workflows
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
    const { reviewId, eventType, testMode = false } = body

    if (!reviewId && !eventType) {
      return NextResponse.json(
        { success: false, error: "Either reviewId or eventType is required" },
        { status: 400 }
      )
    }

    let processedWorkflows = 0
    const results = []

    if (reviewId) {
      // Process automation for a specific review
      const result = await processAutomationForReview(reviewId, testMode)
      results.push(result)
      processedWorkflows += result.workflowsTriggered
    } else {
      // Process all pending automations for an event type
      const result = await processAutomationsForEventType(eventType, testMode)
      results.push(result)
      processedWorkflows += result.workflowsTriggered
    }

    return NextResponse.json({
      success: true,
      data: {
        processedWorkflows,
        results,
        testMode
      }
    })

  } catch (error) {
    console.error("Error in automation trigger:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to check for pending automations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('eventType')
    const processAll = searchParams.get('processAll') === 'true'

    if (processAll) {
      // Process all pending automations
      const result = await processAllPendingAutomations()
      return NextResponse.json({
        success: true,
        data: result
      })
    }

    // Just return pending automation count
    const pendingCount = await getPendingAutomationCount(eventType)

    return NextResponse.json({
      success: true,
      data: {
        pendingAutomations: pendingCount,
        eventType: eventType || 'all'
      }
    })

  } catch (error) {
    console.error("Error checking pending automations:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function processAutomationForReview(reviewId: string, testMode: boolean = false) {
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
    return { success: false, error: "Review not found", workflowsTriggered: 0 }
  }

  // Determine trigger event based on review rating
  let triggerEvent = ""
  if (review.rating >= 4) {
    triggerEvent = "positive_review"
  } else if (review.rating <= 2) {
    triggerEvent = "negative_review"
  } else {
    triggerEvent = "neutral_review"
  }

  // Get active automation workflows for this user and trigger event
  const { data: workflows, error: workflowError } = await supabase
    .from("automation_workflows")
    .select("*")
    .eq("user_id", review.user_id)
    .eq("trigger_event", triggerEvent)
    .eq("is_active", true)

  if (workflowError) {
    console.error("Error fetching workflows:", workflowError.message)
    return { success: false, error: "Failed to fetch workflows", workflowsTriggered: 0 }
  }

  if (!workflows || workflows.length === 0) {
    return { success: true, message: "No workflows to trigger", workflowsTriggered: 0 }
  }


  let triggeredCount = 0
  const workflowResults = []

  for (const workflow of workflows) {
    try {

      // Check if we need to delay this workflow
      if (workflow.delay_days && workflow.delay_days > 0) {
        const delayDate = new Date()
        delayDate.setDate(delayDate.getDate() + workflow.delay_days)

        // For now, we'll process immediately in test mode, but log the delay
        if (!testMode) {
          // In production, you'd want to schedule this for later execution
          // For now, we'll skip delayed workflows
          workflowResults.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            status: "scheduled",
            scheduledFor: delayDate.toISOString()
          })
          continue
        }
      }

      // Execute the workflow
      const result = await executeWorkflow(workflow, review, testMode)
      workflowResults.push(result)

      if (result.success) {
        triggeredCount++
      }

    } catch (workflowError) {
      console.error('Error processing workflow ' + workflow.id + ':', workflowError)
      workflowResults.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        success: false,
        error: workflowError.message
      })
    }
  }

  return {
    success: true,
    reviewId,
    triggerEvent,
    workflowsTriggered: triggeredCount,
    workflows: workflowResults
  }
}

async function executeWorkflow(workflow: any, review: any, testMode: boolean = false) {
  // Get customer information - try to find real customer first
  let customerName = review.customer_name || "Valued Customer"
  let customerEmail = review.customer_email
  let customerPhone = null

  // If we have a customer_id that's not anonymous, try to get real customer data
  if (review.customer_id && !review.customer_id.includes("anon")) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name, email, phone")
      .eq("id", review.customer_id)
      .eq("user_id", review.user_id)
      .single()

    if (customer) {
      customerName = customer.name || customerName
      customerEmail = customer.email || customerEmail
      customerPhone = customer.phone
    }
  }

  // Get user's review link for the template
  const { data: reviewLink } = await supabase
    .from("review_link")
    .select("review_url, company_name")
    .eq("user_id", review.user_id)
    .single()

  const trackableReviewUrl = reviewLink?.review_url
    ? `${reviewLink.review_url}?cid=${review.customer_id}`
    : "https://your-review-link.com"

  // Determine what type of workflow this is and execute accordingly
  if (workflow.email_template_id) {
    return await sendAutomationEmail(workflow, review, {
      customerName,
      customerEmail,
      companyName: reviewLink?.company_name || review.users?.company || "Your Company",
      reviewUrl: trackableReviewUrl,
      rating: review.rating
    }, testMode)
  } else if (workflow.sms_template_id) {
    return await sendAutomationSMS(workflow, review, {
      customerName,
      customerPhone,
      companyName: reviewLink?.company_name || review.users?.company || "Your Company",
      reviewUrl: trackableReviewUrl,
      rating: review.rating
    }, testMode)
  } else {
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: false,
      error: "No template configured"
    }
  }
}

async function sendAutomationEmail(workflow: any, review: any, data: any, testMode: boolean) {
  try {
    // Get email template
    const { data: template, error: templateError } = await supabase
      .from("review_templates")
      .select("*")
      .eq("id", workflow.email_template_id)
      .single()

    if (templateError || !template) {
      throw new Error("Email template not found")
    }

    // Personalize the email content
    const personalizedSubject = personalizeTemplate(template.subject || "Follow-up from {{companyName}}", data)
    const personalizedBody = personalizeTemplate(template.body, data)

    const emailContent = {
      from: `"${data.companyName}" <${process.env.FROM_EMAIL || 'noreply@yourcompany.com'}>`,
      to: data.customerEmail,
      subject: personalizedSubject,
      text: personalizedBody,
      html: createEmailHTML(personalizedSubject, personalizedBody, data)
    }

    if (testMode) {

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        success: true,
        type: "email",
        testMode: true,
        recipient: data.customerEmail,
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
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: true,
      type: "email",
      recipient: data.customerEmail,
      messageId: result.messageId
    }

  } catch (error) {
    console.error("Error sending automation email:", error)
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: false,
      type: "email",
      error: error.message
    }
  }
}

async function sendAutomationSMS(workflow: any, review: any, data: any, testMode: boolean) {
  try {
    if (!data.customerPhone) {
      throw new Error("No phone number available for SMS")
    }

    // Get SMS template
    const { data: template, error: templateError } = await supabase
      .from("review_templates")
      .select("*")
      .eq("id", workflow.sms_template_id)
      .single()

    if (templateError || !template) {
      throw new Error("SMS template not found")
    }

    // Personalize the SMS content
    const personalizedMessage = personalizeTemplate(template.body, data)

    if (testMode) {
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        success: true,
        type: "sms",
        testMode: true,
        recipient: data.customerPhone,
        message: personalizedMessage
      }
    }

    // Actually send the SMS
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    const message = await client.messages.create({
      body: personalizedMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: data.customerPhone
    })

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: true,
      type: "sms",
      recipient: data.customerPhone,
      messageSid: message.sid
    }

  } catch (error) {
    console.error("Error sending automation SMS:", error)
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: false,
      type: "sms",
      error: error.message
    }
  }
}

function personalizeTemplate(template: string, data: any): string {
  return template
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{companyName\}\}/g, data.companyName)
    .replace(/\{\{reviewUrl\}\}/g, data.reviewUrl)
    .replace(/\{\{rating\}\}/g, data.rating?.toString() || "")
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
          ${data.reviewUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.reviewUrl}"
               style="background: linear-gradient(135deg, #e66465 0%, #9198e5 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 25px;
                      font-weight: bold;
                      display: inline-block;">
              Leave a Review
            </a>
          </div>
          ` : ''}
        </div>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This email was sent from ${data.companyName}</p>
      </div>
    </div>
  `
}

async function processAutomationsForEventType(eventType: string, testMode: boolean) {
  // This would process all recent reviews that match the event type
  // For now, we'll implement a basic version
  return {
    success: true,
    eventType,
    workflowsTriggered: 0,
    message: "Event type processing not implemented yet"
  }
}

async function processAllPendingAutomations() {
  // This would process all pending automations
  // For now, we'll implement a basic version
  return {
    success: true,
    processedWorkflows: 0,
    message: "Batch processing not implemented yet"
  }
}

async function getPendingAutomationCount(eventType?: string | null) {
  // This would count pending automations
  // For now, return 0
  return 0
}