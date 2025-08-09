#!/usr/bin/env node

/**
 * Campaign Automation Processor
 * 
 * This script processes campaign automation jobs by:
 * 1. Finding active campaigns with "New Client" triggers
 * 2. Auto-enrolling new contacts into active campaigns
 * 3. Processing scheduled sequence jobs
 * 4. Sending emails and SMS based on campaign configuration
 * 
 * Usage:
 * node scripts/process-campaign-automation.js
 * 
 * For testing:
 * node scripts/process-campaign-automation.js --test
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const isTestMode = process.argv.includes('--test')

async function processCampaignAutomation() {
  console.log('🚀 Campaign Automation Processor - DISABLED')
  console.log('==========================================')
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log(`🧪 Test Mode: ${isTestMode ? 'ON' : 'OFF'}`)
  console.log('')
  console.log('⚠️  AUTOMATION DISABLED: Using n8n for workflow automation')
  console.log('')

  try {
    console.log('1. Campaign automation jobs disabled')
    console.log('   ✅ Using n8n for workflow automation instead')

    console.log('')
    console.log('2. Sequence processing disabled')
    console.log('   ✅ n8n will handle email/SMS sequences')

    console.log('')
    console.log('3. Automation summary disabled')
    console.log('   ✅ Check n8n dashboard for automation metrics')

    console.log('')
    console.log('🎉 Campaign automation check completed (all disabled for n8n)')
    
    if (isTestMode) {
      console.log('')
      console.log('💡 Automation Notes:')
      console.log('- Campaign automation has been disabled')
      console.log('- Using n8n for workflow automation instead')
      console.log('- This script no longer processes automation jobs')
    }

  } catch (error) {
    console.error('❌ Campaign automation check failed:', error.message)
    process.exit(1)
  }
}

// DISABLED: These functions are no longer used as automation is handled by n8n
//
// async function processNewClientTriggers() {
//   try {
//     const response = await fetch(`${baseUrl}/api/campaigns/automation/trigger-new-clients?testMode=${isTestMode}`)
//     const result = await response.json()
//     
//     if (!response.ok) {
//       throw new Error(result.error || 'Failed to process new client triggers')
//     }
//     
//     return result
//   } catch (error) {
//     return { success: false, error: error.message }
//   }
// }
//
// async function processPendingSequences() {
//   try {
//     const response = await fetch(`${baseUrl}/api/campaigns/automation/process-pending?testMode=${isTestMode}`)
//     const result = await response.json()
//     
//     if (!response.ok) {
//       throw new Error(result.error || 'Failed to process pending sequences')
//     }
//     
//     return result
//   } catch (error) {
//     return { success: false, error: error.message }
//   }
// }
//
// async function generateAutomationSummary() {
//   try {
//     const response = await fetch(`${baseUrl}/api/campaigns/automation/summary`)
//     const result = await response.json()
//     
//     if (!response.ok) {
//       throw new Error(result.error || 'Failed to generate summary')
//     }
//     
//     return result
//   } catch (error) {
//     return { success: false, error: error.message }
//   }
// }

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Campaign automation interrupted. Exiting gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Campaign automation terminated. Exiting gracefully...')
  process.exit(0)
})

// Run the automation processor
processCampaignAutomation()