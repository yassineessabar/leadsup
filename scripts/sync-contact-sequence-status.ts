#!/usr/bin/env node

/**
 * Sync sequence status from prospects table to contacts table
 * This ensures the contact analytics display correctly
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncSequenceStatus() {
  console.log('🔄 Starting sequence status sync...')

  try {
    // Get all prospects with their sequence progress
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select(`
        id,
        email_address,
        campaign_id,
        created_at
      `)

    if (prospectsError) {
      console.error('Error fetching prospects:', prospectsError)
      return
    }

    console.log(`📊 Found ${prospects?.length || 0} prospects`)

    for (const prospect of prospects || []) {
      // Get sequence progress for this prospect
      const { data: progress, error: progressError } = await supabase
        .from('prospect_sequence_progress')
        .select('*')
        .eq('prospect_id', prospect.id)
        .eq('status', 'sent')

      if (progressError) {
        console.error(`Error fetching progress for ${prospect.email_address}:`, progressError)
        continue
      }

      const sentCount = progress?.length || 0
      
      if (sentCount > 0) {
        // Update the corresponding contact in contacts table
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            sequence_step: sentCount,
            updated_at: new Date().toISOString()
          })
          .eq('email', prospect.email_address)
          .eq('campaign_id', prospect.campaign_id)

        if (updateError) {
          console.error(`Error updating contact ${prospect.email_address}:`, updateError)
        } else {
          console.log(`✅ Updated ${prospect.email_address} to step ${sentCount}`)
        }
      }
    }

    console.log('✨ Sync complete!')
    
  } catch (error) {
    console.error('Fatal error:', error)
  }
}

// Run the sync
syncSequenceStatus()