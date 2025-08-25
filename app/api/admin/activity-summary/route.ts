import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Admin API: Starting request - REAL DATA ONLY')
    
    const supabaseAdmin = getSupabaseServerClient()
    
    // Initialize with empty arrays - NO DEMO DATA
    let accountsActivity: any[] = []
    let recentLogs: any[] = []
    let senderHealthScores: any[] = []
    let totalUsersCount = 0
    
    // Initialize system totals
    let systemTotals = {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalContacts: 0,
      totalEmailsSentToday: 0,
      totalSenderAccounts: 0
    }

    // STEP 1: Get real user count and user data
    console.log('Admin API: Attempting to get all users from auth.users...')
    
    try {
      // Try to get all users from auth.admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!authError && authData?.users && authData.users.length > 0) {
        totalUsersCount = authData.users.length
        console.log('Admin API: Found', totalUsersCount, 'users via auth.admin.listUsers')
        
        // Process each real user
        accountsActivity = await Promise.all(
          authData.users.map(async (authUser) => {
            // Get profile data for admin status
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('is_admin')
              .eq('user_id', authUser.id)
              .single()
            
            // Get email from users table
            let userEmail = authUser.email || 'No email'
            try {
              const { data: userData } = await supabaseAdmin
                .from('users')
                .select('email')
                .eq('id', authUser.id)
                .single()
              
              if (userData?.email) {
                userEmail = userData.email
              }
            } catch (error) {
              console.log('Admin API: Could not get email from users table for:', authUser.id)
            }
            
            // Get real campaign data for this user
            const { data: campaigns } = await supabaseAdmin
              .from('campaigns')
              .select('*')
              .eq('user_id', authUser.id)
            
            // Get real contact data for this user
            const { data: contacts } = await supabaseAdmin
              .from('contacts')
              .select('*')
              .eq('user_id', authUser.id)
            
            // Get sender accounts for this user
            const { data: senderAccounts } = await supabaseAdmin
              .from('sender_accounts')
              .select('*')
              .eq('user_id', authUser.id)
            
            // Get today's emails for this user
            const today = new Date().toISOString().split('T')[0]
            const { data: todaysEmails } = await supabaseAdmin
              .from('email_tracking')
              .select('*')
              .gte('sent_at', today)
              .in('campaign_id', campaigns?.map(c => c.id) || [])
            
            const totalCampaigns = campaigns?.length || 0
            const draftCampaigns = campaigns?.filter(c => c.status === 'draft').length || 0
            const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0
            const totalContacts = contacts?.length || 0
            const emailsSentToday = todaysEmails?.length || 0
            const senderAccountsCount = senderAccounts?.length || 0
            
            return {
              user_id: authUser.id,
              user_email: userEmail,
              is_admin: profile?.is_admin || false,
              total_campaigns: totalCampaigns,
              draft_campaigns: draftCampaigns,
              active_campaigns: activeCampaigns,
              scraping_in_progress: campaigns?.filter(c => c.scraping_status === 'running').length || 0,
              scraping_completed: campaigns?.filter(c => c.scraping_status === 'completed').length || 0,
              total_contacts: totalContacts,
              emails_sent_today: emailsSentToday,
              sender_accounts_count: senderAccountsCount,
              last_activity: authUser.created_at,
              sender_accounts_details: senderAccounts || []
            }
          })
        )
        
        console.log('Admin API: Successfully processed', accountsActivity.length, 'real user accounts')
      } else {
        console.log('Admin API: auth.admin.listUsers failed:', authError?.message)
        
        // Fallback: Get user count directly from users table
        try {
          const { count, error: usersError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
          
          if (!usersError && count !== null) {
            totalUsersCount = count
            console.log('Admin API: Got user count from users table:', totalUsersCount)
          } else {
            console.log('Admin API: Users table query failed:', usersError?.message)
          }
        } catch (usersTableError) {
          console.log('Admin API: Could not access users table')
        }
        
        // If auth.admin failed, we'll build the user list after we get the system totals
        console.log('Admin API: auth.admin.listUsers failed, will use application data')
      }
    } catch (error) {
      console.error('Admin API: Error getting user data:', error)
    }

    // STEP 2: Calculate real system-wide totals from database
    console.log('Admin API: Getting real system totals from database...')
    
    const { data: allCampaigns } = await supabaseAdmin.from('campaigns').select('*')
    const { data: allContacts } = await supabaseAdmin.from('contacts').select('*')
    const { data: allSenderAccounts } = await supabaseAdmin.from('sender_accounts').select('*')
    
    // Get today's emails across ALL campaigns
    const today = new Date().toISOString().split('T')[0]
    const { data: allTodaysEmails } = await supabaseAdmin
      .from('email_tracking')
      .select('*')
      .gte('sent_at', today)
    
    systemTotals = {
      totalCampaigns: allCampaigns?.length || 0,
      activeCampaigns: allCampaigns?.filter(c => 
        c.status === 'active' || c.status === 'Active' || c.status === 'ACTIVE'
      ).length || 0,
      totalContacts: allContacts?.length || 0,
      totalEmailsSentToday: allTodaysEmails?.length || 0,
      totalSenderAccounts: allSenderAccounts?.length || 0
    }
    
    // Additional debugging: Let's see what tables have user data
    console.log('Admin API: DEBUGGING - Checking all user sources:')
    
    // Debug campaign statuses
    const statusCounts = {}
    allCampaigns?.forEach(c => {
      if (c.status) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
      }
    })
    console.log('- Campaign status breakdown:', statusCounts)
    
    // Check campaigns table for unique users
    const uniqueCampaignUsers = [...new Set(allCampaigns?.map(c => c.user_id) || [])]
    console.log('- Unique users in campaigns:', uniqueCampaignUsers.length)
    
    // Check contacts table for unique users
    const uniqueContactUsers = [...new Set(allContacts?.map(c => c.user_id) || [])]
    console.log('- Unique users in contacts:', uniqueContactUsers.length)
    
    // Check sender_accounts table for unique users
    const uniqueSenderUsers = [...new Set(allSenderAccounts?.map(s => s.user_id) || [])]
    console.log('- Unique users in sender_accounts:', uniqueSenderUsers.length)
    
    // Get all unique user IDs across all tables
    const allUserIds = [...new Set([
      ...uniqueCampaignUsers,
      ...uniqueContactUsers, 
      ...uniqueSenderUsers
    ])]
    console.log('- Total unique user IDs across all tables:', allUserIds.length)
    console.log('- User IDs found:', allUserIds)
    
    // If we have more users from tables than from auth, use that count
    if (allUserIds.length > totalUsersCount) {
      totalUsersCount = allUserIds.length
      console.log('- Updated total user count to:', totalUsersCount)
    }
    
    // If we don't have account activity yet (auth.admin failed), get ALL users from users table
    if (accountsActivity.length === 0) {
      console.log('Admin API: Getting ALL users from users table to show complete list')
      
      try {
        const { data: allUsersData, error: allUsersError } = await supabaseAdmin
          .from('users')
          .select('id, email, created_at')
        
        if (!allUsersError && allUsersData) {
          console.log('Admin API: Found', allUsersData.length, 'total users in users table')
          
          accountsActivity = await Promise.all(
            allUsersData.map(async (user) => {
              const userId = user.id
              // Skip null user IDs
              if (!userId) return null
              
              // Get profile data for admin status
              const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('is_admin, created_at')
                .eq('user_id', userId)
                .single()
              
              // User email is already available from the users table query
              const userEmail = user.email || 'No email found'
              
              // Get real data for this user (we already have the data from earlier queries)
              const userCampaigns = allCampaigns?.filter(c => c.user_id === userId) || []
              const userContacts = allContacts?.filter(c => c.user_id === userId) || []
              const userSenderAccounts = allSenderAccounts?.filter(s => s.user_id === userId) || []
              
              // Get today's emails for this user
              const today = new Date().toISOString().split('T')[0]
              const { data: todaysEmails } = await supabaseAdmin
                .from('email_tracking')
                .select('*')
                .gte('sent_at', today)
                .in('campaign_id', userCampaigns.map(c => c.id))
              
              return {
                user_id: userId,
                user_email: userEmail,
                is_admin: profile?.is_admin || false,
                total_campaigns: userCampaigns.length,
                draft_campaigns: userCampaigns.filter(c => c.status === 'draft').length,
                active_campaigns: userCampaigns.filter(c => c.status === 'active').length,
                scraping_in_progress: userCampaigns.filter(c => c.scraping_status === 'running').length,
                scraping_completed: userCampaigns.filter(c => c.scraping_status === 'completed').length,
                total_contacts: userContacts.length,
                emails_sent_today: todaysEmails?.length || 0,
                sender_accounts_count: userSenderAccounts.length,
                last_activity: user.created_at || 'Unknown',
                sender_accounts_details: userSenderAccounts
              }
            })
          )
          
          // Remove null entries
          accountsActivity = accountsActivity.filter(a => a !== null)
          console.log('Admin API: Successfully built account activity for ALL', accountsActivity.length, 'users from users table')
        }
      } catch (error) {
        console.log('Admin API: Error getting all users:', error)
      }
    }
    
    console.log('Admin API: Final totals:')
    console.log('- Total users:', totalUsersCount)
    console.log('- Total campaigns in DB:', systemTotals.totalCampaigns)
    console.log('- Active campaigns:', systemTotals.activeCampaigns)
    console.log('- Total contacts:', systemTotals.totalContacts)
    console.log('- Emails sent today:', systemTotals.totalEmailsSentToday)
    console.log('- Total sender accounts:', systemTotals.totalSenderAccounts)

    // STEP 3: Get real automation logs from database
    console.log('Admin API: Getting real automation logs...')
    
    try {
      const { data: logsData, error: logsError } = await supabaseAdmin
        .from('automation_logs')
        .select(`
          *,
          campaigns!fk_automation_logs_campaign(name, status)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (logsData && logsData.length > 0) {
        recentLogs = logsData
        console.log('Admin API: Found', logsData.length, 'real automation logs')
      } else {
        console.log('Admin API: No automation logs found in database')
      }
    } catch (error) {
      console.log('Admin API: Could not get automation logs:', error.message)
    }

    // STEP 4: Get real sender health data from campaign_senders table
    console.log('Admin API: Getting real sender health data from campaign_senders table...')
    
    if (allSenderAccounts && allSenderAccounts.length > 0) {
      console.log('Admin API: Found', allSenderAccounts.length, 'sender accounts to process')
      senderHealthScores = await Promise.all(
        allSenderAccounts.map(async (sender) => {
          console.log('Admin API: Processing sender:', sender.email)
          
          // Get user email for this sender account
          let accountEmail = 'Unknown Account'
          try {
            if (sender.user_id) {
              // First try to get from users table
              const { data: userData } = await supabaseAdmin
                .from('users')
                .select('email')
                .eq('id', sender.user_id)
                .single()
              
              if (userData?.email) {
                accountEmail = userData.email
              } else {
                // Fallback to auth data if we have it
                const authUser = authData?.users?.find(u => u.id === sender.user_id)
                if (authUser?.email) {
                  accountEmail = authUser.email
                }
              }
            }
          } catch (error) {
            console.log('Admin API: Could not get user email for sender:', sender.email, 'user_id:', sender.user_id)
          }
          
          // Get campaign_senders data for this sender email  
          const { data: campaignSenderData, error: campaignSenderError } = await supabaseAdmin
            .from('campaign_senders')
            .select('*')
            .eq('email', sender.email)
          
          console.log('Admin API: Campaign sender data for', sender.email, ':', campaignSenderData?.length || 0, 'records')
          if (campaignSenderError) {
            console.log('Admin API: Campaign sender error:', campaignSenderError.message)
          }
          
          // Get email stats for this sender from email_tracking
          const { data: emailStats, error: emailStatsError } = await supabaseAdmin
            .from('email_tracking')
            .select('*')
            .eq('sender_email', sender.email)
          
          console.log('Admin API: Email stats for', sender.email, ':', emailStats?.length || 0, 'records')
          if (emailStatsError) {
            console.log('Admin API: Email stats error:', emailStatsError.message)
          }
          
          const stats = {
            sent: emailStats?.length || 0,
            delivered: emailStats?.filter(e => e.status === 'delivered').length || 0,
            opened: emailStats?.filter(e => e.status === 'opened').length || 0,
            clicked: emailStats?.filter(e => e.status === 'clicked').length || 0,
            bounced: emailStats?.filter(e => e.status === 'bounced').length || 0,
            failed: emailStats?.filter(e => e.status === 'failed').length || 0
          }
          
          const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : '0.0'
          const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : '0.0'
          const bounceRate = stats.sent > 0 ? ((stats.bounced / stats.sent) * 100).toFixed(1) : '0.0'
          
          // Use health_score from campaign_senders table, fallback to calculated if not available
          const campaignSender = campaignSenderData?.[0]
          console.log('Admin API: Campaign sender record for', sender.email, ':', campaignSender ? 'Found' : 'Not found')
          if (campaignSender) {
            console.log('Admin API: Health score:', campaignSender.health_score, 'Warmup status:', campaignSender.warmup_status)
          }
          
          const healthScore = campaignSender?.health_score?.toString() || 
            (stats.sent > 0 ? 
              Math.max(0, 100 - (parseFloat(bounceRate) * 2) - (100 - parseFloat(deliveryRate))).toFixed(0) : 
              '0')
          
          const result = {
            email: sender.email,
            accountEmail: accountEmail,
            warmup_status: campaignSender?.warmup_status || 'unknown',
            stats,
            metrics: {
              deliveryRate,
              openRate,
              bounceRate,
              healthScore
            }
          }
          
          console.log('Admin API: Final result for', sender.email, '- Warmup:', result.warmup_status, 'Health:', result.metrics.healthScore)
          return result
        })
      )
      console.log('Admin API: Got health data for', senderHealthScores.length, 'senders from campaign_sender table')
    }

    // Return ONLY real data
    const responseData = {
      accounts: accountsActivity,
      recentLogs: recentLogs,
      senderHealthScores: senderHealthScores,
      summary: {
        totalAccounts: totalUsersCount,
        activeToday: accountsActivity.filter(a => 
          a.last_activity && new Date(a.last_activity).toDateString() === new Date().toDateString()
        ).length,
        totalEmailsSentToday: systemTotals.totalEmailsSentToday,
        activeCampaigns: systemTotals.activeCampaigns,
        totalCampaigns: systemTotals.totalCampaigns,
        totalContacts: systemTotals.totalContacts,
        totalSenderAccounts: systemTotals.totalSenderAccounts
      }
    }
    
    console.log('Admin API: Returning real data only - no demo/hardcoded values')
    
    return NextResponse.json({
      success: true,
      data: responseData
    })
    
  } catch (error: any) {
    console.error('Admin API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}