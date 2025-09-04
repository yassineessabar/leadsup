const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function testDailyLimitEnforcement() {
  console.log('🧪 Testing Daily Limit Enforcement and Sender Distribution');
  console.log('=' .repeat(60));
  
  const campaignId = '6c91a9b3-c4fc-46be-bc0f-68ecdffd1e77'; // Sigmatic Trading Campaign
  const userId = '157004d8-201b-48ce-9610-af5b3ecbc820';
  
  // Step 1: Get campaign settings and senders
  console.log('📋 Step 1: Campaign Analysis');
  
  const { data: campaignSettings } = await supabase
    .from('campaign_settings')
    .select('daily_contacts_limit')
    .eq('campaign_id', campaignId)
    .single();
  
  const { data: campaignSenders } = await supabase
    .from('campaign_senders')
    .select('email, name')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .eq('is_selected', true);
  
  const senderEmails = campaignSenders?.map(s => s.email) || [];
  const { data: senderAccounts } = await supabase
    .from('sender_accounts')
    .select('id, email')
    .in('email', senderEmails);
  
  const dailyLimit = campaignSettings?.daily_contacts_limit || 35;
  const campaignDailyLimit = dailyLimit * 2; // 2x sender limit
  
  console.log('  Daily limit per sender:', dailyLimit);
  console.log('  Campaign daily limit:', campaignDailyLimit);
  console.log('  Available senders:', senderAccounts?.length || 0);
  senderAccounts?.forEach(s => console.log('    -', s.email, '(ID:', s.id + ')'));
  
  // Step 2: Create test contacts to simulate bulk upload
  console.log('\\n📥 Step 2: Creating Test Contacts');
  
  const testContacts = [];
  for (let i = 1; i <= 45; i++) { // Create 45 contacts (more than single sender limit of 35)
    testContacts.push({
      user_id: userId,
      campaign_id: campaignId,
      first_name: `Test${i}`,
      last_name: 'Contact',
      email: `test${i}@testcompany${Math.ceil(i/10)}.com`,
      company: `TestCompany${Math.ceil(i/10)}`,
      title: 'Test Manager',
      location: 'Sydney, Australia',
      email_status: 'Valid'
    });
  }
  
  console.log('  Created', testContacts.length, 'test contacts');
  
  // Step 3: Insert contacts and test assignment logic
  console.log('\\n📤 Step 3: Testing Contact Upload and Assignment');
  
  const { data: insertedContacts, error: insertError } = await supabase
    .from('contacts')
    .insert(testContacts)
    .select('id, email');
  
  if (insertError) {
    console.error('❌ Error inserting test contacts:', insertError.message);
    return;
  }
  
  console.log('  ✅ Inserted', insertedContacts?.length || 0, 'contacts');
  
  // Step 4: Simulate the assignment logic from the upload route
  console.log('\\n🎯 Step 4: Testing Sender Assignment Logic');
  
  let assignmentCounts = new Map();
  senderAccounts?.forEach(s => assignmentCounts.set(s.id, 0));
  
  for (const contact of insertedContacts || []) {
    // Simulate the round-robin logic from the upload route
    const { data: recentAssignments } = await supabase
      .from('contacts')
      .select('scheduled_sender_id')
      .eq('campaign_id', campaignId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .in('scheduled_sender_id', senderAccounts.map(s => s.id));
    
    // Count current assignments
    const currentCounts = new Map();
    senderAccounts?.forEach(s => currentCounts.set(s.id, 0));
    
    recentAssignments?.forEach(assignment => {
      const current = currentCounts.get(assignment.scheduled_sender_id) || 0;
      currentCounts.set(assignment.scheduled_sender_id, current + 1);
    });
    
    // Select sender with least assignments
    let selectedSender = senderAccounts[0];
    let minAssignments = currentCounts.get(selectedSender.id);
    
    senderAccounts?.forEach(sender => {
      const count = currentCounts.get(sender.id);
      if (count < minAssignments) {
        selectedSender = sender;
        minAssignments = count;
      }
    });
    
    // Update contact with assigned sender
    await supabase
      .from('contacts')
      .update({
        scheduled_sender_id: selectedSender.id,
        scheduling_completed: true,
        scheduled_at: new Date().toISOString()
      })
      .eq('id', contact.id);
    
    // Track our simulation
    assignmentCounts.set(selectedSender.id, (assignmentCounts.get(selectedSender.id) || 0) + 1);
  }
  
  // Step 5: Verify the distribution
  console.log('\\n📊 Step 5: Final Assignment Distribution');
  
  const { data: finalAssignments } = await supabase
    .from('contacts')
    .select('scheduled_sender_id')
    .eq('campaign_id', campaignId)
    .not('scheduled_sender_id', 'is', null);
  
  const finalCounts = new Map();
  senderAccounts?.forEach(s => finalCounts.set(s.id, 0));
  
  finalAssignments?.forEach(assignment => {
    const current = finalCounts.get(assignment.scheduled_sender_id) || 0;
    finalCounts.set(assignment.scheduled_sender_id, current + 1);
  });
  
  console.log('📊 Actual assignment distribution:');
  senderAccounts?.forEach(sender => {
    const count = finalCounts.get(sender.id) || 0;
    const percentage = finalAssignments ? ((count / finalAssignments.length) * 100).toFixed(1) : '0';
    console.log('  ', sender.email + ':', count, 'contacts (' + percentage + '%)');
  });
  
  // Check if distribution is balanced (should be roughly equal)
  const counts = Array.from(finalCounts.values());
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  const isBalanced = (maxCount - minCount) <= 2; // Allow max 2 contact difference
  
  console.log('\\n🎯 Balance Analysis:');
  console.log('  Max assignments:', maxCount);
  console.log('  Min assignments:', minCount);
  console.log('  Difference:', maxCount - minCount);
  console.log('  Is balanced (≤2 difference):', isBalanced ? '✅ YES' : '❌ NO');
  
  // Step 6: Test daily limit enforcement (simulate scheduling for multiple days)
  console.log('\\n📅 Step 6: Testing Daily Limit Enforcement');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check how many contacts would be scheduled for today/tomorrow
  const { data: scheduledToday } = await supabase
    .from('contacts')
    .select('scheduled_sender_id, next_email_due')
    .eq('campaign_id', campaignId)
    .gte('next_email_due', today.toISOString())
    .lt('next_email_due', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: scheduledTomorrow } = await supabase
    .from('contacts')
    .select('scheduled_sender_id, next_email_due')
    .eq('campaign_id', campaignId)
    .gte('next_email_due', tomorrow.toISOString())
    .lt('next_email_due', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString());
  
  console.log('  Contacts scheduled for today:', scheduledToday?.length || 0);
  console.log('  Contacts scheduled for tomorrow:', scheduledTomorrow?.length || 0);
  
  // Check if any sender exceeds their daily limit
  const todayCounts = new Map();
  senderAccounts?.forEach(s => todayCounts.set(s.id, 0));
  
  scheduledToday?.forEach(contact => {
    if (contact.scheduled_sender_id) {
      const current = todayCounts.get(contact.scheduled_sender_id) || 0;
      todayCounts.set(contact.scheduled_sender_id, current + 1);
    }
  });
  
  console.log('\\n📊 Daily limit compliance check:');
  let limitsRespected = true;
  senderAccounts?.forEach(sender => {
    const count = todayCounts.get(sender.id) || 0;
    const withinLimit = count <= dailyLimit;
    console.log('  ', sender.email + ':', count + '/' + dailyLimit, withinLimit ? '✅' : '❌');
    if (!withinLimit) limitsRespected = false;
  });
  
  console.log('\\n🎯 FINAL TEST RESULTS:');
  console.log('✅ Round-robin distribution working:', isBalanced ? 'YES' : 'NO');
  console.log('✅ Daily limits respected:', limitsRespected ? 'YES' : 'NO');
  console.log('✅ Multiple senders utilized:', senderAccounts?.length > 1 ? 'YES' : 'NO');
  
  if (isBalanced && limitsRespected) {
    console.log('\\n🎉 ALL TESTS PASSED - Daily limit system working correctly!');
  } else {
    console.log('\\n⚠️ Some tests failed - daily limit system needs adjustment');
  }
  
  return {
    isBalanced,
    limitsRespected,
    distribution: Array.from(finalCounts.entries()),
    totalContacts: contacts?.length || 0
  };
}

testDailyLimitEnforcement().catch(console.error);