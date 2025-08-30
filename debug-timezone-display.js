// Test timezone display issue
const utcTime = "2025-08-30T02:05:00.000Z";
const timezone = "Europe/London";

console.log('🔍 Testing timezone display:');
console.log('UTC time:', utcTime);
console.log('Target timezone:', timezone);

// Current approach (problematic)
const scheduledDate = new Date(utcTime);
const currentDisplay = scheduledDate.toLocaleString('en-US', { timeZone: timezone });
console.log('Current display (bad):', currentDisplay);

// Correct approach with proper formatting
const correctDisplay = new Date(utcTime).toLocaleString('en-US', { 
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});
console.log('Correct display:', correctDisplay);

// Test all contact times
const contacts = [
  { email: "mouai.tax@gmail.com", utc: "2025-08-30T01:46:00.000Z" },
  { email: "ya.essabarry@gmail.com", utc: "2025-08-30T02:53:00.000Z" },
  { email: "sigmaticinvestments@gmail.com", utc: "2025-08-30T02:05:00.000Z" },
  { email: "crytopianconsulting@gmail.com", utc: "2025-08-30T03:12:00.000Z" }
];

console.log('\n📋 All contact times in Europe/London:');
contacts.forEach(contact => {
  const display = new Date(contact.utc).toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  console.log(`${contact.email}: ${display} (UTC: ${contact.utc})`);
});