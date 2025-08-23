// SendGrid Event Fetcher for getting real open and click rates
import { supabaseServer } from '@/lib/supabase'

export interface SendGridEventMetrics {
  totalOpens: number
  uniqueOpens: number
  totalClicks: number
  uniqueClicks: number
  openRate: number // percentage
  clickRate: number // percentage
  emailsSent: number
}

export async function fetchSendGridEventsForUser(userId: string, startDate: string, endDate: string): Promise<SendGridEventMetrics | null> {
  try {
    console.log(`🔍 Fetching SendGrid events for user ${userId} from ${startDate} to ${endDate}`)
    
    // Get user's sent emails with SendGrid message IDs
    const { data: sentEmails, error: emailError } = await supabaseServer
      .from('inbox_messages')
      .select('provider_message_id, contact_email')
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .gte('created_at', startDate + 'T00:00:00Z')
      .lte('created_at', endDate + 'T23:59:59Z')
      .not('provider_message_id', 'is', null)
    
    if (emailError) {
      console.error('❌ Error fetching emails:', emailError)
      return null
    }
    
    if (!sentEmails || sentEmails.length === 0) {
      console.log('⚠️ No sent emails with SendGrid message IDs found')
      return {
        totalOpens: 0,
        uniqueOpens: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        openRate: 0,
        clickRate: 0,
        emailsSent: 0
      }
    }
    
    console.log(`📧 Found ${sentEmails.length} sent emails with SendGrid tracking`)
    
    // Get unique email addresses for querying SendGrid
    const emailAddresses = [...new Set(sentEmails.map(email => email.contact_email))]
    
    // Fetch events from SendGrid API
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    if (!sendGridApiKey) {
      console.error('❌ SENDGRID_API_KEY not found')
      return null
    }
    
    // Query SendGrid Events API
    const query = new URLSearchParams({
      start_time: Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000).toString(),
      end_time: Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000).toString(),
      limit: '1000'
    })
    
    // Add email filter if we have specific recipients (API has limits on query length)
    if (emailAddresses.length <= 10) {
      emailAddresses.forEach(email => {
        query.append('email', email)
      })
    }
    
    const response = await fetch(`https://api.sendgrid.com/v3/messages?${query}`, {
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`❌ SendGrid API error: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    console.log(`✅ SendGrid API response: ${data.messages?.length || 0} messages`)
    
    if (!data.messages || data.messages.length === 0) {
      console.log('⚠️ No messages found in SendGrid for this period')
      return {
        totalOpens: 0,
        uniqueOpens: 0,
        totalClicks: 0,
        uniqueClicks: 0,
        openRate: 0,
        clickRate: 0,
        emailsSent: sentEmails.length
      }
    }
    
    // Analyze events
    let totalOpens = 0
    let totalClicks = 0
    const uniqueOpens = new Set<string>()
    const uniqueClicks = new Set<string>()
    
    data.messages.forEach((message: any) => {
      if (message.events) {
        message.events.forEach((event: any) => {
          if (event.event_name === 'open') {
            totalOpens++
            uniqueOpens.add(event.email)
          }
          if (event.event_name === 'click') {
            totalClicks++
            uniqueClicks.add(event.email)
          }
        })
      }
    })
    
    // Calculate rates
    const emailsSent = sentEmails.length
    const openRate = emailsSent > 0 ? (uniqueOpens.size / emailsSent) * 100 : 0
    const clickRate = emailsSent > 0 ? (uniqueClicks.size / emailsSent) * 100 : 0
    
    console.log(`📊 Events: ${totalOpens} opens, ${totalClicks} clicks`)
    console.log(`📊 Unique: ${uniqueOpens.size} opens, ${uniqueClicks.size} clicks`)
    console.log(`📊 Rates: ${openRate.toFixed(1)}% open, ${clickRate.toFixed(1)}% click`)
    
    return {
      totalOpens,
      uniqueOpens: uniqueOpens.size,
      totalClicks,
      uniqueClicks: uniqueClicks.size,
      openRate: parseFloat(openRate.toFixed(1)),
      clickRate: parseFloat(clickRate.toFixed(1)),
      emailsSent
    }
    
  } catch (error) {
    console.error('❌ Error fetching SendGrid events:', error)
    return null
  }
}