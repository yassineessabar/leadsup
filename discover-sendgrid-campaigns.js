// Discover real SendGrid campaigns in your account
async function discoverSendGridCampaigns() {
  console.log('🔍 Discovering your SendGrid campaigns...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/sendgrid/campaigns');
    const result = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error:', result.error);
      
      if (result.error.includes('SENDGRID_API_KEY')) {
        console.log('\n🔧 SETUP REQUIRED:');
        console.log('1. Get your SendGrid API key from: https://app.sendgrid.com/settings/api_keys');
        console.log('2. Add to .env.local file: SENDGRID_API_KEY=SG.xxxxxxxxxx');
        console.log('3. Restart your Next.js server: npm run dev');
        console.log('4. Run this script again');
      }
      return;
    }
    
    if (result.success) {
      const { campaigns, globalStats, totalCampaigns } = result.data;
      
      console.log(`✅ Connected to SendGrid! Found ${totalCampaigns} campaigns\n`);
      
      if (campaigns.length === 0) {
        console.log('📧 No campaigns found in your SendGrid account.');
        console.log('   Create a Single Send campaign in SendGrid first:');
        console.log('   https://app.sendgrid.com/marketing/singlesends');
        return;
      }
      
      console.log('📧 Your SendGrid Campaigns:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      campaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name}`);
        console.log(`   📋 ID: ${campaign.id}`);
        console.log(`   📊 Status: ${campaign.status}`);
        console.log(`   📅 Created: ${new Date(campaign.created_at).toLocaleDateString()}`);
        if (campaign.categories?.length > 0) {
          console.log(`   🏷️  Categories: ${campaign.categories.join(', ')}`);
        }
        console.log('');
      });
      
      if (globalStats?.stats?.length > 0) {
        const stats = globalStats.stats[0].metrics;
        console.log('📊 Recent Global Stats (Yesterday):');
        console.log(`   📤 Emails Sent: ${stats.delivered + stats.bounces + stats.blocks}`);
        console.log(`   📬 Delivered: ${stats.delivered} (${stats.delivered > 0 ? Math.round((stats.delivered / (stats.delivered + stats.bounces + stats.blocks)) * 100) : 0}%)`);
        console.log(`   👀 Opens: ${stats.unique_opens} (${stats.delivered > 0 ? Math.round((stats.unique_opens / stats.delivered) * 100) : 0}%)`);
        console.log(`   🖱️ Clicks: ${stats.unique_clicks} (${stats.delivered > 0 ? Math.round((stats.unique_clicks / stats.delivered) * 100) : 0}%)`);
        console.log('');
      }
      
      console.log('🎯 NEXT STEPS:');
      console.log('1. Copy a campaign ID from above');
      console.log('2. Update your database campaigns table with real SendGrid IDs');
      console.log('3. Click the sync button (🔄) on campaign cards to fetch real data');
      console.log('4. Watch your metrics update with actual SendGrid analytics!');
      
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🚀 Make sure your Next.js dev server is running:');
      console.log('   npm run dev');
    }
  }
}

discoverSendGridCampaigns().catch(console.error);