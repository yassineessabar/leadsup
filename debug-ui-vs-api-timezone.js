// Debug UI vs API timezone mismatch
const utcTime = "2025-08-30T02:05:00.000Z";
const timezone = "Europe/London";

console.log('🔍 UI vs API timezone mismatch:');
console.log('UTC stored:', utcTime);
console.log('Timezone:', timezone);

// Current API approach
const apiDisplay = new Date(utcTime).toLocaleString('en-US', { timeZone: timezone });
console.log('API shows:', apiDisplay);

// What should 12:05 PM London time be in UTC?
// London in August = BST (UTC+1)
const expectedUTC_12pm = new Date('2025-08-30T11:05:00.000Z'); // 12:05 PM BST = 11:05 UTC
const expectedDisplay = expectedUTC_12pm.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true 
});
console.log('For 12:05 PM London, UTC should be:', expectedUTC_12pm.toISOString());
console.log('That would display as:', expectedDisplay);

// What if the UI is interpreting the time wrong?
// Maybe the UI is treating the stored time as local time instead of UTC?
const ifUITreatsAsLocal = new Date('2025-08-30T02:05:00'); // No Z suffix
console.log('If UI treats as local time (no Z):', ifUITreatsAsLocal.toISOString());

// Test current time to verify Europe/London timezone
const now = new Date();
const londonNow = now.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Current time in London:', londonNow);