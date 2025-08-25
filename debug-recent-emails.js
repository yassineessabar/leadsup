// Debug recent automation emails to verify tracking was added
// Copy and paste this into your browser console

async function debugRecentEmails() {
  console.log('🔍 Checking recent automation emails...');
  
  try {
    // 1. Check email_tracking table
    console.log('\n1. Checking email_tracking table...');
    const trackingResponse = await fetch('/api/debug/email-tracking', {
      credentials: 'include'
    });
    
    if (trackingResponse.ok) {
      const trackingData = await trackingResponse.json();
      console.log('📊 Tracking data:', trackingData);
      
      if (trackingData.success && trackingData.data.recentRecords.length > 0) {
        console.log('✅ Found tracked emails:');
        trackingData.data.recentRecords.forEach((email, i) => {
          console.log(`${i+1}. ${email.email} - ${email.subject || 'No subject'}`);
          console.log(`   ID: ${email.id}`);
          console.log(`   Status: ${email.status}`);
          console.log(`   Sent: ${email.sent_at}`);
          console.log(`   Opens: ${email.open_count || 0}, Clicks: ${email.click_count || 0}`);
          console.log(`   Campaign: ${email.campaign_id}`);
        });
      } else {
        console.log('❌ No tracked emails found in email_tracking table');
      }
    } else {
      console.log('❌ Failed to fetch tracking data');
    }
    
    // 2. Check analytics API
    console.log('\n2. Checking analytics API...');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 7 days
    const endDate = new Date().toISOString().split('T')[0];
    
    const analyticsResponse = await fetch(`/api/analytics/account?start_date=${startDate}&end_date=${endDate}&_t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-cache'
    });
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('📊 Analytics response:', analyticsData);
      console.log('📊 Analytics source:', analyticsData.data?.source);
      console.log('📊 Emails sent:', analyticsData.data?.metrics?.emailsSent);
      console.log('📊 Open rate:', analyticsData.data?.metrics?.openRate + '%');
      console.log('📊 Click rate:', analyticsData.data?.metrics?.clickRate + '%');
    } else {
      console.log('❌ Failed to fetch analytics data');
    }
    
    // 3. Check inbox for recent sent emails
    console.log('\n3. Checking recent sent emails in inbox...');
    const inboxResponse = await fetch('/api/inbox?folder=sent&limit=10', {
      credentials: 'include'
    });
    
    if (inboxResponse.ok) {
      const inboxData = await inboxResponse.json();
      console.log('📧 Recent sent emails:', inboxData);
      
      if (inboxData.success && inboxData.emails) {
        const recentEmails = inboxData.emails.filter(email => 
          new Date(email.sent_at) > new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
        );
        
        console.log(`📧 Found ${recentEmails.length} emails sent in last 2 hours:`);
        recentEmails.forEach((email, i) => {
          console.log(`${i+1}. To: ${email.to_email || email.contact_email}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Sent: ${email.sent_at}`);
          console.log(`   Message ID: ${email.message_id}`);
        });
      } else {
        console.log('❌ No recent sent emails found');
      }
    } else {
      console.log('❌ Failed to fetch inbox data');
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugRecentEmails();