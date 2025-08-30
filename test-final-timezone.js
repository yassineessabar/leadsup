// Final test of timezone conversion
const timezone = 'Europe/London';
const consistentHour = 12; // Want 12:05 PM London time
const consistentMinute = 5;

const year = 2025;
const month = 8; // August  
const day = 30;

console.log('🔍 Final timezone test:');
console.log(`Target: ${consistentHour}:${String(consistentMinute).padStart(2, '0')} PM in ${timezone}`);

// Check timezone
const tempDate = new Date(year, month - 1, day);
const timezoneName = new Intl.DateTimeFormat('en', {
  timeZone: timezone,
  timeZoneName: 'short'
}).formatToParts(tempDate).find(p => p.type === 'timeZoneName')?.value;

const offsetHours = (timezoneName === 'BST' || timezoneName === 'GMT+1') ? 1 : 0;
console.log('Timezone:', timezoneName, '(offset:', offsetHours, 'hours)');

// Convert London time to UTC: subtract offset
const utcTime = new Date(Date.UTC(year, month - 1, day, consistentHour - offsetHours, consistentMinute, 0, 0));
console.log('Stored UTC:', utcTime.toISOString());

// Verify what this displays back in London
const displayInLondon = utcTime.toLocaleString('en-US', { 
  timeZone: timezone,
  hour12: true,
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Displays in London:', displayInLondon);

// Check if this is business hours (9 AM - 5 PM)
const hour24 = parseInt(displayInLondon.split(':')[0]) + (displayInLondon.includes('PM') && !displayInLondon.startsWith('12') ? 12 : 0);
const isBusinessHours = hour24 >= 9 && hour24 <= 17;
console.log('Is business hours?', isBusinessHours ? '✅ YES' : '❌ NO', `(${hour24}:xx)`);