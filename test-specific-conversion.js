// Test the specific time conversion issue
const utcStored = "2025-08-30T02:05:00.000Z";
const timezone = "Europe/London";

console.log('🔍 Specific conversion test:');
console.log('Stored UTC:', utcStored);

// What API shows (correct)
const apiResult = new Date(utcStored).toLocaleString('en-US', { timeZone: timezone });
console.log('API displays:', apiResult); // Should be 3:05 AM

// What would show 12:05 PM in London?
// If UI shows 12:05 PM, then either:
// 1. The UI is incorrectly interpreting the time
// 2. The UTC time should be different

// Test: What UTC time would give 12:05 PM London?
const testTimes = [
  '2025-08-30T11:05:00.000Z', // 12:05 PM BST
  '2025-08-30T12:05:00.000Z', // 1:05 PM BST  
  '2025-08-30T23:05:00.000Z', // 12:05 AM next day BST
];

testTimes.forEach(utc => {
  const display = new Date(utc).toLocaleString('en-US', { 
    timeZone: timezone,
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });
  console.log(`${utc} -> ${display} London`);
});

// Test problematic double conversion
const badConversion = new Date(new Date(utcStored).toLocaleString("en-US", {timeZone: timezone}));
console.log('Bad double conversion result:', badConversion.toISOString());
console.log('Bad conversion displays as:', badConversion.toLocaleString('en-US', { timeZone: timezone }));