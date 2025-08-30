// Test phase calculation with your actual date
const warmupStarted = '2025-08-05 07:18:10.051779+00';
const now = new Date('2025-08-30'); // Today

console.log('🔍 Testing phase calculation:');
console.log('Now:', now.toISOString());
console.log('Warmup started:', warmupStarted);

const startDate = new Date(warmupStarted);
console.log('Parsed start date:', startDate.toISOString());

const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
const daysCompleted = Math.min(Math.max(daysSinceStart + 1, 1), 35);

console.log('Days since start:', daysSinceStart);
console.log('Days completed:', daysCompleted);

// Phase calculation logic
const phase = daysCompleted >= 22 ? 3 : (daysCompleted >= 8 ? 2 : 1);
console.log('Calculated phase:', phase);

console.log('\n📊 Phase boundaries:');
console.log('Phase 1 (Foundation): Days 1-7');
console.log('Phase 2 (Engagement): Days 8-21');  
console.log('Phase 3 (Scale Up): Days 22-35');
console.log(`\n✅ Day ${daysCompleted} = Phase ${phase}`);