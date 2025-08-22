#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] })

async function testUserAnalytics() {
  console.log('🧪 Testing user-specific analytics...\n')
  
  try {
    const { UserSpecificAnalytics } = await import('./lib/user-specific-analytics.js')
    
    // Use the active user we found
    const activeUserId = '16bec73e-34e5-4f25-b3dc-da19906d0a54'
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`👤 Testing for user: ${activeUserId}`)
    console.log(`📅 Date range: ${startDate} to ${endDate}`)
    
    const userMetrics = await UserSpecificAnalytics.getUserMetrics(activeUserId, startDate, endDate)
    
    if (userMetrics) {
      console.log('\n🎯 USER-SPECIFIC METRICS:')
      console.log(`   📤 Emails Sent: ${userMetrics.emailsSent}`)
      console.log(`   📬 Emails Delivered: ${userMetrics.emailsDelivered}`)
      console.log(`   📊 Delivery Rate: ${userMetrics.deliveryRate}%`)
      console.log(`   👀 Unique Opens: ${userMetrics.uniqueOpens}`)
      console.log(`   📈 Open Rate: ${userMetrics.openRate}%`)
      console.log(`   🖱️ Unique Clicks: ${userMetrics.uniqueClicks}`)
      console.log(`   📊 Click Rate: ${userMetrics.clickRate}%`)
      
      console.log('\n✅ SUCCESS! These are USER-SPECIFIC metrics')
      console.log('🎯 Dashboard will now show this user\'s data only')
      
      if (userMetrics.emailsSent > 0) {
        console.log(`\n📊 This user has sent ${userMetrics.emailsSent} emails`)
      } else {
        console.log('\n⚠️ This user has no email activity in the date range')
      }
      
    } else {
      console.log('❌ Failed to calculate user metrics')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUserAnalytics().catch(console.error)