#!/usr/bin/env node

/**
 * Cron job script to process pending automation jobs
 * 
 * This script should be run periodically (every 5-15 minutes) to:
 * 1. Check for pending automation jobs that are due to be sent
 * 2. Process email and SMS automations
 * 3. Update job statuses
 * 
 * Usage:
 * node scripts/process-automation-cron.js
 * 
 * For testing:
 * node scripts/process-automation-cron.js --test
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const isTestMode = process.argv.includes('--test')

async function processAutomationJobs() {
  console.log('🕐 Processing Automation Cron Job')
  console.log('=================================')
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log(`🧪 Test Mode: ${isTestMode ? 'ON' : 'OFF'}`)
  console.log('')

  try {
    // First, get the count of pending jobs
    console.log('1. Checking pending automation jobs...')
    const listResponse = await fetch(`${baseUrl}/api/automation/scheduler?action=list_pending`)
    const listData = await listResponse.json()
    
    if (listData.success) {
      const pendingCount = listData.data.count
      console.log(`✅ Found ${pendingCount} pending automation job(s)`)
      
      if (pendingCount === 0) {
        console.log('ℹ️  No pending jobs to process. Exiting.')
        return
      }
      
      // Show some details about pending jobs
      const pendingJobs = listData.data.pendingJobs.slice(0, 5) // Show first 5
      pendingJobs.forEach(job => {
        const scheduledTime = new Date(job.scheduled_for).toLocaleString()
        console.log(`   - Job ${job.id}: ${job.template_type} for ${job.customer_name || 'Unknown'} (scheduled: ${scheduledTime})`)
      })
      
      if (listData.data.count > 5) {
        console.log(`   ... and ${listData.data.count - 5} more`)
      }
    } else {
      console.log('❌ Error checking pending jobs:', listData.error)
      return
    }

    console.log('')
    console.log('2. Processing pending automation jobs...')
    
    // Process the pending automations
    const processResponse = await fetch(`${baseUrl}/api/automation/scheduler?action=process_pending&testMode=${isTestMode}`)
    const processData = await processResponse.json()
    
    if (processData.success) {
      const result = processData.data
      console.log('✅ Processing completed successfully!')
      console.log(`   📊 Total processed: ${result.processedJobs}`)
      console.log(`   ✅ Successful: ${result.successfulJobs}`)
      console.log(`   ❌ Failed: ${result.failedJobs}`)
      console.log(`   🧪 Test mode: ${result.testMode ? 'ON' : 'OFF'}`)
      
      if (result.results && result.results.length > 0) {
        console.log('')
        console.log('📋 Job Results:')
        result.results.forEach(job => {
          const status = job.success ? '✅' : '❌'
          const testInfo = result.testMode ? ' [TEST]' : ''
          console.log(`   ${status} Job ${job.jobId} (${job.type})${testInfo}`)
          if (job.error) {
            console.log(`      Error: ${job.error}`)
          }
        })
      }
    } else {
      console.log('❌ Error processing automation jobs:', processData.error)
    }

    console.log('')
    console.log('🎉 Automation cron job completed!')
    
    if (isTestMode) {
      console.log('')
      console.log('💡 Test Mode Notes:')
      console.log('- No emails or SMS were actually sent')
      console.log('- Job statuses were updated as if they were processed')
      console.log('- Run without --test flag to actually send communications')
    }

  } catch (error) {
    console.error('❌ Cron job failed with error:', error.message)
    console.log('')
    console.log('🔧 Troubleshooting:')
    console.log('- Make sure your Next.js server is running')
    console.log('- Check that the database is accessible')
    console.log('- Verify environment variables are set')
    console.log('- Ensure SMTP/Twilio credentials are configured')
    
    // Exit with error code for cron monitoring
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Cron job interrupted. Exiting gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⏹️  Cron job terminated. Exiting gracefully...')
  process.exit(0)
})

// Run the cron job
processAutomationJobs()