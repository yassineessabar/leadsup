// Test the fixed timezone conversion
const timezone = 'Europe/London';
const consistentHour = 12; // Want 12:05 PM
const consistentMinute = 5;

// Simulate the fixed logic for August 30, 2025
const year = 2025;
const month = 8; // August
const day = 30;

console.log('🔍 Testing fixed timezone conversion:');
console.log(`Want: ${consistentHour}:${String(consistentMinute).padStart(2, '0')} in ${timezone}`);

// Determine if BST or GMT
const tempDate = new Date(year, month - 1, day);
const timezoneName = new Intl.DateTimeFormat('en', {
  timeZone: timezone,
  timeZoneName: 'short'
}).formatToParts(tempDate).find(p => p.type === 'timeZoneName')?.value;

const offsetHours = (timezoneName === 'BST' || timezoneName === 'GMT+1') ? 1 : 0;
console.log('Timezone name:', timezoneName);
console.log('Offset hours:', offsetHours);

// Create UTC time by subtracting the timezone offset
const scheduledDate = new Date(Date.UTC(year, month - 1, day, consistentHour - offsetHours, consistentMinute, 0, 0));
console.log('Generated UTC:', scheduledDate.toISOString());

// Test what this displays in Europe/London
const displayInLondon = scheduledDate.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Displays in London as:', displayInLondon);

// Test with current problematic times
const currentProblematicUTC = '2025-08-30T02:05:00.000Z';
const currentDisplay = new Date(currentProblematicUTC).toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('\nCurrent problematic:');
console.log('UTC:', currentProblematicUTC);
console.log('London display:', currentDisplay);