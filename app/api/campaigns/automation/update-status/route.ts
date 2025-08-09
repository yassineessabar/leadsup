import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// POST - Update email sending status after n8n processes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      campaignId, 
      contactId, 
      sequenceId, 
      status, 
      sentAt, 
      senderAccount,
      errorMessage 
    } = body

    console.log(`📧 Updating email status: ${status} for contact ${contactId} in campaign ${campaignId}`)

    // Update or create contact_sequences record
    const { data: existingRecord } = await supabaseServer
      .from('contact_sequences')
      .select('id')
      .eq('contact_id', contactId)
      .eq('sequence_id', sequenceId)
      .single()

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabaseServer
        .from('contact_sequences')
        .update({
          status: status,
          sent_at: sentAt,
          sender_account: senderAccount,
          error_message: errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('❌ Error updating contact sequence:', updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseServer
        .from('contact_sequences')
        .insert({
          contact_id: contactId,
          sequence_id: sequenceId,
          status: status,
          sent_at: sentAt,
          sender_account: senderAccount,
          error_message: errorMessage || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Error inserting contact sequence:', insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
    }

    // Update campaign statistics
    await updateCampaignStats(campaignId)

    // Schedule next sequence step if this was successful
    if (status === 'sent') {
      await scheduleNextSequenceStep(campaignId, contactId, sequenceId)
    }

    console.log(`✅ Successfully updated status to ${status}`)

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
      data: {
        campaignId,
        contactId,
        sequenceId,
        status,
        sentAt
      }
    })

  } catch (error) {
    console.error('❌ Error in update-status:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update campaign statistics
async function updateCampaignStats(campaignId: string) {
  try {
    // Get stats for this campaign using a proper join
    const { data: stats } = await supabaseServer
      .rpc('get_campaign_sequence_stats', { campaign_uuid: campaignId })

    if (stats) {
      const totalSent = stats.filter(s => s.status === 'sent').length
      const totalFailed = stats.filter(s => s.status === 'failed').length
      const totalPending = stats.filter(s => s.status === 'pending').length

      // Update campaign with latest stats
      await supabaseServer
        .from('campaigns')
        .update({
          emails_sent: totalSent,
          emails_failed: totalFailed,
          emails_pending: totalPending,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
    }
  } catch (error) {
    console.error('❌ Error updating campaign stats:', error)
  }
}

// Helper function to schedule the next sequence step
async function scheduleNextSequenceStep(campaignId: string, contactId: string, currentSequenceId: string) {
  try {
    // Get current sequence info
    const { data: currentSequence } = await supabaseServer
      .from('campaign_sequences')
      .select('sequence_number, sequence_step, timing_days')
      .eq('id', currentSequenceId)
      .single()

    if (!currentSequence) return

    // Find next sequence step
    const { data: nextSequence } = await supabaseServer
      .from('campaign_sequences')
      .select('id, timing_days')
      .eq('campaign_id', campaignId)
      .eq('sequence_number', currentSequence.sequence_number)
      .eq('sequence_step', currentSequence.sequence_step + 1)
      .single()

    if (nextSequence) {
      // Schedule next step
      const scheduledFor = new Date()
      scheduledFor.setDate(scheduledFor.getDate() + (nextSequence.timing_days || 1))

      await supabaseServer
        .from('contact_sequences')
        .insert({
          contact_id: contactId,
          sequence_id: nextSequence.id,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      console.log(`📅 Scheduled next sequence step for contact ${contactId} at ${scheduledFor.toISOString()}`)
    }
  } catch (error) {
    console.error('❌ Error scheduling next sequence step:', error)
  }
}