import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 300 // 5 minutes max execution time

// Main warming scheduler - runs every 15 minutes
export async function GET(request: NextRequest) {
  console.log('🔥 Warming Scheduler Started:', new Date().toISOString())
  
  try {
    // 1. Initialize warming campaigns for campaigns with "Warming" status
    await initializeWarmingCampaigns()
    
    // 2. Sync health scores with actual sender data
    await syncHealthScores()
    
    // 3. Reset daily counters if needed
    await resetDailyCounters()
    
    // 4. Schedule today's warming activities
    await scheduleWarmingActivities()
    
    // 5. Update warming phases based on progress
    await updateWarmingPhases()
    
    // 6. Check for graduation to Active status
    await checkForGraduation()
    
    console.log('✅ Warming Scheduler Completed Successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Warming scheduler completed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Warming Scheduler Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Warming scheduler failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Initialize warming campaigns for campaigns that just switched to "Warming" status
async function initializeWarmingCampaigns() {
  console.log('🚀 Initializing warming campaigns...')
  
  // Find campaigns with "Warming" status that don't have warming records yet
  const { data: warmingCampaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      user_id
    `)
    .eq('status', 'Warming')
  
  if (campaignsError) {
    console.error('Error fetching warming campaigns:', campaignsError)
    return
  }
  
  if (!warmingCampaigns || warmingCampaigns.length === 0) {
    console.log('No campaigns in warming status found')
    return
  }
  
  console.log(`Found ${warmingCampaigns.length} campaigns in warming status`)
  
  for (const campaign of warmingCampaigns) {
    // Fetch actual campaign senders from campaign_senders table
    const { data: campaignSenders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('email, name')
      .eq('campaign_id', campaign.id)
      .eq('is_selected', true)
    
    if (sendersError) {
      console.error(`Error fetching senders for campaign ${campaign.id}:`, sendersError)
      continue
    }
    
    // If no senders found, skip this campaign
    if (!campaignSenders || campaignSenders.length === 0) {
      console.log(`No senders found for campaign ${campaign.id} - skipping warming initialization`)
      continue
    }
    
    console.log(`Initializing warming for campaign ${campaign.id} with ${campaignSenders.length} senders:`, campaignSenders.map(s => s.email))
    
    // Initialize warming for each sender
    for (const sender of campaignSenders) {
      // Check if warming record already exists
      const { data: existingWarmup } = await supabase
        .from('warmup_campaigns')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('sender_email', sender.email)
        .single()
      
      if (existingWarmup) {
        console.log(`Warming already exists for ${sender.email} in campaign ${campaign.id}`)
        continue
      }
      
      // Get initial health score
      const initialHealthScore = await getInitialHealthScore(sender.email)
      
      // Create warming campaign record
      const { error: insertError } = await supabase
        .from('warmup_campaigns')
        .insert({
          campaign_id: campaign.id,
          sender_email: sender.email,
          sender_account_id: null, // Will be linked later if needed
          phase: 1,
          day_in_phase: 1,
          total_warming_days: 0,
          daily_target: 5, // Start with 5 emails per day
          initial_health_score: initialHealthScore,
          current_health_score: initialHealthScore,
          target_health_score: 90,
          status: 'active'
        })
      
      if (insertError) {
        console.error(`Error creating warming record for ${sender.email}:`, insertError)
      } else {
        console.log(`✅ Initialized warming for ${sender.email} in campaign ${campaign.id}`)
      }
    }
  }
}

// Sync actual sender health scores with warmup campaigns
async function syncHealthScores() {
  console.log('🔄 Syncing sender health scores with warming campaigns...')
  
  // Get all active warming campaigns
  const { data: warmupCampaigns, error: warmupError } = await supabase
    .from('warmup_campaigns')
    .select('id, campaign_id, sender_email')
    .eq('status', 'active')
  
  if (warmupError || !warmupCampaigns) {
    console.error('Error fetching warmup campaigns:', warmupError)
    return
  }
  
  for (const warmup of warmupCampaigns) {
    try {
      // Fetch actual health score for this sender
      // First try to get it from sender_accounts if email matches
      const { data: senderAccount } = await supabase
        .from('sender_accounts')
        .select('health_score')
        .eq('email', warmup.sender_email)
        .single()
      
      if (senderAccount && senderAccount.health_score !== null) {
        // Update warmup campaign with actual health score
        const { error: updateError } = await supabase
          .from('warmup_campaigns')
          .update({ 
            current_health_score: senderAccount.health_score,
            updated_at: new Date().toISOString()
          })
          .eq('id', warmup.id)
        
        if (updateError) {
          console.error(`Error updating health score for ${warmup.sender_email}:`, updateError)
        } else {
          console.log(`✅ Updated health score for ${warmup.sender_email}: ${senderAccount.health_score}`)
        }
      } else {
        // If no actual health score found, calculate a simulated one based on warming progress
        const { data: stats } = await supabase
          .from('warmup_daily_stats')
          .select('open_rate, reply_rate')
          .eq('warmup_campaign_id', warmup.id)
          .order('date', { ascending: false })
          .limit(7) // Last 7 days
        
        if (stats && stats.length > 0) {
          // Calculate average metrics
          const avgOpenRate = stats.reduce((sum, s) => sum + (s.open_rate || 0), 0) / stats.length
          const avgReplyRate = stats.reduce((sum, s) => sum + (s.reply_rate || 0), 0) / stats.length
          
          // Simple health score calculation
          // Base score of 50, +30 for good open rate, +20 for good reply rate
          let healthScore = 50
          if (avgOpenRate > 20) healthScore += 30
          else if (avgOpenRate > 10) healthScore += 20
          else if (avgOpenRate > 5) healthScore += 10
          
          if (avgReplyRate > 2) healthScore += 20
          else if (avgReplyRate > 1) healthScore += 15
          else if (avgReplyRate > 0.5) healthScore += 10
          
          // Update with calculated score
          await supabase
            .from('warmup_campaigns')
            .update({ 
              current_health_score: Math.min(healthScore, 100),
              updated_at: new Date().toISOString()
            })
            .eq('id', warmup.id)
          
          console.log(`📊 Calculated health score for ${warmup.sender_email}: ${healthScore}`)
        }
      }
    } catch (error) {
      console.error(`Error syncing health score for ${warmup.sender_email}:`, error)
    }
  }
  
  console.log('✅ Health scores sync completed')
}

// Reset daily counters at midnight
async function resetDailyCounters() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Reset warmup campaign daily counters (force reset for debugging)
  const { error: resetError } = await supabase
    .from('warmup_campaigns')
    .update({
      emails_sent_today: 0,
      opens_today: 0,
      replies_today: 0,
      clicks_today: 0,
      last_reset_at: now.toISOString()
    })
    // For now, force reset all campaigns to help with debugging
    // .lt('last_reset_at', todayStart.toISOString())
    .eq('status', 'active')
  
  if (resetError) {
    console.error('Error resetting daily counters:', resetError)
  } else {
    console.log('✅ Daily counters reset')
  }
  
  // Reset recipient daily counters
  const { error: recipientResetError } = await supabase
    .from('warmup_recipients')
    .update({
      emails_received_today: 0,
      last_reset_at: now.toISOString()
    })
    .lt('last_reset_at', todayStart.toISOString())
  
  if (recipientResetError) {
    console.error('Error resetting recipient counters:', recipientResetError)
  }
}

// Schedule warming activities for active warming campaigns
async function scheduleWarmingActivities() {
  console.log('📅 Scheduling warming activities...')
  
  // Get active warming campaigns that need more emails today
  const { data: allActiveWarmups, error } = await supabase
    .from('warmup_campaigns')
    .select('*')
    .eq('status', 'active')
  
  // Filter in JavaScript since Supabase column comparison is tricky
  const activeWarmups = allActiveWarmups?.filter(w => w.emails_sent_today < w.daily_target) || []
  
  if (error) {
    console.error('Error fetching active warmups:', error)
    return
  }
  
  console.log(`Found ${allActiveWarmups?.length || 0} total warmup campaigns`)
  console.log(`${activeWarmups.length} campaigns need more emails today`)
  
  if (!activeWarmups || activeWarmups.length === 0) {
    console.log('No active warmup campaigns need scheduling')
    return
  }
  
  console.log(`Scheduling activities for ${activeWarmups.length} warming campaigns`)
  console.log('Active warmups:', activeWarmups.map(w => ({ 
    id: w.id, 
    email: w.sender_email, 
    sent_today: w.emails_sent_today, 
    target: w.daily_target,
    phase: w.phase 
  })))
  
  for (const warmup of activeWarmups) {
    const emailsNeeded = warmup.daily_target - warmup.emails_sent_today
    console.log(`📧 Campaign ${warmup.campaign_id} - Sender ${warmup.sender_email}: needs ${emailsNeeded} more emails today`)
    
    if (emailsNeeded <= 0) {
      console.log(`✅ Warmup ${warmup.id} (${warmup.sender_email}) has reached daily target`)
      continue
    }
    
    console.log(`Scheduling ${emailsNeeded} emails for ${warmup.sender_email}`)
    
    // Get available recipients
    const { data: allRecipients, error: recipientsError } = await supabase
      .from('warmup_recipients')
      .select('*')
    
    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      continue
    }
    
    console.log(`Found ${allRecipients?.length || 0} total recipients`)
    console.log('Recipients:', allRecipients?.map(r => ({ email: r.email, is_active: r.is_active, received_today: r.emails_received_today, max_daily: r.max_daily_emails })))
    
    // Filter for active recipients within daily limits
    const recipients = allRecipients?.filter(r => 
      r.is_active === true && (r.emails_received_today || 0) < (r.max_daily_emails || 10)
    ).slice(0, emailsNeeded * 2) || [] // Limit and get more than needed for randomization
    
    console.log(`${recipients.length} recipients available for warming`)
    
    let finalRecipients = recipients
    if (!recipients || recipients.length === 0) {
      console.log('No available recipients for warming after filtering - USING ALL RECIPIENTS FOR TESTING')
      // For testing, use all recipients if filtering fails
      finalRecipients = allRecipients?.slice(0, emailsNeeded * 2) || []
      if (finalRecipients.length === 0) {
        console.log('No recipients at all found')
        continue
      }
    }
    
    // Schedule sending activities throughout the day
    const activities = []
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0) // Stop at 6 PM
    
    for (let i = 0; i < emailsNeeded && i < finalRecipients.length; i++) {
      const recipient = finalRecipients[Math.floor(Math.random() * finalRecipients.length)]
      
      // Schedule send time (spread throughout business hours)
      const sendTime = new Date(now.getTime() + (Math.random() * (endOfDay.getTime() - now.getTime())))
      
      // Get random template
      const template = await getRandomTemplate(warmup.phase)
      
      if (!template) continue
      
      activities.push({
        warmup_campaign_id: warmup.id,
        activity_type: 'send',
        recipient_email: recipient.email,
        subject: getRandomFromArray(template.subject_templates),
        content: getRandomFromArray(template.content_templates),
        scheduled_for: sendTime.toISOString(),
        details: {
          phase: warmup.phase,
          day_in_phase: warmup.day_in_phase,
          template_id: template.id
        }
      })
      
      // Schedule corresponding open activity (70-95% chance based on phase)
      const openChance = warmup.phase === 1 ? 0.75 : warmup.phase === 2 ? 0.85 : 0.90
      if (Math.random() < openChance) {
        const openTime = new Date(sendTime.getTime() + (Math.random() * 3600000)) // 0-1 hour after send
        
        activities.push({
          warmup_campaign_id: warmup.id,
          activity_type: 'open',
          recipient_email: recipient.email,
          scheduled_for: openTime.toISOString(),
          details: { related_to: 'send' }
        })
      }
      
      // Schedule reply activity (10-20% chance based on phase)
      const replyChance = warmup.phase === 1 ? 0.05 : warmup.phase === 2 ? 0.12 : 0.18
      if (Math.random() < replyChance) {
        const replyTime = new Date(sendTime.getTime() + (Math.random() * 7200000)) // 0-2 hours after send
        
        activities.push({
          warmup_campaign_id: warmup.id,
          activity_type: 'reply',
          recipient_email: recipient.email,
          content: getRandomReply(),
          scheduled_for: replyTime.toISOString(),
          details: { related_to: 'send' }
        })
      }
    }
    
    // Insert scheduled activities
    if (activities.length > 0) {
      const { error: insertError } = await supabase
        .from('warmup_activities')
        .insert(activities)
      
      if (insertError) {
        console.error(`Error scheduling activities for ${warmup.sender_email}:`, insertError)
      } else {
        console.log(`✅ Scheduled ${activities.length} activities for ${warmup.sender_email}`)
      }
    }
  }
}

// Update warming phases based on progress
async function updateWarmingPhases() {
  console.log('📈 Updating warming phases...')
  
  const { data: warmups, error } = await supabase
    .from('warmup_campaigns')
    .select('*')
    .eq('status', 'active')
  
  if (error || !warmups) return
  
  for (const warmup of warmups) {
    let shouldUpdate = false
    let newPhase = warmup.phase
    let newDayInPhase = warmup.day_in_phase + 1
    let newDailyTarget = warmup.daily_target
    
    // Phase progression logic
    if (warmup.phase === 1 && warmup.day_in_phase >= 7) {
      // Graduate to Phase 2 after 7 days
      newPhase = 2
      newDayInPhase = 1
      newDailyTarget = 15
      shouldUpdate = true
    } else if (warmup.phase === 2 && warmup.day_in_phase >= 14) {
      // Graduate to Phase 3 after 14 days in phase 2
      newPhase = 3
      newDayInPhase = 1
      newDailyTarget = 30
      shouldUpdate = true
    } else if (warmup.phase === 3 && warmup.day_in_phase >= 14) {
      // Complete warming after 14 days in phase 3
      shouldUpdate = true
    }
    
    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('warmup_campaigns')
        .update({
          phase: newPhase,
          day_in_phase: newDayInPhase,
          daily_target: newDailyTarget,
          total_warming_days: warmup.total_warming_days + 1
        })
        .eq('id', warmup.id)
      
      if (!updateError) {
        console.log(`✅ Updated ${warmup.sender_email} to phase ${newPhase}, day ${newDayInPhase}`)
      }
    }
  }
}

// Check if warming campaigns are ready to graduate to Active status
async function checkForGraduation() {
  console.log('🎓 Checking for graduation...')
  
  // Find warming campaigns that have completed all phases and have good health scores
  const { data: completedWarmups, error } = await supabase
    .from('warmup_campaigns')
    .select(`
      *,
      campaigns(id, user_id)
    `)
    .eq('status', 'active')
    .eq('phase', 3)
    .gte('day_in_phase', 14)
    .gte('current_health_score', 'target_health_score')
  
  if (error || !completedWarmups) return
  
  for (const warmup of completedWarmups) {
    // Mark warmup as completed
    await supabase
      .from('warmup_campaigns')
      .update({ status: 'completed' })
      .eq('id', warmup.id)
    
    // Check if all senders for this campaign have completed warming
    const { data: allWarmups } = await supabase
      .from('warmup_campaigns')
      .select('status')
      .eq('campaign_id', warmup.campaign_id)
    
    const allCompleted = allWarmups?.every(w => w.status === 'completed')
    
    if (allCompleted) {
      // Automatically set campaign to Active status
      await supabase
        .from('campaigns')
        .update({ status: 'Active' })
        .eq('id', warmup.campaign_id)
      
      console.log(`🎉 Campaign ${warmup.campaign_id} graduated to Active status!`)
    }
  }
}

// Helper functions
async function getInitialHealthScore(senderEmail: string): Promise<number> {
  // This would integrate with your existing health score system
  // For now, return a default score
  return 40
}

async function getRandomTemplate(phase: number) {
  const { data: templates } = await supabase
    .from('warmup_templates')
    .select('*')
    .eq('is_active', true)
    .or(`phase.is.null,phase.eq.${phase}`)
  
  if (!templates || templates.length === 0) return null
  
  return templates[Math.floor(Math.random() * templates.length)]
}

function getRandomFromArray(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomReply(): string {
  const replies = [
    'Thanks for reaching out!',
    'This looks interesting, tell me more.',
    'I appreciate the information.',
    'Thanks for sharing this with me.',
    'Sounds good, thanks!',
    'I\'ll take a look at this.',
    'Thanks for the update.',
    'Interesting, thanks for letting me know.'
  ]
  
  return getRandomFromArray(replies)
}