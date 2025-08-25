import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    console.log('Admin API: GitHub workflow management action:', action)
    
    if (action === 'delete_all_runs') {
      return await deleteAllWorkflowRuns()
    } else if (action === 'pause_workflow') {
      return await pauseWorkflow()
    } else if (action === 'resume_workflow') {
      return await resumeWorkflow()
    } else {
      return NextResponse.json({
        error: 'Invalid action',
        validActions: ['delete_all_runs', 'pause_workflow', 'resume_workflow']
      }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Admin API: Workflow management error:', error)
    return NextResponse.json({ 
      error: 'Failed to execute workflow management action',
      details: error.message 
    }, { status: 500 })
  }
}

async function deleteAllWorkflowRuns() {
  try {
    console.log('Admin API: Starting deletion of all workflow runs...')
    
    // Get all workflow runs
    const { stdout: workflowRuns } = await execAsync(
      'gh run list --workflow="Email Automation Processor" --limit=1000 --json="databaseId"'
    )
    
    const runs = JSON.parse(workflowRuns)
    console.log('Admin API: Found', runs.length, 'runs to delete')
    
    if (runs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No workflow runs to delete',
        deletedCount: 0
      })
    }
    
    // Delete runs in batches to avoid overwhelming the API
    const batchSize = 10
    let deletedCount = 0
    let errors = []
    
    for (let i = 0; i < runs.length; i += batchSize) {
      const batch = runs.slice(i, i + batchSize)
      console.log(`Admin API: Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(runs.length / batchSize)}`)
      
      const deletePromises = batch.map(async (run: any) => {
        try {
          await execAsync(`gh run delete ${run.databaseId}`)
          deletedCount++
          return { success: true, runId: run.databaseId }
        } catch (error: any) {
          errors.push({ runId: run.databaseId, error: error.message })
          return { success: false, runId: run.databaseId, error: error.message }
        }
      })
      
      await Promise.all(deletePromises)
      
      // Small delay between batches to be respectful to GitHub API
      if (i + batchSize < runs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log('Admin API: Deletion completed. Deleted:', deletedCount, 'Errors:', errors.length)
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} workflow runs`,
      deletedCount,
      totalRuns: runs.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Show first 10 errors
    })
    
  } catch (error: any) {
    console.error('Admin API: Error deleting workflow runs:', error)
    return NextResponse.json({
      error: 'Failed to delete workflow runs',
      details: error.message
    }, { status: 500 })
  }
}

async function pauseWorkflow() {
  try {
    console.log('Admin API: Disabling Email Automation Processor workflow...')
    
    // First check if we can find the workflow
    try {
      await execAsync('gh workflow list')
    } catch (listError: any) {
      console.error('Admin API: GitHub CLI environment issue:', listError.message)
      return NextResponse.json({
        error: 'GitHub CLI not properly configured in API environment',
        details: 'Workflow management requires direct GitHub access. Please use GitHub web interface or CLI directly.',
        suggestion: 'Use the GitHub website to manage workflows: https://github.com/your-repo/actions'
      }, { status: 503 })
    }
    
    // Disable the workflow
    const { stdout, stderr } = await execAsync(
      'gh workflow disable "Email Automation Processor"'
    )
    
    console.log('Admin API: Workflow disabled successfully')
    
    // Get workflow status (GitHub CLI doesn't provide JSON for workflow state, so we'll indicate success)
    const workflowState = 'disabled'
    
    return NextResponse.json({
      success: true,
      message: 'Email Automation Processor workflow has been disabled',
      workflowState: workflowState,
      note: 'The scheduled automation will no longer run. You can re-enable it using the Resume button.'
    })
    
  } catch (error: any) {
    console.error('Admin API: Error disabling workflow:', error)
    
    // Provide helpful error message for common issues
    let helpMessage = error.message
    if (error.message.includes('could not find any workflows')) {
      helpMessage = 'Workflow not found. This may be due to GitHub CLI environment issues in the API context.'
    }
    
    return NextResponse.json({
      error: 'Failed to disable workflow',
      details: helpMessage,
      suggestion: 'Try using GitHub web interface or CLI directly from terminal'
    }, { status: 500 })
  }
}

async function resumeWorkflow() {
  try {
    console.log('Admin API: Enabling Email Automation Processor workflow...')
    
    // First check if we can find the workflow
    try {
      await execAsync('gh workflow list')
    } catch (listError: any) {
      console.error('Admin API: GitHub CLI environment issue:', listError.message)
      return NextResponse.json({
        error: 'GitHub CLI not properly configured in API environment',
        details: 'Workflow management requires direct GitHub access. Please use GitHub web interface or CLI directly.',
        suggestion: 'Use the GitHub website to manage workflows: https://github.com/your-repo/actions'
      }, { status: 503 })
    }
    
    // Enable the workflow
    const { stdout, stderr } = await execAsync(
      'gh workflow enable "Email Automation Processor"'
    )
    
    console.log('Admin API: Workflow enabled successfully')
    
    // Get workflow status (GitHub CLI doesn't provide JSON for workflow state, so we'll indicate success)
    const workflowState = 'enabled'
    
    return NextResponse.json({
      success: true,
      message: 'Email Automation Processor workflow has been enabled',
      workflowState: workflowState,
      note: 'The scheduled automation will resume running according to its schedule.'
    })
    
  } catch (error: any) {
    console.error('Admin API: Error enabling workflow:', error)
    
    // Provide helpful error message for common issues
    let helpMessage = error.message
    if (error.message.includes('could not find any workflows')) {
      helpMessage = 'Workflow not found. This may be due to GitHub CLI environment issues in the API context.'
    }
    
    return NextResponse.json({
      error: 'Failed to enable workflow',
      details: helpMessage,
      suggestion: 'Try using GitHub web interface or CLI directly from terminal'
    }, { status: 500 })
  }
}