// Verify the timezone conversion issue
const utcTime = "2025-08-30T11:37:00.000Z";
const timezone = "Europe/London";

console.log('🔍 Verifying timezone conversion:');
console.log('UTC time:', utcTime);
console.log('Target timezone:', timezone);

// Correct conversion
const correctDisplay = new Date(utcTime).toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('CORRECT display:', correctDisplay); // Should be 12:37 PM

// What would cause 9:37 PM display?
// Maybe the UI is doing some wrong calculation

// Test various wrong approaches that might result in 9:37 PM
console.log('\n🚨 Testing wrong approaches:');

// Wrong 1: Adding timezone offset instead of letting toLocaleString handle it
const wrong1 = new Date(new Date(utcTime).getTime() + (1 * 60 * 60 * 1000)); // Add 1 hour
console.log('Wrong 1 (adding offset):', wrong1.toLocaleString('en-US', { timeZone: timezone, hour12: true }));

// Wrong 2: Double conversion
const wrong2 = new Date(new Date(utcTime).toLocaleString("en-US", {timeZone: timezone}));
console.log('Wrong 2 (double conversion):', wrong2.toLocaleString('en-US', { timeZone: timezone, hour12: true }));

// Wrong 3: Treating as local time
const wrong3 = new Date(utcTime.replace('Z', '')); // Remove Z
console.log('Wrong 3 (no Z suffix):', wrong3.toLocaleString('en-US', { timeZone: timezone, hour12: true }));