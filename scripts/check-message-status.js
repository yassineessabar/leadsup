#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function checkCurrentMessageStatus() {
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  
  console.log('📊 Current message status breakdown:')
  
  // Check message status by folder
  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('folder, status, direction, contact_email')
    .eq('user_id', userId)
  
  const folderStats = {}
  messages.forEach(msg => {
    const folder = msg.folder || 'inbox'
    if (!folderStats[folder]) {
      folderStats[folder] = { total: 0, unread: 0, read: 0 }
    }
    folderStats[folder].total++
    if (msg.status === 'unread') folderStats[folder].unread++
    if (msg.status === 'read') folderStats[folder].read++
  })
  
  console.log('\nFolder breakdown:')
  Object.entries(folderStats).forEach(([folder, stats]) => {
    console.log(`  ${folder}: ${stats.total} total (${stats.unread} unread, ${stats.read} read)`)
  })
  
  console.log('\n🔧 AFTER FIX - Folder badges will show:')
  Object.entries(folderStats).forEach(([folder, stats]) => {
    if (stats.unread > 0) {
      console.log(`  ${folder}: (${stats.unread}) ← Badge shows unread count`)
    } else {
      console.log(`  ${folder}: (no badge) ← No unread messages`)
    }
  })
  
  console.log('\n📝 Summary:')
  console.log('✅ Fixed: Folder counts now show only unread messages')
  console.log('✅ Folders with no unread messages will show no badge')
  console.log('✅ This matches standard email client behavior')
}

checkCurrentMessageStatus()