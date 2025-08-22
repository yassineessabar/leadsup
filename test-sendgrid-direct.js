#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] })

async function testSendGridDirect() {
  console.log('🧪 Testing direct SendGrid API integration...\n')
  
  const apiKey = process.env.SENDGRID_API_KEY
  
  if (!apiKey) {
    console.log('❌ SENDGRID_API_KEY not found in environment variables')
    console.log('💡 Add SENDGRID_API_KEY=your_api_key to your .env.local file')
    return
  }
  
  console.log(`🔑 SendGrid API Key: ${apiKey.substring(0, 20)}...`)
  
  try {
    // Test last 30 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`📅 Fetching metrics from ${startDate} to ${endDate}`)
    
    const url = `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`
    console.log(`🔗 API URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ API Error:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('📊 SendGrid API Response:')
    console.log(JSON.stringify(data, null, 2))
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('\n⚠️ No data returned from SendGrid API')
      console.log('💡 This could mean:')
      console.log('   - No emails have been sent through SendGrid')
      console.log('   - Date range is incorrect')
      console.log('   - API key lacks permissions')
    } else {
      console.log(`\n✅ Found ${data.length} days of data`)
      
      // Calculate totals
      let totalSent = 0
      let totalDelivered = 0
      let totalOpens = 0
      let totalClicks = 0
      
      data.forEach((dayData, index) => {
        const stats = dayData.stats?.[0]?.metrics || {}
        const sent = stats.requests || stats.processed || 0
        const delivered = stats.delivered || 0
        const opens = stats.unique_opens || 0
        const clicks = stats.unique_clicks || 0
        
        totalSent += sent
        totalDelivered += delivered
        totalOpens += opens
        totalClicks += clicks
        
        if (sent > 0) {
          console.log(`   Day ${index + 1}: ${sent} sent, ${delivered} delivered, ${opens} opens, ${clicks} clicks`)
        }
      })
      
      console.log('\n📈 TOTALS:')
      console.log(`   📤 Emails Sent: ${totalSent}`)
      console.log(`   📬 Emails Delivered: ${totalDelivered}`)
      console.log(`   👀 Unique Opens: ${totalOpens}`)
      console.log(`   🖱️ Unique Clicks: ${totalClicks}`)
      
      if (totalSent > 0) {
        const deliveryRate = (totalDelivered / totalSent * 100).toFixed(1)
        const openRate = totalDelivered > 0 ? (totalOpens / totalDelivered * 100).toFixed(1) : 0
        const clickRate = totalDelivered > 0 ? (totalClicks / totalDelivered * 100).toFixed(1) : 0
        
        console.log('\n📊 CALCULATED RATES:')
        console.log(`   📬 Delivery Rate: ${deliveryRate}%`)
        console.log(`   👀 Open Rate: ${openRate}%`)
        console.log(`   🖱️ Click Rate: ${clickRate}%`)
        
        console.log('\n✅ SUCCESS! Real SendGrid data is available.')
        console.log('🔄 Your dashboard should now show these real metrics.')
      } else {
        console.log('\n⚠️ No email activity found in SendGrid')
        console.log('💡 Send some emails through your campaigns to see metrics')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testSendGridDirect().catch(console.error)