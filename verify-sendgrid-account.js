#!/usr/bin/env node

require('dotenv').config({ path: ['.env.local', '.env'] })

async function verifySendGridAccount() {
  console.log('🔍 Verifying SendGrid account details...\n')
  
  const apiKey = process.env.SENDGRID_API_KEY
  
  if (!apiKey) {
    console.log('❌ SENDGRID_API_KEY not found')
    return
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 10)}`)
  
  try {
    // 1. First, get account details to verify which account this is
    console.log('\n📋 Checking account details...')
    const accountResponse = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json()
      console.log('✅ Account Info:')
      console.log(`   Type: ${accountData.type}`)
      console.log(`   Reputation: ${accountData.reputation}`)
      if (accountData.email) console.log(`   Email: ${accountData.email}`)
    } else {
      console.log('⚠️ Could not fetch account details')
    }
    
    // 2. Check recent activity with more details
    console.log('\n📊 Checking recent email activity (last 7 days)...')
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const statsResponse = await fetch(`https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!statsResponse.ok) {
      console.log('❌ Failed to fetch stats:', statsResponse.status)
      return
    }
    
    const statsData = await statsResponse.json()
    console.log(`📅 Date range: ${startDate} to ${endDate}`)
    
    let totalRecent = 0
    let daysWithActivity = 0
    
    statsData.forEach((dayData, index) => {
      const stats = dayData.stats?.[0]?.metrics || {}
      const sent = stats.requests || stats.processed || 0
      const delivered = stats.delivered || 0
      const opens = stats.unique_opens || 0
      
      totalRecent += sent
      if (sent > 0) {
        daysWithActivity++
        console.log(`   ${dayData.date}: ${sent} sent, ${delivered} delivered, ${opens} opens`)
      }
    })
    
    console.log(`\n📈 Last 7 days summary:`)
    console.log(`   Total emails sent: ${totalRecent}`)
    console.log(`   Days with activity: ${daysWithActivity}`)
    
    // 3. Check if there are any subusers or multiple senders
    console.log('\n👥 Checking subusers...')
    const subusersResponse = await fetch('https://api.sendgrid.com/v3/subusers', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (subusersResponse.ok) {
      const subusers = await subusersResponse.json()
      console.log(`   Subusers found: ${subusers.length}`)
      if (subusers.length > 0) {
        subusers.slice(0, 3).forEach(user => {
          console.log(`   - ${user.username} (${user.email})`)
        })
      }
    }
    
    // 4. Check sending domains
    console.log('\n🌐 Checking authenticated domains...')
    const domainsResponse = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (domainsResponse.ok) {
      const domains = await domainsResponse.json()
      console.log(`   Domains found: ${domains.length}`)
      domains.slice(0, 3).forEach(domain => {
        console.log(`   - ${domain.domain} (valid: ${domain.valid})`)
      })
    }
    
    console.log('\n🎯 VERIFICATION SUMMARY:')
    if (totalRecent > 0) {
      console.log('✅ This SendGrid account has recent email activity')
      console.log('✅ The stats shown earlier are from YOUR account')
      console.log('✅ These are your real email metrics')
    } else {
      console.log('⚠️ No recent activity in the last 7 days')
      console.log('💡 Check if emails were sent more than 7 days ago')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

verifySendGridAccount().catch(console.error)