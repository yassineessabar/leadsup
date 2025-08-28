// Debug script to check sequence content format
const { createClient } = require('@supabase/supabase-js')

// Use service role to access data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSequenceContent() {
  try {
    console.log('🔍 Checking sequence content format...')
    
    // Get a sample sequence content
    const { data: sequences, error } = await supabase
      .from('campaign_sequences')
      .select('id, subject, content, step_number')
      .limit(3)
    
    if (error) {
      console.error('❌ Error fetching sequences:', error)
      return
    }
    
    console.log(`\n📝 Found ${sequences.length} sequences:`)
    
    sequences.forEach((seq, idx) => {
      console.log(`\n--- Sequence ${idx + 1} (ID: ${seq.id}, Step: ${seq.step_number}) ---`)
      console.log(`Subject: "${seq.subject}"`)
      console.log(`Content raw:`)
      console.log(`"${seq.content}"`)
      console.log(`\nContent with visible line breaks:`)
      console.log(seq.content.replace(/\n/g, '\\n').replace(/\r/g, '\\r'))
      console.log(`\nContent length: ${seq.content.length} characters`)
      console.log(`Contains \\n: ${seq.content.includes('\n')}`)
      console.log(`Contains \\r\\n: ${seq.content.includes('\r\n')}`)
      console.log(`Contains <br>: ${seq.content.includes('<br')}`)
    })
    
  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

debugSequenceContent()