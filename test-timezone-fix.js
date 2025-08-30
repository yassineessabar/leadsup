// Test correct timezone conversion
const timezone = 'Europe/London';
const consistentHour = 12; // Want 12:05 PM London time
const consistentMinute = 5;

const year = 2025;
const month = 8; // August  
const day = 30;

console.log('🔍 Testing CORRECT timezone conversion:');
console.log(`Want: ${consistentHour}:${String(consistentMinute).padStart(2, '0')} in ${timezone}`);

// Check if BST or GMT
const tempDate = new Date(year, month - 1, day);
const timezoneName = new Intl.DateTimeFormat('en', {
  timeZone: timezone,
  timeZoneName: 'short'
}).formatToParts(tempDate).find(p => p.type === 'timeZoneName')?.value;

const offsetHours = (timezoneName === 'BST' || timezoneName === 'GMT+1') ? 1 : 0;
console.log('Timezone name:', timezoneName);
console.log('Offset hours:', offsetHours);

// CORRECT: Add offset to convert FROM local TO UTC
// If it's 12:05 PM London (BST, UTC+1), then UTC should be 11:05 AM
const correctUTC = new Date(Date.UTC(year, month - 1, day, consistentHour + offsetHours, consistentMinute, 0, 0));
console.log('CORRECT UTC (adding offset):', correctUTC.toISOString());

const correctDisplay = correctUTC.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('CORRECT London display:', correctDisplay);

// WRONG: Subtract offset (what we did before)
const wrongUTC = new Date(Date.UTC(year, month - 1, day, consistentHour - offsetHours, consistentMinute, 0, 0));
console.log('WRONG UTC (subtracting offset):', wrongUTC.toISOString());

const wrongDisplay = wrongUTC.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('WRONG London display:', wrongDisplay);