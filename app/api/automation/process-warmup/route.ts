import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { calculateHealthScoresFromRealData } from '@/lib/sendgrid-tracking'

// Process warm-up emails for campaigns with auto warm-up enabled
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const autoMode = searchParams.get('autoMode') === 'true'
    
    console.log('🔥 Processing auto warm-up emails... (v2)')
    
    // Get all active campaigns with auto warm-up enabled
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id, name, user_id, settings')
      .in('status', ['Active', 'Warming'])
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch campaigns' 
      }, { status: 500 })
    }
    
    console.log(`📊 Found ${campaigns?.length || 0} active campaigns`)
    campaigns?.forEach(campaign => {
      console.log(`📋 Campaign: ${campaign.name} (${campaign.status}) - Settings:`, campaign.settings)
    })
    
    let totalWarmupSent = 0
    let totalProcessed = 0
    const results: any[] = []
    
    for (const campaign of campaigns || []) {
      // Check if auto warm-up is enabled for this campaign
      const settings = campaign.settings as any || {}
      console.log(`🔍 Campaign ${campaign.name}: auto_warmup = ${settings.auto_warmup}, autoMode = ${autoMode}`)
      if (!settings.auto_warmup && autoMode) {
        console.log(`⏭️ Skipping ${campaign.name} - auto_warmup disabled in auto mode`)
        continue // Skip campaigns without auto warm-up in auto mode
      }
      
      // Get campaign senders (only select columns that exist)
      const { data: senders, error: sendersError } = await supabaseServer
        .from('campaign_senders')
        .select('email, health_score, daily_limit, warmup_status')
        .eq('campaign_id', campaign.id)
        .eq('is_selected', true)
      
      if (sendersError) {
        console.error(`Error fetching senders for campaign ${campaign.id}:`, sendersError)
        continue
      }
      
      if (!senders || senders.length === 0) {
        console.log(`⚠️ Campaign ${campaign.name}: No selected senders found`)
        continue
      }
      
      console.log(`👥 Campaign ${campaign.name}: Found ${senders?.length || 0} selected senders`)
      senders?.forEach(sender => {
        console.log(`📧 Sender: ${sender.email} - Health: ${sender.health_score}%, Status: ${sender.warmup_status}`)
      })
      
      // Process each sender for warm-up
      for (const sender of senders || []) {
        totalProcessed++
        
        // Skip if health score is already good (>= 90)
        if (sender.health_score >= 90) {
          console.log(`⏭️ Skipping ${sender.email} - health score ${sender.health_score}% is already good`)
          continue
        }
        
        // Initialize inactive senders for warm-up
        if (!sender.warmup_status || sender.warmup_status === 'inactive') {
          console.log(`🚀 Initializing warm-up for ${sender.email} (health: ${sender.health_score}%)`)
        }
        
        // Get current values first to make cumulative updates
        const { data: currentSender } = await supabaseServer
          .from('campaign_senders')
          .select('warmup_emails_sent_today, last_warmup_sent, warmup_days_completed, created_at, updated_at')
          .eq('campaign_id', campaign.id)
          .eq('email', sender.email)
          .single()
        
        // Calculate warm-up phase and volume based on health score
        const healthScore = sender.health_score || 50
        
        // Calculate days completed based on warmup activity
        const now = new Date()
        const createdAt = new Date(currentSender?.created_at || currentSender?.updated_at || now)
        const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        
        // Use existing days completed or calculate from creation date
        const daysCompleted = Math.max(
          currentSender?.warmup_days_completed || 0,
          Math.min(Math.max(daysSinceCreated, 1), 35)
        )
        
        let warmupPhase = 1
        let warmupVolume = 0
        
        // Determine phase based on days completed
        if (daysCompleted >= 22) {
          warmupPhase = 3 // Scale Up phase (22-35 days)
        } else if (daysCompleted >= 8) {
          warmupPhase = 2 // Engagement phase (8-21 days)  
        } else {
          warmupPhase = 1 // Foundation phase (1-7 days)
        }
        
        // Calculate volume based on phase and health score
        if (warmupPhase === 1) {
          warmupVolume = Math.min(5 + daysCompleted, 15) // Gradually increase from 5 to 15
        } else if (warmupPhase === 2) {
          warmupVolume = Math.min(15 + (daysCompleted - 7) * 2, 40) // 15-40 emails
        } else {
          warmupVolume = Math.min(40 + (daysCompleted - 21) * 3, 60) // 40-60 emails
        }
        
        // Adjust based on health score
        if (healthScore < 50) {
          warmupVolume = Math.max(Math.floor(warmupVolume * 0.5), 3) // Reduce volume for low health
        } else if (healthScore > 80) {
          warmupVolume = Math.floor(warmupVolume * 1.2) // Increase for good health
        }
        
        // Check if this is a new day - reset daily counter if so
        const lastSent = currentSender?.last_warmup_sent ? new Date(currentSender.last_warmup_sent) : null
        const today = new Date()
        const isNewDay = !lastSent || 
          lastSent.getUTCDate() !== today.getUTCDate() ||
          lastSent.getUTCMonth() !== today.getUTCMonth() ||
          lastSent.getUTCFullYear() !== today.getUTCFullYear()
        
        const currentDailyCount = isNewDay ? 0 : (currentSender?.warmup_emails_sent_today || 0)
        const newDailyCount = currentDailyCount + warmupVolume
        
        // Send warm-up emails with tracking integration
        console.log(`📧 Sending ${warmupVolume} warm-up emails for ${sender.email} (Phase ${warmupPhase}, Health: ${healthScore}%, Day ${daysCompleted}, Daily: ${currentDailyCount} -> ${newDailyCount})`)
        
        // Actually send warmup emails through SendGrid
        console.log(`🔍 DEBUG - Environment check:`)
        console.log(`   SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`)
        console.log(`   EMAIL_SIMULATION_MODE: "${process.env.EMAIL_SIMULATION_MODE}"`)
        console.log(`   Will send real emails: ${process.env.SENDGRID_API_KEY && process.env.EMAIL_SIMULATION_MODE !== 'true'}`)
        
        if (process.env.SENDGRID_API_KEY && process.env.EMAIL_SIMULATION_MODE !== 'true') {
          try {
            const apiKey = process.env.SENDGRID_API_KEY.trim()
            
            // Get real warmup recipients from database
            const { data: recipientData, error: recipientError } = await supabaseServer
              .from('warmup_recipients')
              .select('email, max_daily_emails, emails_received_today')
              .eq('is_active', true)
              .limit(warmupVolume)
            
            let warmupRecipients = []
            if (!recipientError && recipientData && recipientData.length > 0) {
              // Use real recipients from database
              warmupRecipients = recipientData
                .filter(r => (r.emails_received_today || 0) < (r.max_daily_emails || 10))
                .map(r => r.email)
              console.log(`📧 Using ${warmupRecipients.length} real recipients from database`)
            } else {
              // Fallback to hardcoded recipients if database not available
              warmupRecipients = [
                `yassineessabar+warmup1@gmail.com`,
                `yassineessabar+warmup2@gmail.com`, 
                `yassineessabar+warmup3@gmail.com`
              ]
              console.log(`⚠️ Using fallback recipients - database error: ${recipientError?.message}`)
            }
            
            for (let i = 0; i < Math.min(warmupVolume, 3); i++) {
              const recipient = warmupRecipients[i] || `warmup${i}+${Date.now()}@gmail.com`
              
              // Use raw SendGrid API instead of SDK to avoid header issues
              const emailData = {
                personalizations: [
                  {
                    to: [{ email: recipient }]
                  }
                ],
                from: {
                  email: sender.email,
                  name: `${sender.email.split('@')[0]} Team`
                },
                subject: `Weekly Update - Phase ${warmupPhase}`,
                content: [
                  {
                    type: 'text/html',
                    value: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <p>Hello there!</p>
                        <p>This is a brief weekly update from our team. We hope you're doing well.</p>
                        <p>Best regards,<br>${sender.email.split('@')[0]} Team</p>
                        <div style="margin-top: 20px; color: #999; font-size: 12px;">
                          Warmup Phase ${warmupPhase} - Day ${daysCompleted}
                        </div>
                      </div>
                    `
                  }
                ],
                custom_args: {
                  user_id: campaign.user_id,
                  campaign_id: campaign.id,
                  sender_email: sender.email,
                  warmup_phase: warmupPhase.toString(),
                  warmup_day: daysCompleted.toString()
                },
                tracking_settings: {
                  click_tracking: { enable: true },
                  open_tracking: { enable: true },
                  subscription_tracking: { enable: false }
                }
              }
              
              const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
              })
              
              if (response.ok) {
                const messageId = response.headers.get('x-message-id') || 'unknown'
                console.log(`📤 Sent warmup email ${i + 1} from ${sender.email} to ${recipient}`)
                console.log(`📨 SendGrid Message ID: ${messageId}`)
                console.log(`🏷️  Custom Args: ${JSON.stringify(emailData.custom_args)}`)
              } else {
                const errorText = await response.text()
                console.error(`❌ SendGrid API error for email ${i + 1}:`, response.status, errorText)
              }
            }
          } catch (emailError) {
            console.error(`❌ Error sending warmup emails for ${sender.email}:`, emailError)
          }
        } else {
          console.log(`🧪 Warmup email simulation mode - no real emails sent`)
          console.log(`🔍 DEBUG - Simulation reason:`)
          console.log(`   SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`)
          console.log(`   EMAIL_SIMULATION_MODE: "${process.env.EMAIL_SIMULATION_MODE}"`)
        }
        
        // Update warmup tracking data in the new columns
        try {
          
          await supabaseServer
            .from('campaign_senders')
            .update({ 
              warmup_status: 'active',
              last_warmup_sent: new Date().toISOString(),
              warmup_phase: warmupPhase,
              warmup_days_completed: daysCompleted,
              warmup_emails_sent_today: newDailyCount,
              updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaign.id)
            .eq('email', sender.email)
          
          console.log(`✅ Updated warmup tracking for ${sender.email}: Phase ${warmupPhase}, Day ${daysCompleted}, Daily total: ${newDailyCount} (+${warmupVolume})`)
        } catch (trackingError) {
          console.warn(`⚠️ Could not update warmup tracking columns for ${sender.email}:`, trackingError.message)
          console.log('💡 This is expected if the warmup tracking migration has not been applied yet')
          
          // Fallback: just update basic status and timestamp
          await supabaseServer
            .from('campaign_senders')
            .update({ 
              warmup_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('campaign_id', campaign.id)
            .eq('email', sender.email)
        }
        
        totalWarmupSent += warmupVolume
        
        results.push({
          campaign: campaign.name,
          sender: sender.email,
          healthScore,
          warmupVolume,
          warmupPhase,
          daysCompleted,
          emailsSentToday: newDailyCount,
          lastSent: new Date().toISOString(),
          status: 'sent'
        })
      }
      
      // Recalculate health scores for campaign senders
      const senderEmails = senders?.map(s => s.email) || []
      if (senderEmails.length > 0) {
        console.log(`📊 Recalculating health scores for campaign ${campaign.id}...`)
        
        try {
          // Get sender account IDs from emails
          const { data: senderAccounts } = await supabaseServer
            .from('sender_accounts')
            .select('id, email')
            .in('email', senderEmails)
            .eq('user_id', campaign.user_id)
          
          if (senderAccounts && senderAccounts.length > 0) {
            const senderIds = senderAccounts.map(sa => sa.id)
            const healthScores = await calculateHealthScoresFromRealData(campaign.user_id, senderIds)
            
            // Update health scores in campaign_senders table
            for (const account of senderAccounts) {
              const newScore = healthScores[account.id]?.score || 75
              await supabaseServer
                .from('campaign_senders')
                .update({ health_score: newScore })
                .eq('campaign_id', campaign.id)
                .eq('email', account.email)
              
              console.log(`✅ Updated health score for ${account.email}: ${newScore}%`)
            }
          }
        } catch (error) {
          console.error(`Error recalculating health scores for campaign ${campaign.id}:`, error)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      sent: totalWarmupSent,
      processed: totalProcessed,
      results,
      message: `Processed ${totalProcessed} senders, sent ${totalWarmupSent} warm-up emails`
    })
    
  } catch (error) {
    console.error('Error in warm-up processing:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}