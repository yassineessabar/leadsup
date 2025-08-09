#!/usr/bin/env node

/**
 * Campaign Automation Daemon
 * 
 * Alternative to cron for development - runs continuously in the background
 * Automatically processes campaign automation at specified intervals
 * 
 * Usage:
 * node scripts/automation-daemon.js
 * node scripts/automation-daemon.js --interval=300000  # 5 minutes
 * node scripts/automation-daemon.js --test             # Test mode
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

class AutomationDaemon {
  constructor(options = {}) {
    this.interval = options.interval || 15 * 60 * 1000 // 15 minutes default
    this.testMode = options.testMode || false
    this.scriptPath = path.join(__dirname, 'process-campaign-automation.js')
    this.isRunning = false
    this.processCount = 0
    this.lastRun = null
    this.nextRun = null
    
    console.log('🤖 Campaign Automation Daemon')
    console.log('=============================')
    console.log(`⏰ Interval: ${this.interval / 1000} seconds (${this.interval / 60000} minutes)`)
    console.log(`🧪 Test Mode: ${this.testMode ? 'ON' : 'OFF'}`)
    console.log(`📁 Script: ${this.scriptPath}`)
    console.log('')
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Daemon is already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Starting automation daemon...')
    
    // Run immediately on start
    this.runAutomation()
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.runAutomation()
    }, this.interval)
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop('SIGINT'))
    process.on('SIGTERM', () => this.stop('SIGTERM'))
    
    console.log('✅ Daemon started successfully')
    this.updateNextRun()
  }

  stop(signal = '') {
    if (!this.isRunning) {
      return
    }

    console.log(`\n⏹️  Stopping daemon${signal ? ` (${signal})` : ''}...`)
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    
    console.log('✅ Daemon stopped')
    process.exit(0)
  }

  runAutomation() {
    if (!fs.existsSync(this.scriptPath)) {
      console.error(`❌ Script not found: ${this.scriptPath}`)
      return
    }

    this.processCount++
    this.lastRun = new Date()
    
    console.log(`\n🔄 Running automation #${this.processCount} at ${this.lastRun.toLocaleTimeString()}`)
    
    const args = []
    if (this.testMode) {
      args.push('--test')
    }
    
    const child = spawn('node', [this.scriptPath, ...args], {
      cwd: path.dirname(this.scriptPath),
      stdio: 'pipe'
    })
    
    let output = ''
    
    child.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      // Show real-time output with indentation
      text.split('\n').forEach(line => {
        if (line.trim()) {
          console.log(`   ${line}`)
        }
      })
    })
    
    child.stderr.on('data', (data) => {
      const text = data.toString()
      console.error(`   ERROR: ${text}`)
    })
    
    child.on('close', (code) => {
      const duration = Date.now() - this.lastRun.getTime()
      
      if (code === 0) {
        console.log(`✅ Automation completed successfully (${duration}ms)`)
      } else {
        console.log(`❌ Automation failed with code ${code} (${duration}ms)`)
      }
      
      this.updateNextRun()
      this.showStatus()
    })
    
    child.on('error', (error) => {
      console.error(`❌ Failed to start automation: ${error.message}`)
    })
  }

  updateNextRun() {
    this.nextRun = new Date(Date.now() + this.interval)
  }

  showStatus() {
    console.log('')
    console.log('📊 Status:')
    console.log(`   Runs completed: ${this.processCount}`)
    console.log(`   Last run: ${this.lastRun ? this.lastRun.toLocaleTimeString() : 'Never'}`)
    console.log(`   Next run: ${this.nextRun ? this.nextRun.toLocaleTimeString() : 'Unknown'}`)
    console.log(`   Running: ${this.isRunning ? 'Yes' : 'No'}`)
    console.log('')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      processCount: this.processCount,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      interval: this.interval,
      testMode: this.testMode
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {}
  
  args.forEach(arg => {
    if (arg === '--test') {
      options.testMode = true
    } else if (arg.startsWith('--interval=')) {
      const interval = parseInt(arg.split('=')[1])
      if (interval > 0) {
        options.interval = interval
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log('Campaign Automation Daemon')
      console.log('')
      console.log('Usage:')
      console.log('  node scripts/automation-daemon.js [options]')
      console.log('')
      console.log('Options:')
      console.log('  --test              Run in test mode (no actual sending)')
      console.log('  --interval=MILLIS   Set interval in milliseconds (default: 900000 = 15 min)')
      console.log('  --help, -h          Show this help')
      console.log('')
      console.log('Examples:')
      console.log('  node scripts/automation-daemon.js')
      console.log('  node scripts/automation-daemon.js --test')
      console.log('  node scripts/automation-daemon.js --interval=300000  # 5 minutes')
      process.exit(0)
    }
  })
  
  return options
}

// Main execution
if (require.main === module) {
  const options = parseArgs()
  const daemon = new AutomationDaemon(options)
  
  // Create log file
  const logDir = path.join(__dirname, '..', 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  
  daemon.start()
}