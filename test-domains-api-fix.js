require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDomainsAPIFix() {
  console.log('🔧 Testing Domains API Authentication Issue');
  console.log('==========================================\n');

  // Step 1: Check if there are any active sessions
  console.log('📋 Step 1: Checking active sessions...');
  
  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select('*')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('❌ Error checking sessions:', error);
    return;
  }

  if (sessions && sessions.length > 0) {
    const latestSession = sessions[0];
    console.log(`✅ Found active session for user: ${latestSession.user_id}`);
    console.log(`   Session token: ${latestSession.session_token}`);
    console.log(`   Expires: ${new Date(latestSession.expires_at).toLocaleString()}`);

    // Step 2: Test API call with session cookie
    console.log('\n🔍 Step 2: Testing API call with session cookie...');

    try {
      const response = await fetch('http://localhost:3000/api/domains', {
        headers: {
          'Cookie': `session=${latestSession.session_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log(`📡 API Response: ${response.status}`);
      console.log(`📊 Data:`, data);

      if (response.ok) {
        console.log(`✅ API call successful with session cookie!`);
        console.log(`   Found ${data.domains?.length || 0} domains`);
      } else {
        console.log(`❌ API call failed even with session cookie`);
      }

    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
      console.log('ℹ️  The development server might not be running. Try: npm run dev');
    }

  } else {
    console.log('⚠️  No active sessions found');

    // Step 3: Create a test session
    console.log('\n📝 Step 3: Creating test session...');

    // Get a user ID from existing domains
    const { data: domains } = await supabase
      .from('domains')
      .select('user_id')
      .limit(1);

    if (domains && domains.length > 0) {
      const userId = domains[0].user_id;
      const sessionToken = `session_${userId}_${Date.now()}`;

      const { data: newSession, error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Failed to create session:', sessionError);
      } else {
        console.log(`✅ Created test session: ${sessionToken}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   You can use this session token in your browser cookies`);
      }
    }
  }

  // Step 4: Suggest solutions
  console.log('\n💡 Solutions to fix the domains loading issue:');
  console.log('   1. Set session cookie in browser:');
  console.log('      - Open browser dev tools → Application → Cookies');
  console.log('      - Add cookie: name="session", value="[session_token_from_above]"');
  console.log('   2. Or temporarily bypass auth in the API (for development)');
  console.log('   3. Or implement proper login/authentication flow');

  console.log('\n🎯 The issue is that the frontend needs a valid session cookie');
  console.log('   to authenticate API requests to load domains.');
}

testDomainsAPIFix().catch(console.error);