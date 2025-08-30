// Test the warmup days calculation logic
const warmupStarted = '2025-08-25 07:18:10.051779+00';
const now = new Date();

console.log('🔍 Testing warmup days calculation:');
console.log('Now:', now.toISOString());
console.log('Warmup started:', warmupStarted);

const startDate = new Date(warmupStarted);
console.log('Parsed start date:', startDate.toISOString());

const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
console.log('Days since start (raw):', daysSinceStart);

const daysCompleted = Math.min(Math.max(daysSinceStart + 1, 1), 35);
console.log('Days completed (final):', daysCompleted);

// Test the exact logic from the UI
const uiCalculation = (() => {
  const now = new Date();
  const startDate = new Date(warmupStarted);
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(daysSinceStart + 1, 1), 35);
})();

console.log('UI calculation result:', uiCalculation);

// Check timezone offset
console.log('Timezone offset (minutes):', now.getTimezoneOffset());
console.log('Start date timezone offset (minutes):', startDate.getTimezoneOffset());