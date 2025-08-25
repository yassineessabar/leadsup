// Node 18+ has fetch built-in, but fallback to node-fetch
const fetch = globalThis.fetch || require('node-fetch');

async function debugOpenClickRates() {
  console.log('🔍 Debugging Open/Click Rate Issues...');
  
  try {
    // Check analytics endpoint directly
    console.log('\n1. Testing account analytics endpoint...');
    
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      _t: Date.now()
    });
    
    const response = await fetch(`http://localhost:3000/api/analytics/account?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Analytics API failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const result = await response.json();
    console.log('📊 Analytics response:', {
      success: result.success,
      source: result.data?.source,
      period: result.data?.period,
      emailsSent: result.data?.metrics?.emailsSent,
      openRate: result.data?.metrics?.openRate,
      clickRate: result.data?.metrics?.clickRate,
      uniqueOpens: result.data?.metrics?.uniqueOpens,
      uniqueClicks: result.data?.metrics?.uniqueClicks,
      debug: result.data?.debug
    });
    
    // Check SendGrid webhook endpoint
    console.log('\n2. Testing SendGrid webhook endpoint...');
    const webhookResponse = await fetch('http://localhost:3000/api/webhooks/sendgrid/events', {
      method: 'GET'
    });
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log('📡 Webhook endpoint status:', webhookData);
    } else {
      console.error(`❌ Webhook endpoint failed: ${webhookResponse.status}`);
    }
    
    // Check inbox stats for comparison
    console.log('\n3. Testing inbox stats...');
    const inboxResponse = await fetch('http://localhost:3000/api/inbox/stats', {
      credentials: 'include'
    });
    
    if (inboxResponse.ok) {
      const inboxData = await inboxResponse.json();
      console.log('📧 Inbox stats:', {
        success: inboxData.success,
        totalMessages: inboxData.data?.summary?.total_messages,
        unreadMessages: inboxData.data?.summary?.unread_messages
      });
    } else {
      console.error(`❌ Inbox stats failed: ${inboxResponse.status}`);
    }
    
    // Check recent inbox messages to see if they have tracking
    console.log('\n4. Testing recent inbox messages...');
    const recentResponse = await fetch('http://localhost:3000/api/inbox?limit=3', {
      credentials: 'include'
    });
    
    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      if (recentData.success && recentData.emails) {
        console.log('📬 Recent messages:', recentData.emails.map(email => ({
          subject: email.subject,
          sender: email.sender,
          direction: email.direction,
          message_id: email.message_id,
          hasTrackingInfo: !!(email.message_id || email.provider_message_id)
        })));
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugOpenClickRates();