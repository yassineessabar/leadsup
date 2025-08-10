import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Check prospect-sender assignments and consistency
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('📧 Checking prospect-sender assignment consistency...')

    // Get all sent emails from prospect_sequence_progress
    const { data: sentEmails, error: emailError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        prospect_id,
        sequence_id,
        sender_email,
        sent_at,
        status,
        prospects!inner(first_name, last_name, email, campaign_id),
        campaign_sequences!inner(step_number, title)
      `)
      .eq('status', 'sent')
      .order('prospect_id')
      .order('sent_at')

    if (emailError) {
      throw new Error(`Failed to fetch sent emails: ${emailError.message}`)
    }

    if (!sentEmails || sentEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sent emails found to analyze',
        analysis: {}
      })
    }

    // Group emails by prospect to check sender consistency
    const prospectAnalysis = {}
    
    for (const email of sentEmails) {
      const prospectId = email.prospect_id
      const prospectEmail = email.prospects.email
      const senderEmail = email.sender_email
      const stepNumber = email.campaign_sequences.step_number
      
      if (!prospectAnalysis[prospectId]) {
        prospectAnalysis[prospectId] = {
          prospect_email: prospectEmail,
          prospect_name: `${email.prospects.first_name} ${email.prospects.last_name}`,
          campaign_id: email.prospects.campaign_id,
          emails_sent: [],
          senders_used: new Set(),
          is_consistent: true,
          primary_sender: null
        }
      }
      
      const analysis = prospectAnalysis[prospectId]
      
      analysis.emails_sent.push({
        sequence_step: stepNumber,
        sequence_title: email.campaign_sequences.title,
        sender_email: senderEmail,
        sent_at: email.sent_at
      })
      
      analysis.senders_used.add(senderEmail)
      
      // Set primary sender as the first sender used
      if (!analysis.primary_sender) {
        analysis.primary_sender = senderEmail
      }
      
      // Check if this email uses a different sender
      if (senderEmail !== analysis.primary_sender) {
        analysis.is_consistent = false
      }
    }

    // Convert Sets to arrays and calculate statistics
    const analysisResults = Object.entries(prospectAnalysis).map(([prospectId, data]) => ({
      prospect_id: prospectId,
      prospect_email: data.prospect_email,
      prospect_name: data.prospect_name,
      campaign_id: data.campaign_id,
      emails_sent: data.emails_sent,
      senders_used: Array.from(data.senders_used),
      sender_count: data.senders_used.size,
      is_consistent: data.is_consistent,
      primary_sender: data.primary_sender,
      consistency_issue: !data.is_consistent ? 'Multiple senders used in sequence' : null
    }))

    // Calculate overall statistics
    const totalProspects = analysisResults.length
    const consistentProspects = analysisResults.filter(p => p.is_consistent).length
    const inconsistentProspects = totalProspects - consistentProspects
    
    const senderDistribution = {}
    analysisResults.forEach(prospect => {
      prospect.senders_used.forEach(sender => {
        senderDistribution[sender] = (senderDistribution[sender] || 0) + 1
      })
    })

    return NextResponse.json({
      success: true,
      analysis_summary: {
        total_prospects_analyzed: totalProspects,
        consistent_prospects: consistentProspects,
        inconsistent_prospects: inconsistentProspects,
        consistency_rate: totalProspects > 0 ? (consistentProspects / totalProspects * 100).toFixed(1) + '%' : 'N/A'
      },
      sender_distribution: senderDistribution,
      prospect_details: analysisResults,
      recommendations: [
        inconsistentProspects === 0 ? 
          '✅ Perfect sender consistency - all prospects have single senders' : 
          `❌ ${inconsistentProspects} prospects have inconsistent senders`,
        inconsistentProspects > 0 ? 
          '🔧 Implement prospect-sender assignment to maintain relationship consistency' : 
          '✅ Current system maintains good sender consistency',
        'Consider adding a prospect_sender_id column to track assigned senders'
      ],
      issue_details: inconsistentProspects > 0 ? {
        problem: 'Prospects are receiving emails from multiple senders',
        impact: 'Breaks relationship building and looks unprofessional',
        solution: 'Assign one sender per prospect for entire sequence'
      } : null
    })

  } catch (error) {
    console.error('❌ Error checking prospect-sender assignments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check prospect-sender assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}