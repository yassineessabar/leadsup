// Debug time constraints for automation
console.log('🕐 Debugging Time Constraints...');

function analyzeTimeConstraints() {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();
  const currentDay = now.toLocaleDateString('en', { weekday: 'short' });
  
  console.log(`📅 Current day: ${currentDay}`);
  console.log(`🕐 Current UTC hour: ${currentUTCHour}`);
  console.log(`🕐 Full UTC time: ${now.toISOString()}`);
  
  // Your campaign settings
  const settings = {
    sending_start_time: '08:00 AM', // 8:00 AM
    sending_end_time: '05:00 PM',   // 17:00 (5:00 PM)
    active_days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  };
  
  // Parse sending hours (convert from 12-hour to 24-hour format)
  const startHour = 8;  // 08:00 AM
  const endHour = 17;   // 05:00 PM
  
  console.log(`⚙️ Campaign sending hours: ${startHour}:00 - ${endHour}:00 (local time)`);
  
  // Timezone mappings used by the automation
  const timezoneOffsets = {
    'T1': -5,  // EST (UTC-5)
    'T2': -6,  // CST (UTC-6) 
    'T3': 0,   // GMT (UTC+0)
    'T4': 8    // SGT (UTC+8)
  };
  
  console.log('\n🌍 Time check for each timezone:');
  Object.entries(timezoneOffsets).forEach(([tz, offset]) => {
    const localHour = (currentUTCHour + offset + 24) % 24;
    const isWithinHours = localHour >= startHour && localHour < endHour;
    
    console.log(`  ${tz} (UTC${offset >= 0 ? '+' : ''}${offset}): ${localHour}:00 ${isWithinHours ? '✅' : '❌'}`);
  });
  
  // Check if ANY timezone is within sending hours
  const anyTimezoneActive = Object.values(timezoneOffsets).some(offset => {
    const localHour = (currentUTCHour + offset + 24) % 24;
    return localHour >= startHour && localHour < endHour;
  });
  
  console.log(`\n📊 Result: ${anyTimezoneActive ? '✅' : '❌'} At least one timezone is within sending hours`);
  
  if (!anyTimezoneActive) {
    console.log('\n💡 SOLUTION OPTIONS:');
    console.log('1. ⏰ Wait until business hours (8 AM - 5 PM) in at least one timezone');
    console.log('2. 🔧 Temporarily adjust campaign sending hours for testing:');
    console.log('   - Change start time to earlier (e.g., 12:00 AM)');
    console.log('   - Change end time to later (e.g., 11:59 PM)');
    console.log('3. 🧪 Test during business hours in your timezone');
  }
  
  return anyTimezoneActive;
}

analyzeTimeConstraints();