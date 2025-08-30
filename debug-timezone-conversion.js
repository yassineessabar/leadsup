// Test timezone conversion issue
const nextDueDate = "2025-08-30T01:46:00.000Z"; // Example from your data
const timezone = "Europe/London";

console.log('🔍 Testing timezone conversion:');
console.log('Original nextDueDate (UTC):', nextDueDate);
console.log('Target timezone:', timezone);

// Current problematic approach
const scheduledDate = new Date(nextDueDate);
console.log('scheduledDate object:', scheduledDate.toISOString());

// The problematic conversion
const badConversion = new Date(scheduledDate.toLocaleString("en-US", { timeZone: timezone }));
console.log('Bad conversion result:', badConversion.toISOString());
console.log('Bad display:', scheduledDate.toLocaleString('en-US', { timeZone: timezone }));

// Correct approach
const correctDisplay = new Date(nextDueDate).toLocaleString('en-US', { 
  timeZone: timezone,
  month: '2-digit',
  day: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});
console.log('Correct display:', correctDisplay);

// Also test with 12-hour format
const correctDisplay12h = new Date(nextDueDate).toLocaleString('en-US', { 
  timeZone: timezone,
  month: '2-digit',
  day: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});
console.log('Correct display (12h):', correctDisplay12h);