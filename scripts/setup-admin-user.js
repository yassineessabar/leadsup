// Setup admin user script
const { createClient } = require('@supabase/supabase-js');

async function setupAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Make sure you have:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get admin email from command line argument
  const adminEmail = process.argv[2];
  
  if (!adminEmail) {
    console.error('❌ Please provide admin email as argument');
    console.log('Usage: node scripts/setup-admin-user.js admin@example.com');
    return;
  }

  try {
    // First, check if the migration tables exist
    console.log('🔍 Checking database schema...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['automation_logs']);

    if (tablesError || !tables || tables.length === 0) {
      console.log('⚠️  Admin tables not found. Please run the migration first:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the migration from: supabase/migrations/20250824_create_admin_tables.sql');
      return;
    }

    // Find the user
    console.log(`🔍 Looking for user: ${adminEmail}`);
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }

    const user = users.users.find(u => u.email === adminEmail);
    if (!user) {
      console.error(`❌ User with email ${adminEmail} not found`);
      console.log('Available users:', users.users.map(u => u.email));
      return;
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError);
      return;
    }

    // Create or update profile with admin flag
    if (!profile) {
      console.log('📝 Creating profile...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          is_admin: true
        });
      
      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return;
      }
    } else {
      console.log('📝 Updating profile...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return;
      }
    }

    console.log('✅ Admin user setup complete!');
    console.log(`👤 Admin user: ${adminEmail}`);
    console.log(`🔑 User ID: ${user.id}`);
    console.log('🌐 You can now access the admin panel at: /admin');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupAdminUser();