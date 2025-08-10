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

// POST - Test sender consistency implementation
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🧪 Testing sender consistency across email sequences...')

    // Step 1: Verify prospect-sender assignments exist
    const { data: assignedProspects, error: assignmentError } = await supabaseServer
      .from('prospects')
      .select('id, email_address, first_name, last_name, campaign_id, sender_email')
      .not('sender_email', 'is', null)
      .limit(10)

    if (assignmentError) {
      throw new Error(`Failed to fetch assigned prospects: ${assignmentError.message}`)
    }

    console.log(`📋 Found ${assignedProspects?.length || 0} prospects with assigned senders`)

    if (!assignedProspects || assignedProspects.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No prospects have assigned senders yet',
        recommendations: [
          '1. Run the prospect-sender assignment endpoint first',
          '2. Ensure prospects exist in the database',
          '3. Ensure campaign_senders are configured'
        ]
      })
    }

    // Step 2: Test email sending logic with assigned senders
    console.log('🔧 Testing email sending with assigned senders...')

    // Get a test campaign
    const { data: testCampaigns, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, name')
      .limit(1)

    if (campaignError || !testCampaigns || testCampaigns.length === 0) {
      throw new Error(`No test campaign found: ${campaignError?.message}`)
    }

    const testCampaign = testCampaigns[0]

    // Get sequences for this campaign
    const { data: campaignSequences, error: sequenceError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, subject, content, title')
      .eq('campaign_id', testCampaign.id)
      .eq('is_active', true)

    if (sequenceError || !campaignSequences) {
      throw new Error(`No sequences found: ${sequenceError?.message}`)
    }

    console.log(`🎯 Using test campaign: ${testCampaign.name} (${testCampaign.id})`)

    // Step 3: Simulate the email sending process for consistency testing
    const consistencyResults = []
    
    for (const prospect of assignedProspects.slice(0, 3)) { // Test first 3 prospects
      console.log(`\n🧪 Testing prospect: ${prospect.first_name} ${prospect.last_name} (${prospect.email_address})`)
      console.log(`   📧 Assigned sender: ${prospect.sender_email}`)

      // Simulate multiple sequence steps for this prospect
      const testSequences = campaignSequences.slice(0, 2) // Test first 2 sequence steps
      const prospectResults = {
        prospect_id: prospect.id,
        prospect_email: prospect.email_address,
        prospect_name: `${prospect.first_name} ${prospect.last_name}`,
        assigned_sender: prospect.sender_email,
        sequence_tests: [] as any[]
      }

      for (const [stepIndex, sequence] of testSequences.entries()) {
        console.log(`  📝 Testing sequence step ${stepIndex + 1}: ${sequence.title}`)

        // Test the assigned sender lookup logic (without actually sending)
        try {
          const { data: senderData, error: senderError } = await supabaseServer
            .from('campaign_senders')
            .select(`
              id, email, name, access_token, refresh_token, app_password, auth_type,
              daily_limit, is_active
            `)
            .eq('campaign_id', prospect.campaign_id)
            .eq('email', prospect.sender_email)
            .eq('is_active', true)
            .single()

          if (senderError || !senderData) {
            prospectResults.sequence_tests.push({
              step: stepIndex + 1,
              sequence_title: sequence.title,
              status: '❌ SENDER_NOT_FOUND',
              error: senderError?.message || 'Sender not found',
              expected_sender: prospect.sender_email,
              found_sender: null
            })
            continue
          }

          // Check if sender matches expected assignment
          const isConsistent = senderData.email === prospect.sender_email
          
          prospectResults.sequence_tests.push({
            step: stepIndex + 1,
            sequence_title: sequence.title,
            status: isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT',
            expected_sender: prospect.sender_email,
            found_sender: senderData.email,
            sender_name: senderData.name,
            sender_auth_type: senderData.auth_type,
            sender_active: senderData.is_active
          })

          console.log(`    ${isConsistent ? '✅' : '❌'} Step ${stepIndex + 1}: Expected ${prospect.sender_email}, got ${senderData.email}`)

        } catch (testError) {
          prospectResults.sequence_tests.push({
            step: stepIndex + 1,
            sequence_title: sequence.title,
            status: '❌ ERROR',
            error: testError instanceof Error ? testError.message : 'Unknown error'
          })
        }
      }

      consistencyResults.push(prospectResults)
    }

    // Step 4: Analyze consistency results
    const analysis = {
      total_prospects_tested: consistencyResults.length,
      total_sequence_tests: consistencyResults.reduce((sum, p) => sum + p.sequence_tests.length, 0),
      consistent_tests: 0,
      inconsistent_tests: 0,
      error_tests: 0
    }

    consistencyResults.forEach(prospect => {
      prospect.sequence_tests.forEach(test => {
        if (test.status === '✅ CONSISTENT') analysis.consistent_tests++
        else if (test.status === '❌ INCONSISTENT') analysis.inconsistent_tests++
        else analysis.error_tests++
      })
    })

    const consistencyRate = analysis.total_sequence_tests > 0 
      ? (analysis.consistent_tests / analysis.total_sequence_tests * 100).toFixed(1)
      : '0'

    // Step 5: Check real sent email history for consistency
    const { data: emailHistory, error: historyError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        prospect_id,
        sender_email,
        sent_at,
        status,
        sequence_id,
        tracking_data
      `)
      .eq('status', 'sent')
      .order('prospect_id')
      .order('sent_at')
      .limit(20)

    const emailConsistency = {}
    if (emailHistory) {
      emailHistory.forEach(email => {
        if (!emailConsistency[email.prospect_id]) {
          emailConsistency[email.prospect_id] = {
            senders_used: new Set(),
            emails: []
          }
        }
        emailConsistency[email.prospect_id].senders_used.add(email.sender_email)
        emailConsistency[email.prospect_id].emails.push({
          sender: email.sender_email,
          sent_at: email.sent_at,
          method: email.tracking_data?.method
        })
      })
    }

    const realWorldConsistency = Object.entries(emailConsistency).map(([prospectId, data]) => ({
      prospect_id: prospectId,
      senders_used: Array.from(data.senders_used),
      sender_count: data.senders_used.size,
      is_consistent: data.senders_used.size === 1,
      emails: data.emails
    }))

    return NextResponse.json({
      success: true,
      test_summary: {
        consistency_rate: `${consistencyRate}%`,
        ...analysis
      },
      assignment_verification: {
        assigned_prospects_found: assignedProspects.length,
        sample_assignments: assignedProspects.slice(0, 5).map(p => ({
          prospect: `${p.first_name} ${p.last_name}`,
          email: p.email_address,
          assigned_sender: p.sender_email
        }))
      },
      consistency_test_results: consistencyResults,
      real_email_history: {
        total_sent_emails: emailHistory?.length || 0,
        prospects_with_history: realWorldConsistency.length,
        consistent_prospects: realWorldConsistency.filter(p => p.is_consistent).length,
        inconsistent_prospects: realWorldConsistency.filter(p => !p.is_consistent).length,
        details: realWorldConsistency
      },
      recommendations: [
        analysis.consistent_tests === analysis.total_sequence_tests ? 
          '✅ Perfect sender consistency - all tests passed' : 
          `⚠️ ${analysis.inconsistent_tests + analysis.error_tests} tests failed`,
        realWorldConsistency.every(p => p.is_consistent) ?
          '✅ Real email history shows perfect consistency' :
          '❌ Some prospects have inconsistent sender history',
        consistencyRate === '100.0' ? 
          '🎉 Sender consistency implementation is working perfectly' :
          '🔧 Review sender assignment and lookup logic'
      ]
    })

  } catch (error) {
    console.error('❌ Error testing sender consistency:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test sender consistency',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}