/**
 * Debug script to understand the scheduling calculation
 */

console.log('🕐 Debugging Schedule Calculation...\n');

// Current time
const now = new Date();
console.log('Current UTC time:', now.toISOString());
console.log('Current Sydney time:', now.toLocaleString('en-US', {timeZone: 'Australia/Sydney'}));

// Simulate the hash calculation for contact ID to determine scheduled hour
const contactId = 'test-contact-123'; // Replace with actual contact ID if known
const currentStep = 0; // First email

const contactHash = String(contactId).split('').reduce((hash, char) => {
  return ((hash << 5) - hash) + char.charCodeAt(0)
}, 0);

const seedValue = (contactHash + (currentStep + 1)) % 1000;
const hour = 9 + (seedValue % 8); // 9-16
const minute = (seedValue * 7) % 60;

console.log(`\nScheduling calculation:`);
console.log(`- Contact ID: ${contactId}`);
console.log(`- Hash: ${contactHash}`);
console.log(`- Seed: ${seedValue}`);
console.log(`- Calculated hour: ${hour}`);
console.log(`- Calculated minute: ${minute}`);

// Create a scheduled date for today with the calculated time
const scheduledDate = new Date();
scheduledDate.setHours(hour, minute, 0, 0);

console.log(`\nScheduled time:`);
console.log(`- UTC: ${scheduledDate.toISOString()}`);
console.log(`- Sydney: ${scheduledDate.toLocaleString('en-US', {timeZone: 'Australia/Sydney'})}`);

// Check if it's due
const isDue = scheduledDate <= now;
const minutesDiff = Math.round((now - scheduledDate) / (1000 * 60));

console.log(`\nDue check:`);
console.log(`- Is due: ${isDue ? '✅ YES' : '❌ NO'}`);
console.log(`- Time difference: ${minutesDiff} minutes ${isDue ? 'overdue' : 'remaining'}`);

// Check if today is the correct date
const today = new Date();
today.setHours(0, 0, 0, 0);
const emailDate = new Date(scheduledDate);
emailDate.setHours(0, 0, 0, 0);
const emailDateIsDue = emailDate <= today;

console.log(`- Date check: ${emailDateIsDue ? '✅ DUE' : '❌ NOT DUE'} (${emailDate.toDateString()} vs ${today.toDateString()})`);

console.log(`\n🎯 Final result: ${(!false && scheduledDate <= now && emailDateIsDue) ? '✅ SHOULD PROCESS' : '❌ SHOULD SKIP'}`);

// Test the new timezone-aware comparison
console.log(`\n🌏 Testing timezone-aware comparison with Australia/Sydney:`);
try {
  const contactNow = new Date(now.toLocaleString("en-US", {timeZone: 'Australia/Sydney'}));
  const contactScheduledTime = new Date(scheduledDate.toLocaleString("en-US", {timeZone: 'Australia/Sydney'}));
  
  console.log(`- Contact current time: ${contactNow.toLocaleString()}`);
  console.log(`- Contact scheduled time: ${contactScheduledTime.toLocaleString()}`);
  console.log(`- Is due (timezone-aware): ${contactScheduledTime <= contactNow ? '✅ YES' : '❌ NO'}`);
  
  const tzMinutesDiff = Math.round((contactNow - contactScheduledTime) / (1000 * 60));
  console.log(`- Timezone-aware difference: ${tzMinutesDiff} minutes ${contactScheduledTime <= contactNow ? 'overdue' : 'remaining'}`);
} catch (error) {
  console.log(`- Timezone conversion error: ${error.message}`);
}