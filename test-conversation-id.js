#!/usr/bin/env node

/**
 * Simple test for conversation ID generation
 */

function generateConversationId(contactEmail, senderEmail, campaignId) {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  const result = Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  
  console.log('🔍 Conversation ID Generation Test')
  console.log('=====================================')
  console.log(`📧 Contact: ${contactEmail}`)
  console.log(`📧 Sender: ${senderEmail}`)
  console.log(`🏷️  Campaign: ${campaignId}`)
  console.log('')
  console.log('Step-by-step generation:')
  console.log(`1. Participants sorted: ${participants}`)
  console.log(`2. Base string: ${base}`)
  console.log(`3. Base64 encoded: ${Buffer.from(base).toString('base64')}`)
  console.log(`4. Cleaned (alphanumeric): ${Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`)
  console.log(`5. Final (32 chars): ${result}`)
  console.log('')
  console.log('✅ Properties:')
  console.log(`   Length: ${result.length}`)
  console.log(`   Type: ${typeof result}`)
  console.log(`   Contains only: ${/^[a-zA-Z0-9]+$/.test(result) ? 'alphanumeric ✅' : 'invalid chars ❌'}`)
  console.log(`   Deterministic: ${result === generateConversationId(contactEmail, senderEmail, campaignId) ? 'Yes ✅' : 'No ❌'}`)
  
  return result
}

// Test with different scenarios
console.log('🧪 Testing Multiple Scenarios\n')

const tests = [
  {
    name: 'Your Gmail → Test Reply',
    contact: 'essabar.yassine@gmail.com',
    sender: 'test@reply.leadsup.io',
    campaign: '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  },
  {
    name: 'Different Order (should be same)',
    contact: 'test@reply.leadsup.io', // Swapped
    sender: 'essabar.yassine@gmail.com', // Swapped  
    campaign: '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  },
  {
    name: 'No Campaign ID',
    contact: 'essabar.yassine@gmail.com',
    sender: 'test@reply.leadsup.io',
    campaign: null
  },
  {
    name: 'Long Email Addresses',
    contact: 'very.long.email.address.for.testing@extremely-long-domain-name.com',
    sender: 'another.very.long.email@another-extremely-long-domain.io',
    campaign: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  }
]

tests.forEach((test, i) => {
  console.log(`\n${i + 1}. ${test.name}:`)
  console.log('-'.repeat(40))
  const convId = generateConversationId(test.contact, test.sender, test.campaign)
  console.log(`Result: ${convId}`)
})

// Verify deterministic behavior
console.log('\n🔬 Deterministic Test:')
console.log('========================')
const id1 = generateConversationId('a@test.com', 'b@test.com', 'campaign-123')
const id2 = generateConversationId('a@test.com', 'b@test.com', 'campaign-123') 
const id3 = generateConversationId('b@test.com', 'a@test.com', 'campaign-123') // Swapped order

console.log(`ID1: ${id1}`)
console.log(`ID2: ${id2}`) 
console.log(`ID3: ${id3} (swapped order)`)
console.log(`Same result: ${id1 === id2 && id2 === id3 ? '✅ YES' : '❌ NO'}`)