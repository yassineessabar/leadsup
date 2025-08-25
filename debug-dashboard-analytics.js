// Debug analytics API - run this in browser console
// This will help us see what's happening with the analytics

async function debugAnalytics() {
  console.log('🔍 Debugging Analytics API...');
  
  try {
    // Build the same params the dashboard uses
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      _t: Date.now() // Cache buster
    });
    
    console.log(`📅 Fetching analytics for: ${startDate} to ${endDate}`);
    
    const response = await fetch(`/api/analytics/account?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Analytics API failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const result = await response.json();
    
    console.log('📊 Analytics API Response:');
    console.log('Success:', result.success);
    console.log('Source:', result.data?.source);
    console.log('Debug:', result.data?.debug);
    console.log('Metrics:', result.data?.metrics);
    
    // Check which source was used
    if (result.data?.source === 'local_email_tracking') {
      console.log('✅ SUCCESS: Using local email tracking!');
      console.log('📧 Emails sent:', result.data.metrics?.emailsSent);
      console.log('📖 Open rate:', result.data.metrics?.openRate + '%');
      console.log('🖱️ Click rate:', result.data.metrics?.clickRate + '%');
    } else {
      console.log('⚠️ Not using local tracking. Source:', result.data?.source);
      console.log('This means either:');
      console.log('1. No local tracking data found');
      console.log('2. Local tracking analytics failed');
      console.log('3. Code not updated properly');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
console.log('🚀 Starting analytics debug...');
debugAnalytics().then(() => {
  console.log('✅ Analytics debug complete');
});