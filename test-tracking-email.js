// Test script to send an email with tracking via LeadsUp API
// This will test the local tracking system

const fetch = require('node-fetch');

async function sendTestEmailWithTracking() {
  console.log('📧 Testing email tracking system...');
  
  try {
    // Send email via LeadsUp automation API
    const response = await fetch('http://localhost:3000/api/automation/send-single-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your_session_token' // You'd need to get this from browser
      },
      body: JSON.stringify({
        to_email: 'ya.essabarry@gmail.com',
        subject: 'TEST: Tracking Email from LeadsUp',
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🧪 Test Email with Tracking</h2>
            <p>Hi there!</p>
            <p>This is a test email to verify that email tracking is working properly.</p>
            
            <p>Please:</p>
            <ol>
              <li><strong>Open this email</strong> (you're doing it now!)</li>
              <li><strong>Click this link:</strong> <a href="https://google.com">Test Link</a></li>
            </ol>
            
            <p>If tracking is working, you should see:</p>
            <ul>
              <li>A tracking pixel request in browser Network tab</li>
              <li>Link redirects through tracking system</li>
              <li>Real open/click rates in dashboard</li>
            </ul>
            
            <p>Best regards,<br>LeadsUp Tracking Test</p>
          </div>
        `,
        from_email: 'test@yourdomain.com'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test email sent successfully:', result);
      console.log('📊 Check your email and then check the dashboard for tracking data!');
    } else {
      console.error('❌ Failed to send test email:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
    }
    
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

sendTestEmailWithTracking();