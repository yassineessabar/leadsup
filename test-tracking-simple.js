// Simple test to verify email tracking functions work
const { addEmailTracking, generateTrackingId } = require('./lib/email-tracking');

async function testTrackingFunctions() {
  console.log('🧪 Testing email tracking functions...');
  
  try {
    // Test generating tracking ID
    const trackingId = generateTrackingId();
    console.log('✅ Generated tracking ID:', trackingId);
    
    // Test adding tracking to HTML content
    const testHtml = `
      <div>
        <p>Hello {{firstName}}!</p>
        <p>Check out our <a href="https://example.com">website</a>!</p>
        <p>Best regards</p>
      </div>
    `;
    
    console.log('\n📧 Original HTML:');
    console.log(testHtml);
    
    const trackedHtml = addEmailTracking(testHtml, { trackingId });
    
    console.log('\n📊 HTML with tracking:');
    console.log(trackedHtml);
    
    // Check if tracking pixel was added
    if (trackedHtml.includes('/api/track/open?id=')) {
      console.log('\n✅ SUCCESS: Tracking pixel found in HTML!');
      const pixelMatch = trackedHtml.match(/\/api\/track\/open\?id=([^"]+)/);
      if (pixelMatch) {
        console.log('📊 Tracking pixel URL:', pixelMatch[0]);
      }
    } else {
      console.log('\n❌ FAILED: No tracking pixel found in HTML!');
    }
    
    // Check if click tracking was added
    if (trackedHtml.includes('/api/track/click?id=')) {
      console.log('✅ SUCCESS: Click tracking found in HTML!');
      const clickMatch = trackedHtml.match(/\/api\/track\/click\?id=([^&]+)&url=([^"]+)/);
      if (clickMatch) {
        console.log('🔗 Click tracking URL:', clickMatch[0]);
      }
    } else {
      console.log('❌ FAILED: No click tracking found in HTML!');
    }
    
  } catch (error) {
    console.error('❌ Error testing tracking functions:', error);
    console.error('This means there\'s an issue with the tracking library!');
  }
}

testTrackingFunctions();