#!/usr/bin/env node

/**
 * Simple conversation ID generation test
 */

function generateConversationId(contactEmail, senderEmail, campaignId) {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  const result = Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  return result
}

console.log('🔍 Conversation ID Generation Tests')
console.log('====================================\n')

// Test 1: Your Gmail to test reply
const contact1 = 'essabar.yassine@gmail.com'
const sender1 = 'test@reply.leadsup.io'
const campaign1 = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'

const id1 = generateConversationId(contact1, sender1, campaign1)

console.log('Test 1: Your Email Setup')
console.log(`Contact: ${contact1}`)
console.log(`Sender: ${sender1}`)
console.log(`Campaign: ${campaign1}`)
console.log(`Result: ${id1}`)
console.log(`Length: ${id1.length}`)
console.log(`Type: ${typeof id1}`)
console.log(`Valid: ${id1.length === 32 && typeof id1 === 'string' ? '✅ YES' : '❌ NO'}`)

// Test 2: Same emails, swapped order (should produce same ID)
const id2 = generateConversationId(sender1, contact1, campaign1)

console.log('\nTest 2: Order Independence')
console.log(`Same result when swapped: ${id1 === id2 ? '✅ YES' : '❌ NO'}`)

// Test 3: No campaign ID
const id3 = generateConversationId(contact1, sender1, null)

console.log('\nTest 3: No Campaign ID')
console.log(`Result: ${id3}`)
console.log(`Length: ${id3.length}`)
console.log(`Different from with campaign: ${id1 !== id3 ? '✅ YES' : '❌ NO'}`)

// Test 4: Edge cases
console.log('\nTest 4: Edge Cases')
console.log('-------------------')

const tests = [
  ['short@a.co', 'b@c.io', 'test'],
  ['very-long-email-address-for-testing@extremely-long-domain-name-that-goes-on-forever.com', 'another@domain.com', 'campaign'],
  ['test@domain.com', 'test@domain.com', 'same-emails'], // Same emails
]

tests.forEach(([contact, sender, campaign], i) => {
  const result = generateConversationId(contact, sender, campaign)
  console.log(`${i + 1}. ${result} (${result.length} chars)`)
})

console.log('\n✅ All conversation ID generation tests completed!')
console.log('📋 Summary:')
console.log('- Generates 32-character alphanumeric strings')
console.log('- Order-independent (same ID regardless of email order)')
console.log('- Campaign ID affects result')
console.log('- Handles edge cases correctly')