import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ENV_FILE_PATH = join(process.cwd(), '.env.local')

// GET - Get current simulation mode status
export async function GET() {
  try {
    const currentMode = process.env.EMAIL_SIMULATION_MODE || 'false'
    
    return NextResponse.json({
      success: true,
      simulationMode: currentMode === 'true',
      rawValue: currentMode
    })
  } catch (error) {
    console.error('Error getting simulation mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get simulation mode' },
      { status: 500 }
    )
  }
}

// POST - Toggle simulation mode
export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json()
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }
    
    const newValue = enabled ? 'true' : 'false'
    
    // Update environment variable
    let envContent = ''
    if (existsSync(ENV_FILE_PATH)) {
      envContent = readFileSync(ENV_FILE_PATH, 'utf8')
    }
    
    // Update or add EMAIL_SIMULATION_MODE
    const lines = envContent.split('\n')
    let found = false
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('EMAIL_SIMULATION_MODE=')) {
        lines[i] = `EMAIL_SIMULATION_MODE=${newValue}`
        found = true
        break
      }
    }
    
    if (!found) {
      lines.push(`EMAIL_SIMULATION_MODE=${newValue}`)
    }
    
    // Write back to file
    writeFileSync(ENV_FILE_PATH, lines.join('\n'))
    
    // Update runtime environment variable
    process.env.EMAIL_SIMULATION_MODE = newValue
    
    console.log(`✅ Email simulation mode ${enabled ? 'enabled' : 'disabled'}`)
    
    return NextResponse.json({
      success: true,
      message: `Email simulation mode ${enabled ? 'enabled' : 'disabled'}`,
      simulationMode: enabled,
      rawValue: newValue
    })
  } catch (error) {
    console.error('Error toggling simulation mode:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle simulation mode' },
      { status: 500 }
    )
  }
}