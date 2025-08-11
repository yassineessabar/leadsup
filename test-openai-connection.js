const OpenAI = require('openai');

async function testOpenAIConnection() {
  console.log('🧪 TESTING OPENAI CONNECTION');
  console.log('============================\n');
  
  // Check if API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('💡 Make sure to set OPENAI_API_KEY in your .env.local file');
    return;
  }
  
  console.log('✅ OPENAI_API_KEY found in environment');
  console.log('🔑 Key length:', apiKey.length, 'characters');
  console.log('🔑 Key prefix:', apiKey.substring(0, 7) + '...');
  
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    console.log('\n🤖 Testing OpenAI API call...');
    
    // Make a simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond with just 'API connection successful' and nothing else."
        },
        {
          role: "user", 
          content: "Test connection"
        }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    console.log('✅ OpenAI API call successful!');
    console.log('📝 Response:', response.choices[0].message.content);
    console.log('🏷️ Model used:', response.model);
    console.log('💰 Tokens used:', response.usage?.total_tokens || 'N/A');
    
    console.log('\n🎉 OpenAI integration is working correctly!');
    console.log('💡 Your AI-powered campaign creation will use real ChatGPT generation');
    
  } catch (error) {
    console.log('\n❌ OpenAI API call failed');
    console.log('Error:', error.message);
    
    if (error.status === 401) {
      console.log('💡 This usually means the API key is invalid or expired');
    } else if (error.status === 429) {
      console.log('💡 Rate limit exceeded - too many requests');
    } else if (error.status === 500) {
      console.log('💡 OpenAI server error - try again in a moment');
    }
    
    console.log('\n🔄 The campaign feature will use fallback sample data if OpenAI fails');
  }
}

// Check if we can load the OpenAI package
try {
  testOpenAIConnection();
} catch (error) {
  console.log('❌ Error loading OpenAI package:', error.message);
  console.log('💡 Make sure to run: npm install openai');
}