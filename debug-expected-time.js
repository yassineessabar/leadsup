// Test what time should be stored for 11:46 AM London time
const expectedLondonTime = '2025-08-30 11:46:00'; // What user expects to see
const timezone = 'Europe/London';

console.log('🔍 Expected London time:', expectedLondonTime);

// Create a date object representing 11:46 AM in London timezone
// In August, London is BST (UTC+1)
const londonDate = new Date('2025-08-30T11:46:00+01:00'); // Explicitly BST
console.log('What should be stored in UTC:', londonDate.toISOString());

// Test current stored value
const currentStored = '2025-08-30T01:46:00.000Z';
const currentDisplayed = new Date(currentStored).toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Current stored UTC:', currentStored);
console.log('Current displayed London:', currentDisplayed);

// What we want displayed
const whatWeWant = new Date('2025-08-30T10:46:00.000Z').toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('If stored as 10:46 UTC, displays as:', whatWeWant);