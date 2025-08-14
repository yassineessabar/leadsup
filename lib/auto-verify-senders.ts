// Auto-verification system for SendGrid sender identities
import { getSenderIdentities } from './sendgrid'

export async function autoVerifyUnverifiedSenders() {
  console.log('🔄 Starting auto-verification of unverified senders...')
  
  try {
    // Get all sender identities from SendGrid
    const { senders } = await getSenderIdentities()
    
    if (!senders || senders.length === 0) {
      console.log('📭 No sender identities found')
      return { success: true, processed: 0 }
    }
    
    // Find unverified senders
    const unverifiedSenders = senders.filter(sender => !sender.verified)
    
    if (unverifiedSenders.length === 0) {
      console.log('✅ All sender identities are already verified!')
      return { success: true, processed: 0 }
    }
    
    console.log(`🔍 Found ${unverifiedSenders.length} unverified senders:`)
    unverifiedSenders.forEach(sender => {
      console.log(`  ❌ ${sender.from_email} (ID: ${sender.id})`)
    })
    
    let processedCount = 0
    
    // Process each unverified sender
    for (const sender of unverifiedSenders) {
      try {
        await autoVerifySender(sender)
        processedCount++
      } catch (error) {
        console.error(`❌ Failed to auto-verify ${sender.from_email}:`, error.message)
      }
    }
    
    console.log(`✅ Auto-verification complete! Processed ${processedCount}/${unverifiedSenders.length} senders`)
    
    return {
      success: true,
      processed: processedCount,
      total: unverifiedSenders.length
    }
    
  } catch (error) {
    console.error('❌ Auto-verification failed:', error)
    return {
      success: false,
      error: error.message,
      processed: 0
    }
  }
}

async function autoVerifySender(sender: any) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  
  console.log(`🔄 Auto-verifying ${sender.from_email}...`)
  
  // First, check if domain is authenticated
  const domain = sender.from_email.split('@')[1]
  const isDomainAuthenticated = await checkDomainAuthentication(domain)
  
  if (!isDomainAuthenticated) {
    console.log(`  ⚠️  Domain ${domain} is not authenticated - cannot auto-verify`)
    throw new Error(`Domain ${domain} not authenticated`)
  }
  
  console.log(`  ✅ Domain ${domain} is authenticated - proceeding with verification`)
  
  // Method 1: Try resending verification first (simpler approach)
  try {
    console.log(`  📧 Attempting to resend verification for ${sender.from_email}...`)
    
    const resendResponse = await fetch(`https://api.sendgrid.com/v3/verified_senders/${sender.id}/resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (resendResponse.ok) {
      console.log(`  📤 Resent verification email for ${sender.from_email}`)
      
      // Wait a moment for SendGrid to process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if it's now verified
      const checkResponse = await fetch(`https://api.sendgrid.com/v3/verified_senders/${sender.id}`, {
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (checkResponse.ok) {
        const updatedSender = await checkResponse.json()
        if (updatedSender.verified) {
          console.log(`  ✅ ${sender.from_email} verified via resend!`)
          return
        }
      }
    }
  } catch (resendError) {
    console.log(`  ⚠️  Resend failed, trying delete-recreate method...`)
  }
  
  // Method 2: Delete and recreate (forces fresh verification check)
  try {
    console.log(`  🔄 Using delete-recreate method for ${sender.from_email}...`)
    
    // Delete the unverified sender
    const deleteResponse = await fetch(`https://api.sendgrid.com/v3/verified_senders/${sender.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete sender: ${deleteResponse.status}`)
    }
    
    console.log(`  🗑️ Deleted unverified sender ${sender.from_email}`)
    
    // Wait a moment for SendGrid to process deletion
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Recreate with same details
    const createPayload = {
      nickname: sender.nickname,
      from_email: sender.from_email,
      from_name: sender.from_name,
      reply_to: sender.reply_to,
      reply_to_name: sender.reply_to_name,
      address: sender.address,
      address_2: sender.address_2 || '',
      city: sender.city,
      state: sender.state || 'NY',
      zip: sender.zip || '10001',
      country: sender.country || 'US'
    }
    
    const createResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    })
    
    const newSender = await createResponse.json()
    
    if (createResponse.ok) {
      if (newSender.verified) {
        console.log(`  ✅ ${sender.from_email} auto-verified successfully! (Domain authenticated)`)
      } else {
        console.log(`  ⚠️  ${sender.from_email} recreated but verification still pending`)
        console.log(`  🔍 New sender ID: ${newSender.id}, Status: ${newSender.verification_status || 'unknown'}`)
        
        // Try one more verification check after a delay
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const finalCheckResponse = await fetch(`https://api.sendgrid.com/v3/verified_senders/${newSender.id}`, {
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (finalCheckResponse.ok) {
          const finalSender = await finalCheckResponse.json()
          if (finalSender.verified) {
            console.log(`  ✅ ${sender.from_email} verified after delay!`)
          } else {
            console.log(`  ⏳ ${sender.from_email} verification still pending - may need time to process`)
          }
        }
      }
    } else {
      throw new Error(`Failed to recreate sender: ${JSON.stringify(newSender)}`)
    }
    
  } catch (error) {
    console.error(`❌ Auto-verification failed for ${sender.from_email}:`, error.message)
    throw error
  }
}

// Helper function to check if domain is authenticated in SendGrid
async function checkDomainAuthentication(domain: string): Promise<boolean> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return false
    }
    
    const domains = await response.json()
    const matchingDomain = domains.find((d: any) => d.domain === domain && d.valid)
    
    return !!matchingDomain
  } catch (error) {
    console.error(`Error checking domain authentication for ${domain}:`, error.message)
    return false
  }
}

// Function to auto-verify specific domain senders
export async function autoVerifyDomainSenders(domain: string) {
  console.log(`🎯 Auto-verifying senders for ${domain}...`)
  
  try {
    const { senders } = await getSenderIdentities()
    const domainSenders = senders?.filter(s => s.from_email.endsWith(`@${domain}`)) || []
    
    if (domainSenders.length === 0) {
      console.log(`📭 No senders found for ${domain}`)
      return { success: true, processed: 0 }
    }
    
    const unverifiedDomainSenders = domainSenders.filter(s => !s.verified)
    
    if (unverifiedDomainSenders.length === 0) {
      console.log(`✅ All senders for ${domain} are already verified!`)
      return { success: true, processed: 0 }
    }
    
    console.log(`🔄 Processing ${unverifiedDomainSenders.length} unverified senders for ${domain}`)
    
    let processedCount = 0
    
    for (const sender of unverifiedDomainSenders) {
      try {
        await autoVerifySender(sender)
        processedCount++
      } catch (error) {
        console.error(`❌ Failed to auto-verify ${sender.from_email}:`, error.message)
      }
    }
    
    return {
      success: true,
      processed: processedCount,
      total: unverifiedDomainSenders.length,
      domain
    }
    
  } catch (error) {
    console.error(`❌ Domain auto-verification failed for ${domain}:`, error)
    return {
      success: false,
      error: error.message,
      processed: 0,
      domain
    }
  }
}