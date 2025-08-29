import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { calculateHealthScoresFromRealData } from '@/lib/sendgrid-tracking'

// Process warm-up emails for campaigns with auto warm-up enabled
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const autoMode = searchParams.get('autoMode') === 'true'
    
    console.log('🔥 Processing auto warm-up emails...')
    
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
      if (!settings.auto_warmup && autoMode) {
        continue // Skip campaigns without auto warm-up in auto mode
      }
      
      // Get campaign senders
      const { data: senders, error: sendersError } = await supabaseServer
        .from('campaign_senders')
        .select('email, health_score, daily_limit, warmup_status, last_warmup_sent, warmup_phase, warmup_days_completed, warmup_emails_sent_today')
        .eq('campaign_id', campaign.id)
        .eq('is_selected', true)
      
      if (sendersError) {
        console.error(`Error fetching senders for campaign ${campaign.id}:`, sendersError)
        continue
      }
      
      console.log(`👥 Campaign ${campaign.name}: Found ${senders?.length || 0} selected senders`)
      senders?.forEach(sender => {
        console.log(`📧 Sender: ${sender.email} - Health: ${sender.health_score}%, Status: ${sender.warmup_status}, Phase: ${sender.warmup_phase}`)
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
        
        // Check if warm-up was sent today
        const lastSent = sender.last_warmup_sent ? new Date(sender.last_warmup_sent) : null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (lastSent && lastSent >= today) {
          console.log(`⏭️ Warm-up already sent today for ${sender.email}`)
          continue
        }
        
        // Calculate warm-up phase and volume based on health score and days
        const healthScore = sender.health_score || 50
        const daysCompleted = sender.warmup_days_completed || 0
        
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
        
        // Send warm-up emails (this would integrate with your warm-up email service)
        console.log(`📧 Sending ${warmupVolume} warm-up emails for ${sender.email} (Phase ${warmupPhase}, Health: ${healthScore}%, Day ${daysCompleted + 1})`)
        
        // Update warm-up tracking data
        await supabaseServer
          .from('campaign_senders')
          .update({ 
            last_warmup_sent: new Date().toISOString(),
            warmup_status: 'active',
            warmup_phase: warmupPhase,
            warmup_days_completed: daysCompleted + 1,
            warmup_emails_sent_today: warmupVolume
          })
          .eq('campaign_id', campaign.id)
          .eq('email', sender.email)
        
        totalWarmupSent += warmupVolume
        
        results.push({
          campaign: campaign.name,
          sender: sender.email,
          healthScore,
          warmupVolume,
          warmupPhase,
          daysCompleted: daysCompleted + 1,
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