import { NextRequest, NextResponse } from "next/server"

interface GitHubWorkflowRun {
  id: number
  name: string
  head_branch: string
  head_sha: string
  path: string
  display_title: string
  run_number: number
  event: string
  status: string
  conclusion: string
  workflow_id: number
  check_suite_id: number
  check_suite_node_id: string
  url: string
  html_url: string
  pull_requests: any[]
  created_at: string
  updated_at: string
  actor: {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    type: string
    site_admin: boolean
  }
  run_attempt: number
  referenced_workflows: any[]
  run_started_at: string
  triggering_actor: any
  jobs_url: string
  logs_url: string
  check_suite_url: string
  artifacts_url: string
  cancel_url: string
  rerun_url: string
  previous_attempt_url: string | null
  workflow_url: string
  head_commit: {
    id: string
    tree_id: string
    message: string
    timestamp: string
    author: {
      name: string
      email: string
    }
    committer: {
      name: string
      email: string
    }
  }
  repository: {
    id: number
    node_id: string
    name: string
    full_name: string
    private: boolean
    owner: any
  }
  head_repository: any
}

interface GitHubJob {
  id: number
  run_id: number
  workflow_name: string
  head_branch: string
  run_url: string
  run_attempt: number
  node_id: string
  head_sha: string
  url: string
  html_url: string
  status: string
  conclusion: string
  created_at: string
  started_at: string
  completed_at: string
  name: string
  steps: Array<{
    name: string
    status: string
    conclusion: string
    number: number
    started_at: string
    completed_at: string
  }>
  check_run_url: string
  labels: string[]
  runner_id: number
  runner_name: string
  runner_group_id: number
  runner_group_name: string
}

// GitHub token from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = process.env.GITHUB_REPOSITORY_OWNER || 'yassineessabar'
const REPO_NAME = process.env.GITHUB_REPOSITORY_NAME || 'leadsup'

async function fetchGitHubAPI(endpoint: string) {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token not configured')
  }

  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status') || 'all'
    const conclusion = searchParams.get('conclusion') || 'all'

    // Check if GitHub token is properly configured
    if (!GITHUB_TOKEN || GITHUB_TOKEN === 'ghp_dummy_token_for_demo') {
      // Return mock data for demonstration
      return NextResponse.json({
        success: true,
        data: {
          runs: getMockWorkflowRuns(),
          stats: getMockStats(),
          pagination: {
            page,
            limit,
            total: 25,
            totalPages: Math.ceil(25 / limit)
          }
        }
      })
    }

    // Fetch workflow runs
    let endpoint = `actions/runs?per_page=${limit}&page=${page}`
    if (status !== 'all') {
      endpoint += `&status=${status}`
    }
    if (conclusion !== 'all') {
      endpoint += `&conclusion=${conclusion}`
    }

    const workflowRuns = await fetchGitHubAPI(endpoint)

    // Fetch detailed job information for each run
    const enrichedRuns = await Promise.all(
      workflowRuns.workflow_runs.map(async (run: GitHubWorkflowRun) => {
        try {
          // Fetch jobs for this run
          const jobs = await fetchGitHubAPI(`actions/runs/${run.id}/jobs`)
          
          // Parse logs from job steps for email/automation specific information
          const automationLogs = jobs.jobs.map((job: GitHubJob) => {
            const emailLogs: any[] = []
            
            job.steps.forEach(step => {
              // Extract automation-specific information from step names
              if (step.name.includes('Process Scheduled') || 
                  step.name.includes('Process Warmup') ||
                  step.name.includes('Email')) {
                emailLogs.push({
                  step_name: step.name,
                  status: step.status,
                  conclusion: step.conclusion,
                  started_at: step.started_at,
                  completed_at: step.completed_at,
                  duration: step.started_at && step.completed_at 
                    ? new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()
                    : null,
                  job_name: job.name
                })
              }
            })
            
            return {
              job_id: job.id,
              job_name: job.name,
              job_status: job.status,
              job_conclusion: job.conclusion,
              job_started_at: job.started_at,
              job_completed_at: job.completed_at,
              job_duration: job.started_at && job.completed_at 
                ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
                : null,
              runner_name: job.runner_name,
              automation_logs: emailLogs
            }
          })

          return {
            ...run,
            jobs: automationLogs,
            total_jobs: jobs.jobs.length,
            successful_jobs: jobs.jobs.filter((j: GitHubJob) => j.conclusion === 'success').length,
            failed_jobs: jobs.jobs.filter((j: GitHubJob) => j.conclusion === 'failure').length,
            // Extract email metrics from run display title or commit message
            email_metrics: extractEmailMetrics(run.display_title, run.head_commit?.message),
            workflow_duration: run.created_at && run.updated_at 
              ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
              : null
          }
        } catch (error) {
          console.error(`Error fetching jobs for run ${run.id}:`, error)
          return {
            ...run,
            jobs: [],
            total_jobs: 0,
            successful_jobs: 0,
            failed_jobs: 0,
            email_metrics: null,
            workflow_duration: null
          }
        }
      })
    )

    // Calculate summary statistics
    const stats = {
      total_runs: workflowRuns.total_count,
      successful_runs: enrichedRuns.filter(run => run.conclusion === 'success').length,
      failed_runs: enrichedRuns.filter(run => run.conclusion === 'failure').length,
      in_progress_runs: enrichedRuns.filter(run => run.status === 'in_progress').length,
      total_jobs: enrichedRuns.reduce((sum, run) => sum + run.total_jobs, 0),
      avg_duration: enrichedRuns.filter(run => run.workflow_duration).length > 0
        ? enrichedRuns
            .filter(run => run.workflow_duration)
            .reduce((sum, run) => sum + (run.workflow_duration || 0), 0) / 
          enrichedRuns.filter(run => run.workflow_duration).length
        : 0,
      // Email-specific metrics aggregated from all runs
      total_emails_processed: enrichedRuns.reduce((sum, run) => {
        const metrics = run.email_metrics
        return sum + (metrics?.processed || 0)
      }, 0),
      total_emails_sent: enrichedRuns.reduce((sum, run) => {
        const metrics = run.email_metrics
        return sum + (metrics?.sent || 0)
      }, 0),
      total_emails_skipped: enrichedRuns.reduce((sum, run) => {
        const metrics = run.email_metrics
        return sum + (metrics?.skipped || 0)
      }, 0),
      total_errors: enrichedRuns.reduce((sum, run) => {
        const metrics = run.email_metrics
        return sum + (metrics?.errors || 0)
      }, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        runs: enrichedRuns,
        stats,
        pagination: {
          page,
          limit,
          total: workflowRuns.total_count,
          totalPages: Math.ceil(workflowRuns.total_count / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching GitHub workflow logs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch GitHub workflow logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function extractEmailMetrics(displayTitle: string, commitMessage?: string) {
  const text = `${displayTitle} ${commitMessage || ''}`.toLowerCase()
  
  // Try to extract numbers from common patterns
  const processedMatch = text.match(/processed[:\s]*(\d+)/)
  const sentMatch = text.match(/sent[:\s]*(\d+)/)
  const skippedMatch = text.match(/skipped[:\s]*(\d+)/)
  const errorsMatch = text.match(/errors?[:\s]*(\d+)/)
  
  // Also try to find mentions of email operations
  const hasEmailMention = text.includes('email') || text.includes('campaign') || text.includes('automation')
  
  if (!hasEmailMention && !processedMatch && !sentMatch) {
    return null
  }
  
  return {
    processed: processedMatch ? parseInt(processedMatch[1]) : 0,
    sent: sentMatch ? parseInt(sentMatch[1]) : 0,
    skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
    errors: errorsMatch ? parseInt(errorsMatch[1]) : 0
  }
}

function getMockWorkflowRuns(): any[] {
  const now = new Date()
  return [
    {
      id: 17042112010,
      name: "Email Automation Processor",
      display_title: "Email Automation Processor",
      status: "completed",
      conclusion: "success",
      created_at: new Date(now.getTime() - 1800000).toISOString(), // 30 minutes ago
      updated_at: new Date(now.getTime() - 1770000).toISOString(), // 29.5 minutes ago
      head_branch: "main",
      head_sha: "5784fff",
      actor: {
        login: "yassineessabar",
        avatar_url: "https://github.com/yassineessabar.png"
      },
      jobs: [
        {
          job_id: 1,
          job_name: "process-scheduled-emails",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 1795000).toISOString(),
          job_completed_at: new Date(now.getTime() - 1778000).toISOString(),
          job_duration: 17000,
          runner_name: "GitHub Actions",
          automation_logs: [
            {
              step_name: "Process Scheduled Campaign Emails",
              status: "completed",
              conclusion: "success",
              started_at: new Date(now.getTime() - 1790000).toISOString(),
              completed_at: new Date(now.getTime() - 1780000).toISOString(),
              duration: 10000,
              job_name: "process-scheduled-emails"
            }
          ]
        },
        {
          job_id: 2,
          job_name: "process-warmup-scheduler",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 1795000).toISOString(),
          job_completed_at: new Date(now.getTime() - 1786000).toISOString(),
          job_duration: 9000,
          runner_name: "GitHub Actions",
          automation_logs: [
            {
              step_name: "Process Warmup Scheduler",
              status: "completed",
              conclusion: "success",
              started_at: new Date(now.getTime() - 1792000).toISOString(),
              completed_at: new Date(now.getTime() - 1788000).toISOString(),
              duration: 4000,
              job_name: "process-warmup-scheduler"
            }
          ]
        },
        {
          job_id: 3,
          job_name: "process-warmup-execution",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 1795000).toISOString(),
          job_completed_at: new Date(now.getTime() - 1789000).toISOString(),
          job_duration: 6000,
          runner_name: "GitHub Actions",
          automation_logs: [
            {
              step_name: "Process Warmup Execution",
              status: "completed",
              conclusion: "success",
              started_at: new Date(now.getTime() - 1793000).toISOString(),
              completed_at: new Date(now.getTime() - 1791000).toISOString(),
              duration: 2000,
              job_name: "process-warmup-execution"
            }
          ]
        }
      ],
      total_jobs: 3,
      successful_jobs: 3,
      failed_jobs: 0,
      email_metrics: {
        processed: 7,
        sent: 7,
        skipped: 0,
        errors: 0
      },
      workflow_duration: 30000
    },
    {
      id: 17042057659,
      name: "Email Automation Processor",
      display_title: "Email Automation Processor",
      status: "completed",
      conclusion: "success",
      created_at: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
      updated_at: new Date(now.getTime() - 3573000).toISOString(),
      head_branch: "main",
      head_sha: "5902d2f",
      actor: {
        login: "yassineessabar",
        avatar_url: "https://github.com/yassineessabar.png"
      },
      jobs: [
        {
          job_id: 4,
          job_name: "process-scheduled-emails",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 3595000).toISOString(),
          job_completed_at: new Date(now.getTime() - 3575000).toISOString(),
          job_duration: 20000,
          runner_name: "GitHub Actions",
          automation_logs: []
        },
        {
          job_id: 5,
          job_name: "process-warmup-scheduler",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 3595000).toISOString(),
          job_completed_at: new Date(now.getTime() - 3580000).toISOString(),
          job_duration: 15000,
          runner_name: "GitHub Actions",
          automation_logs: []
        },
        {
          job_id: 6,
          job_name: "process-warmup-execution",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 3595000).toISOString(),
          job_completed_at: new Date(now.getTime() - 3585000).toISOString(),
          job_duration: 10000,
          runner_name: "GitHub Actions",
          automation_logs: []
        }
      ],
      total_jobs: 3,
      successful_jobs: 3,
      failed_jobs: 0,
      email_metrics: {
        processed: 5,
        sent: 4,
        skipped: 1,
        errors: 0
      },
      workflow_duration: 27000
    },
    {
      id: 17041976022,
      name: "Email Automation Processor",
      display_title: "Email Automation Processor - System Warmup",
      status: "completed",
      conclusion: "success",
      created_at: new Date(now.getTime() - 7200000).toISOString(), // 2 hours ago
      updated_at: new Date(now.getTime() - 7179000).toISOString(),
      head_branch: "main",
      head_sha: "0278eaa",
      actor: {
        login: "yassineessabar",
        avatar_url: "https://github.com/yassineessabar.png"
      },
      jobs: [
        {
          job_id: 7,
          job_name: "process-warmup-scheduler",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 7195000).toISOString(),
          job_completed_at: new Date(now.getTime() - 7185000).toISOString(),
          job_duration: 10000,
          runner_name: "GitHub Actions",
          automation_logs: []
        },
        {
          job_id: 8,
          job_name: "process-warmup-execution",
          job_status: "completed",
          job_conclusion: "success",
          job_started_at: new Date(now.getTime() - 7195000).toISOString(),
          job_completed_at: new Date(now.getTime() - 7188000).toISOString(),
          job_duration: 7000,
          runner_name: "GitHub Actions",
          automation_logs: []
        }
      ],
      total_jobs: 2,
      successful_jobs: 2,
      failed_jobs: 0,
      email_metrics: null, // Warmup only
      workflow_duration: 21000
    }
  ]
}

function getMockStats(): any {
  return {
    total_runs: 25,
    successful_runs: 23,
    failed_runs: 1,
    in_progress_runs: 1,
    total_jobs: 65,
    avg_duration: 24500,
    total_emails_processed: 89,
    total_emails_sent: 82,
    total_emails_skipped: 5,
    total_errors: 2
  }
}