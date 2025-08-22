#!/usr/bin/env node

// Quick test to verify the dashboard will now get real SendGrid data

require('dotenv').config({ path: ['.env.local', '.env'] })

async function testDashboardFix() {
  console.log('🧪 Testing dashboard analytics fix...\n')
  
  const apiKey = process.env.SENDGRID_API_KEY
  
  if (!apiKey) {
    console.log('❌ SENDGRID_API_KEY not found')
    return
  }
  
  console.log('✅ SendGrid API Key found')
  
  // Test the SendGrid direct API
  try {
    const { SendGridDirectAPI } = await import('./lib/sendgrid-direct-api.js')
    
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`📅 Testing date range: ${startDate} to ${endDate}`)
    
    const metrics = await SendGridDirectAPI.getAccountMetrics(startDate, endDate)
    
    if (metrics && metrics.emailsSent > 0) {
      console.log('\n🎉 SUCCESS! Dashboard will now show:')
      console.log(`   📤 Emails Sent: ${metrics.emailsSent}`)
      console.log(`   📬 Delivery Rate: ${metrics.deliveryRate}%`)
      console.log(`   👀 Open Rate: ${metrics.openRate}%`)
      console.log(`   🖱️ Click Rate: ${metrics.clickRate}%`)
      console.log('\n✅ Real SendGrid data will appear on dashboard!')
    } else {
      console.log('⚠️ No metrics returned - check SendGrid API')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDashboardFix().catch(console.error)