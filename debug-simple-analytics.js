// Simple analytics calculation from email_tracking table
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function calculateSimpleAnalytics() {
  console.log('📊 Calculating simple analytics from email_tracking...')
  
  try {
    const userId = 'd155d4c2-2f06-45b7-9c90-905e3648e8df'
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Get all email tracking records for this campaign
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId)
    
    if (trackingError) {
      console.error('❌ Error fetching tracking data:', trackingError)
      return
    }
    
    console.log(`📧 Found ${emailTracking?.length || 0} total email tracking records`)
    
    if (!emailTracking || emailTracking.length === 0) {
      console.log('❌ No tracking data found')
      return
    }
    
    // Calculate basic metrics
    const totalSent = emailTracking.filter(email => email.status === 'sent').length
    const totalDelivered = emailTracking.filter(email => email.delivered_at !== null).length
    const totalOpened = emailTracking.filter(email => email.opened_at !== null).length
    const totalClicked = emailTracking.filter(email => email.clicked_at !== null).length
    const totalBounced = emailTracking.filter(email => email.bounced_at !== null).length
    const totalReplied = emailTracking.filter(email => email.replied_at !== null).length
    
    // Calculate rates
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0'
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0'
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0'
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0'
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0.0'
    
    console.log('\n📊 CALCULATED METRICS:')
    console.log('═'.repeat(50))
    console.log(`📧 Emails Sent: ${totalSent}`)
    console.log(`✅ Delivered: ${totalDelivered}`)
    console.log(`👀 Opened: ${totalOpened}`)
    console.log(`🖱️ Clicked: ${totalClicked}`)
    console.log(`⚠️ Bounced: ${totalBounced}`)
    console.log(`💬 Replied: ${totalReplied}`)
    console.log('─'.repeat(50))
    console.log(`📊 Delivery Rate: ${deliveryRate}%`)
    console.log(`📈 Open Rate: ${openRate}%`)
    console.log(`🖱️ Click Rate: ${clickRate}%`) 
    console.log(`💬 Reply Rate: ${replyRate}%`)
    console.log(`⚠️ Bounce Rate: ${bounceRate}%`)
    console.log('═'.repeat(50))
    
    // Show breakdown by sender
    const senderBreakdown = {}
    emailTracking.forEach(email => {
      const sender = email.sender_email || 'Unknown'
      if (!senderBreakdown[sender]) {
        senderBreakdown[sender] = { sent: 0, delivered: 0, opened: 0, clicked: 0 }
      }
      if (email.status === 'sent') senderBreakdown[sender].sent++
      if (email.delivered_at) senderBreakdown[sender].delivered++
      if (email.opened_at) senderBreakdown[sender].opened++
      if (email.clicked_at) senderBreakdown[sender].clicked++
    })
    
    console.log('\n👥 BREAKDOWN BY SENDER:')
    Object.entries(senderBreakdown).forEach(([sender, stats]) => {
      console.log(`📧 ${sender}: ${stats.sent} sent, ${stats.delivered} delivered, ${stats.opened} opened, ${stats.clicked} clicked`)
    })
    
    // Show sample records
    console.log('\n📝 SAMPLE RECORDS:')
    emailTracking.slice(0, 3).forEach((email, index) => {
      console.log(`${index + 1}. ${email.recipient_email || 'Unknown'} - ${email.status} - ${email.sent_at}`)
    })
    
  } catch (error) {
    console.error('❌ Calculation failed:', error)
  }
}

calculateSimpleAnalytics()