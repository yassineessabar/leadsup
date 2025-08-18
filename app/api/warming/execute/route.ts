import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 300 // 5 minutes max execution time

// Activity executor - runs every 5 minutes to process scheduled activities
export async function GET(request: NextRequest) {
  console.log('⚡ Warming Activity Executor Started:', new Date().toISOString())
  
  try {
    // Get activities scheduled for execution (past due or within next 5 minutes)
    const now = new Date()
    const executeUntil = new Date(now.getTime() + 5 * 60 * 1000) // Next 5 minutes
    
    const { data: pendingActivities, error } = await supabase
      .from('warmup_activities')
      .select(`
        *,
        warmup_campaigns (
          id,
          campaign_id,
          sender_email,
          phase,
          day_in_phase,
          campaigns (
            id,
            name,
            user_id
          )
        )
      `)
      .is('executed_at', null) // Not yet executed
      .lte('scheduled_for', executeUntil.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process in batches
    
    if (error) {
      console.error('Error fetching pending activities:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    if (!pendingActivities || pendingActivities.length === 0) {
      console.log('No pending activities to execute')
      return NextResponse.json({
        success: true,
        message: 'No pending activities',
        executed: 0
      })
    }
    
    console.log(`Found ${pendingActivities.length} activities to execute`)
    
    let executed = 0
    let failed = 0
    
    // Process each activity
    for (const activity of pendingActivities) {
      try {
        const success = await executeActivity(activity)
        
        // Update activity record
        await supabase
          .from('warmup_activities')
          .update({
            executed_at: now.toISOString(),
            success: success
          })
          .eq('id', activity.id)
        
        if (success) {
          executed++
          await updateWarmupStats(activity)
        } else {
          failed++
        }
        
      } catch (error) {
        console.error(`Error executing activity ${activity.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('warmup_activities')
          .update({
            executed_at: now.toISOString(),
            success: false,
            error_message: error instanceof Error ? error.message : 'Execution failed'
          })
          .eq('id', activity.id)
        
        failed++
      }
    }
    
    console.log(`✅ Executed ${executed} activities, ${failed} failed`)
    
    return NextResponse.json({
      success: true,
      message: `Executed ${executed} activities`,
      executed,
      failed,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Activity Executor Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Activity executor failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Execute a single warming activity
async function executeActivity(activity: any): Promise<boolean> {
  const { activity_type, warmup_campaigns: warmup } = activity
  
  console.log(`Executing ${activity_type} for ${warmup.sender_email}`)
  
  switch (activity_type) {
    case 'send':
      return await executeSendActivity(activity, warmup)
    case 'open':
      return await executeOpenActivity(activity, warmup)
    case 'reply':
      return await executeReplyActivity(activity, warmup)
    case 'click':
      return await executeClickActivity(activity, warmup)
    default:
      console.error(`Unknown activity type: ${activity_type}`)
      return false
  }
}

// Execute email sending activity
async function executeSendActivity(activity: any, warmup: any): Promise<boolean> {
  try {
    const { subject, content, recipient_email } = activity
    
    // Check if we should actually send emails or simulate
    const EMAIL_SIMULATION_MODE = process.env.EMAIL_SIMULATION_MODE !== 'false'
    
    if (EMAIL_SIMULATION_MODE) {
      console.log(`🧪 SIMULATED EMAIL SEND:`)
      console.log(`   From: ${warmup.sender_email}`)
      console.log(`   To: ${recipient_email}`)
      console.log(`   Subject: ${subject}`)
      
      // Simulate successful send
      const messageId = `sim_warmup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Update activity with simulated message ID
      await supabase
        .from('warmup_activities')
        .update({
          message_id: messageId,
          details: { 
            ...activity.details, 
            simulated: true,
            sent_at: new Date().toISOString()
          }
        })
        .eq('id', activity.id)
      
      return true
    }
    
    // Real email sending via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      // Personalize content
      const personalizedContent = content
        .replace(/\{\{recipientName\}\}/g, recipient_email.split('@')[0])
        .replace(/\{\{senderName\}\}/g, warmup.sender_email.split('@')[0])
      
      const msg = {
        to: recipient_email,
        from: {
          email: warmup.sender_email,
          name: `${warmup.sender_email.split('@')[0]} Team`
        },
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>${personalizedContent}</p>
            <br>
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              ${warmup.sender_email.split('@')[0]} Team
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
              <p>This is a warming email to improve deliverability. Campaign ID: ${warmup.campaign_id}</p>
            </div>
          </div>
        `,
        text: personalizedContent + `\n\nBest regards,\n${warmup.sender_email.split('@')[0]} Team`,
        custom_args: {
          warming_campaign_id: warmup.id,
          campaign_id: warmup.campaign_id,
          activity_id: activity.id
        },
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
          subscription_tracking: { enable: false },
          ganalytics: { enable: false }
        }
      }
      
      console.log(`📧 SENDING REAL WARMING EMAIL:`)
      console.log(`   From: ${warmup.sender_email}`)
      console.log(`   To: ${recipient_email}`)
      console.log(`   Subject: ${subject}`)
      
      const result = await sgMail.send(msg)
      const messageId = result[0]?.headers?.['x-message-id'] || `sg_warmup_${Date.now()}`
      
      // Update activity with SendGrid message ID
      await supabase
        .from('warmup_activities')
        .update({
          message_id: messageId,
          sendgrid_message_id: messageId,
          details: { 
            ...activity.details, 
            sendgrid_response: result[0]?.statusCode,
            sent_at: new Date().toISOString()
          }
        })
        .eq('id', activity.id)
      
      return true
    }
    
    // Fallback simulation if no SendGrid
    console.log(`⚠️ No SendGrid API key configured, simulating send`)
    return true
    
  } catch (error) {
    console.error('Error sending warming email:', error)
    return false
  }
}

// Execute email opening activity (simulate engagement)
async function executeOpenActivity(activity: any, warmup: any): Promise<boolean> {
  try {
    console.log(`👁️ Simulating email open for ${warmup.sender_email}`)
    
    // In a real system, this might ping SendGrid's tracking pixel
    // For now, we'll just record the open
    
    await supabase
      .from('warmup_activities')
      .update({
        details: { 
          ...activity.details, 
          opened_at: new Date().toISOString(),
          user_agent: 'WarmupBot/1.0'
        }
      })
      .eq('id', activity.id)
    
    return true
    
  } catch (error) {
    console.error('Error simulating email open:', error)
    return false
  }
}

// Execute reply activity (simulate response)
async function executeReplyActivity(activity: any, warmup: any): Promise<boolean> {
  try {
    console.log(`💬 Simulating email reply for ${warmup.sender_email}`)
    
    const { content } = activity
    
    // In a real system, this might send an actual reply email
    // For now, we'll record the reply intent
    
    await supabase
      .from('warmup_activities')
      .update({
        details: { 
          ...activity.details, 
          replied_at: new Date().toISOString(),
          reply_content: content
        }
      })
      .eq('id', activity.id)
    
    return true
    
  } catch (error) {
    console.error('Error simulating email reply:', error)
    return false
  }
}

// Execute click activity (simulate link clicking)
async function executeClickActivity(activity: any, warmup: any): Promise<boolean> {
  try {
    console.log(`🖱️ Simulating email click for ${warmup.sender_email}`)
    
    await supabase
      .from('warmup_activities')
      .update({
        details: { 
          ...activity.details, 
          clicked_at: new Date().toISOString(),
          click_url: 'https://example.com/warmup-click'
        }
      })
      .eq('id', activity.id)
    
    return true
    
  } catch (error) {
    console.error('Error simulating email click:', error)
    return false
  }
}

// Update warming campaign statistics after successful activity
async function updateWarmupStats(activity: any): Promise<void> {
  try {
    const { activity_type, warmup_campaigns: warmup } = activity
    
    // Update daily counters
    const updateField = `${activity_type === 'send' ? 'emails_sent' : 
                         activity_type === 'open' ? 'opens' :
                         activity_type === 'reply' ? 'replies' : 'clicks'}_today`
    
    await supabase.rpc('increment_warmup_counter', {
      warmup_id: warmup.id,
      counter_field: updateField
    })
    
    // Update last activity timestamp
    await supabase
      .from('warmup_campaigns')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', warmup.id)
    
    // Update recipient counter for sends
    if (activity_type === 'send') {
      await supabase.rpc('increment_recipient_counter', {
        recipient_email: activity.recipient_email
      })
    }
    
  } catch (error) {
    console.error('Error updating warmup stats:', error)
  }
}

// POST method for manual activity execution (testing/debugging)
export async function POST(request: NextRequest) {
  try {
    const { activityId } = await request.json()
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID required' }, { status: 400 })
    }
    
    const { data: activity, error } = await supabase
      .from('warmup_activities')
      .select(`
        *,
        warmup_campaigns (
          *,
          campaigns (*)
        )
      `)
      .eq('id', activityId)
      .single()
    
    if (error || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    
    const success = await executeActivity(activity)
    
    await supabase
      .from('warmup_activities')
      .update({
        executed_at: new Date().toISOString(),
        success: success
      })
      .eq('id', activityId)
    
    if (success) {
      await updateWarmupStats(activity)
    }
    
    return NextResponse.json({
      success: true,
      activityId,
      executed: success
    })
    
  } catch (error) {
    console.error('Error in manual activity execution:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed'
    }, { status: 500 })
  }
}