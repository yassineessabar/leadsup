async function testAICampaignCreation() {
  console.log('🧪 TESTING AI CAMPAIGN CREATION API');
  console.log('===================================\n');
  
  const testData = {
    campaignName: "Test AI Campaign",
    companyName: "Test Company",
    website: "https://testcompany.com",
    noWebsite: false,
    language: "English",
    keywords: ["test", "ai", "campaigns"],
    mainActivity: "We provide innovative testing solutions for software companies to improve their development process and code quality.",
    location: "Australia",
    industry: "Software Testing",
    productService: "Automated testing tools",
    goals: "Increase market share in Australia"
  };

  try {
    console.log('📤 Sending request to /api/campaigns/create...');
    
    const response = await fetch('http://localhost:3000/api/campaigns/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test won't work without proper authentication
        // This is just to show the expected request format
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Campaign created successfully!');
      console.log('📋 Campaign data:', result.data.campaign);
      console.log('🤖 AI assets generated:');
      console.log('   - ICPs:', result.data.aiAssets.icps?.length || 0);
      console.log('   - Personas:', result.data.aiAssets.personas?.length || 0);
      console.log('   - Pain Points:', result.data.aiAssets.pain_points?.length || 0);
      console.log('   - Value Props:', result.data.aiAssets.value_propositions?.length || 0);
      console.log('   - Email Sequences:', result.data.aiAssets.email_sequences?.length || 0);
    } else {
      console.log('❌ Error creating campaign:', result.error);
      if (result.note) {
        console.log('💡 Note:', result.note);
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    console.log('\n💡 Note: This test requires the development server to be running');
    console.log('   and proper user authentication. The API is designed to work');
    console.log('   gracefully with or without the database migration.');
  }
}

// Show the test data format
console.log('📋 EXPECTED REQUEST FORMAT');
console.log('==========================');
console.log('POST /api/campaigns/create');
console.log('Content-Type: application/json');
console.log('Authentication: Required (user session)');
console.log('\nBody:');
console.log(JSON.stringify({
  campaignName: "String (required)",
  companyName: "String (required)", 
  website: "String (optional)",
  noWebsite: "Boolean (optional)",
  language: "String (default: English)",
  keywords: "String[] (optional)",
  mainActivity: "String (required)",
  location: "String (optional)",
  industry: "String (optional)",
  productService: "String (optional)",
  goals: "String (optional)"
}, null, 2));

console.log('\n📤 EXPECTED RESPONSE FORMAT');
console.log('============================');
console.log(JSON.stringify({
  success: true,
  data: {
    campaign: {
      id: "uuid",
      name: "Campaign Name",
      // ... other campaign fields
    },
    aiAssets: {
      icps: [{ id: 1, title: "ICP Title", description: "..." }],
      personas: [{ id: 1, name: "Persona Name", title: "Job Title", "...": "..." }],
      pain_points: [{ id: 1, title: "Pain Point", description: "..." }],
      value_propositions: [{ id: 1, title: "Value Prop", description: "..." }],
      email_sequences: [{ step: 1, subject: "Subject", content: "Content", timing_days: 0 }]
    }
  }
}, null, 2));

console.log('\n🔧 SETUP INSTRUCTIONS');
console.log('======================');
console.log('1. Run the database migration: database-migration-ai-campaigns.sql');
console.log('2. Set OPENAI_API_KEY environment variable (optional - fallback data used if missing)');
console.log('3. Start the development server: npm run dev');
console.log('4. Test through the UI by creating a campaign');

// Uncomment to actually run the test (requires server and auth)
// testAICampaignCreation();