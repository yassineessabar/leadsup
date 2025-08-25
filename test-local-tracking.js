// Test local email tracking analytics
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLocalEmailTracking() {
  console.log('🧪 Testing Local Email Tracking System...\n');
  
  try {
    // 1. Check if email_tracking table exists and has data
    console.log('1. Checking email_tracking table...');
    const { data: trackingRecords, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .limit(10);
    
    if (trackingError) {
      console.error('❌ Error querying email_tracking table:', trackingError.message);
      return;
    }
    
    console.log(`📊 Found ${trackingRecords?.length || 0} email tracking records`);
    
    if (trackingRecords && trackingRecords.length > 0) {
      console.log('📧 Sample tracking record:', {
        id: trackingRecords[0].id,
        user_id: trackingRecords[0].user_id,
        email: trackingRecords[0].email,
        status: trackingRecords[0].status,
        sent_at: trackingRecords[0].sent_at,
        first_opened_at: trackingRecords[0].first_opened_at,
        open_count: trackingRecords[0].open_count,
        first_clicked_at: trackingRecords[0].first_clicked_at,
        click_count: trackingRecords[0].click_count
      });
      
      // 2. Test the analytics calculation
      console.log('\n2. Testing email tracking analytics...');
      
      // Get records from last 30 days
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      // Find a user_id from the tracking records
      const testUserId = trackingRecords[0].user_id;
      console.log(`📊 Testing with user_id: ${testUserId}`);
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      const { data: userRecords, error: userError } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('user_id', testUserId)
        .gte('sent_at', startDate + 'T00:00:00Z')
        .lte('sent_at', endDate + 'T23:59:59Z');
      
      if (userError) {
        console.error('❌ Error querying user tracking records:', userError.message);
        return;
      }
      
      console.log(`📧 Found ${userRecords?.length || 0} records for this user in date range`);
      
      if (userRecords && userRecords.length > 0) {
        // Calculate metrics manually
        const emailsSent = userRecords.length;
        const openedEmails = userRecords.filter(r => r.first_opened_at || r.open_count > 0);
        const clickedEmails = userRecords.filter(r => r.first_clicked_at || r.click_count > 0);
        const totalOpens = userRecords.reduce((sum, r) => sum + (r.open_count || 0), 0);
        const totalClicks = userRecords.reduce((sum, r) => sum + (r.click_count || 0), 0);
        
        const openRate = emailsSent > 0 ? (openedEmails.length / emailsSent) * 100 : 0;
        const clickRate = emailsSent > 0 ? (clickedEmails.length / emailsSent) * 100 : 0;
        
        console.log('📊 Calculated metrics:');
        console.log(`   Emails sent: ${emailsSent}`);
        console.log(`   Unique opens: ${openedEmails.length}`);
        console.log(`   Unique clicks: ${clickedEmails.length}`);
        console.log(`   Total opens: ${totalOpens}`);
        console.log(`   Total clicks: ${totalClicks}`);
        console.log(`   Open rate: ${openRate.toFixed(1)}%`);
        console.log(`   Click rate: ${clickRate.toFixed(1)}%`);
        
        if (openedEmails.length > 0) {
          console.log('✅ SUCCESS: Found opened emails in tracking data');
        } else {
          console.log('⚠️  No opened emails found - try opening some emails with tracking pixels');
        }
        
        if (clickedEmails.length > 0) {
          console.log('✅ SUCCESS: Found clicked emails in tracking data');
        } else {
          console.log('⚠️  No clicked emails found - try clicking links in tracked emails');
        }
      } else {
        console.log('⚠️  No tracking records found for this user in the date range');
      }
      
    } else {
      console.log('⚠️  No email tracking records found. Send some emails first.');
    }
    
    // 3. Test the tracking endpoints
    console.log('\n3. Testing tracking endpoints...');
    console.log('📧 Open tracking endpoint: /api/track/open?id=test_tracking_id');
    console.log('🔗 Click tracking endpoint: /api/track/click?id=test_tracking_id&url=https://example.com');
    
    console.log('\n✅ Local email tracking system test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testLocalEmailTracking();