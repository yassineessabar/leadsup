const fetch = require('node-fetch');

// Function to detect if an email is an autoreply
function isAutoReply(subject, textContent, headers) {
  // Common autoreply patterns in subject
  const autoReplySubjectPatterns = [
    /^auto:/i,
    /^automatic reply/i,
    /^autoreply/i,
    /out of (the )?office/i,
    /away from (my )?desk/i,
    /on vacation/i,
    /on holiday/i,
    /on leave/i,
    /absen(t|ce)/i,
    /away message/i,
    /automated response/i,
    /automatic notification/i,
    /undeliverable/i,
    /delivery status notification/i,
    /mail delivery failed/i,
    /returned mail/i,
    /failure notice/i
  ];

  // Common autoreply patterns in content
  const autoReplyContentPatterns = [
    /i (am |will be )?(currently )?(out of|away from) (the )?office/i,
    /i('m| am) on vacation/i,
    /i('m| am) on holiday/i,
    /i('m| am) currently unavailable/i,
    /thank you for your (email|message).*i (am|will)/i,
    /this is an automated (response|reply|message)/i,
    /auto(-)?generated (email|message|response)/i,
    /i will (be )?(back|return|respond)/i,
    /during my absence/i,
    /currently on leave/i,
    /automatic email reply/i,
    /vacation autoreply/i,
    /absence notification/i
  ];

  // Check headers for autoreply indicators
  const autoReplyHeaders = [
    'X-Autoreply',
    'X-Autorespond',
    'Auto-Submitted',
    'X-Auto-Response-Suppress',
    'Precedence: bulk',
    'Precedence: auto_reply',
    'X-Vacation',
    'X-Away-Message'
  ];

  // Check subject
  if (subject) {
    for (const pattern of autoReplySubjectPatterns) {
      if (pattern.test(subject)) {
        console.log(`🤖 Autoreply detected in subject: "${subject}" matches pattern ${pattern}`);
        return true;
      }
    }
  }

  // Check content
  if (textContent) {
    // Get first 500 characters for checking (autoreplies usually mention it early)
    const contentToCheck = textContent.substring(0, 500);
    for (const pattern of autoReplyContentPatterns) {
      if (pattern.test(contentToCheck)) {
        console.log(`🤖 Autoreply detected in content: matches pattern ${pattern}`);
        return true;
      }
    }
  }

  // Check headers
  if (headers) {
    const headerStr = typeof headers === 'string' ? headers : JSON.stringify(headers);
    for (const header of autoReplyHeaders) {
      if (headerStr.includes(header)) {
        console.log(`🤖 Autoreply detected in headers: found "${header}"`);
        return true;
      }
    }
    
    // Check for specific header values
    if (headerStr.includes('Auto-Submitted: auto-replied') || 
        headerStr.includes('Auto-Submitted: auto-generated')) {
      console.log(`🤖 Autoreply detected: Auto-Submitted header found`);
      return true;
    }
  }

  return false;
}

// Test cases
async function testAutoReplyDetection() {
  console.log('🧪 Testing Auto-Reply Detection');
  console.log('=' .repeat(50));

  const testCases = [
    {
      name: 'Out of Office Reply',
      subject: 'Out of Office: Re: Your product inquiry',
      text: 'Thank you for your email. I am currently out of the office and will return on Monday. I will respond to your message when I return.',
      headers: 'Auto-Submitted: auto-replied',
      expectedResult: true
    },
    {
      name: 'Vacation Auto-Reply',
      subject: 'Automatic reply: John Smith is on vacation',
      text: "I'm on vacation until next week. For urgent matters, please contact support@company.com",
      headers: 'X-Autoreply: yes',
      expectedResult: true
    },
    {
      name: 'Normal Reply',
      subject: 'Re: Your product inquiry',
      text: "Hi! Thanks for reaching out. I'd love to discuss your needs. When would be a good time for a call?",
      headers: '',
      expectedResult: false
    },
    {
      name: 'Away Message',
      subject: 'Away from desk',
      text: 'I am away from my desk right now but will get back to you soon.',
      headers: 'Precedence: auto_reply',
      expectedResult: true
    },
    {
      name: 'Delivery Failure',
      subject: 'Mail delivery failed: returning message to sender',
      text: 'This message was created automatically by mail delivery software.',
      headers: 'Auto-Submitted: auto-generated',
      expectedResult: true
    },
    {
      name: 'Normal business reply mentioning office',
      subject: 'Re: Meeting request',
      text: "I can meet you at our office next Tuesday at 2pm. Looking forward to discussing the project.",
      headers: '',
      expectedResult: false
    },
    {
      name: 'Automated notification',
      subject: 'Automated Response from Support',
      text: 'This is an automated response to confirm we received your request.',
      headers: '',
      expectedResult: true
    }
  ];

  console.log('\n📊 Running test cases:\n');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const isAutoReplyResult = isAutoReply(testCase.subject, testCase.text, testCase.headers);
    const testPassed = isAutoReplyResult === testCase.expectedResult;
    
    console.log(`Test: ${testCase.name}`);
    console.log(`  Subject: "${testCase.subject}"`);
    console.log(`  Expected: ${testCase.expectedResult}, Got: ${isAutoReplyResult}`);
    console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    
    if (testPassed) passed++;
    else failed++;
  }

  console.log('=' .repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('=' .repeat(50));
}

// Test webhook with autoreply
async function testWebhookWithAutoReply() {
  console.log('\n🧪 Testing Webhook with Auto-Reply Email');
  console.log('=' .repeat(50));

  // Simulate an out-of-office auto-reply
  const autoReplyData = new FormData();
  autoReplyData.append('from', 'john.smith@testcompany1.com');
  autoReplyData.append('to', 'info@sigmatic-trading.com');
  autoReplyData.append('subject', 'Out of Office: Re: Introduction - Test Sequence');
  autoReplyData.append('text', 'Thank you for your email. I am currently out of the office with limited access to email. I will return on Monday, September 9th and will respond to your message at that time. For urgent matters, please contact my colleague at colleague@testcompany1.com.');
  autoReplyData.append('html', '');
  autoReplyData.append('headers', 'Auto-Submitted: auto-replied\nX-Auto-Response-Suppress: All\nPrecedence: auto_reply');
  autoReplyData.append('envelope', JSON.stringify({
    from: 'john.smith@testcompany1.com',
    to: ['info@sigmatic-trading.com']
  }));
  autoReplyData.append('spam_score', '0.1');

  try {
    console.log('📤 Sending auto-reply webhook to /api/webhooks/sendgrid...');
    const response = await fetch('http://localhost:3000/api/webhooks/sendgrid', {
      method: 'POST',
      body: autoReplyData
    });

    const result = await response.json();
    console.log('📨 Response:', result);
    console.log('   Status:', response.status);
    
    // Check if contact status was NOT changed to "Replied"
    console.log('\n⚠️  IMPORTANT: Contact should NOT be marked as "Replied" for auto-replies');
    console.log('   This prevents the email sequence from stopping due to automated responses');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Run tests
(async () => {
  await testAutoReplyDetection();
  
  // Wait a moment before testing the webhook
  console.log('\n⏳ Waiting 2 seconds before webhook test...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testWebhookWithAutoReply();
})();