#!/usr/bin/env node

/**
 * Gmail Pub/Sub Webhook Setup
 * 
 * This script helps you configure Gmail Pub/Sub webhooks for real-time email capture.
 */

const fs = require('fs')
const path = require('path')

async function setupGmailPubSub() {
  console.log('📧 GMAIL PUB/SUB WEBHOOK SETUP')
  console.log('==============================\n')

  console.log('🔧 Step 1: Google Cloud Platform Setup')
  console.log('=====================================')
  console.log('')
  console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/')
  console.log('2. Create a new project or select existing one')
  console.log('3. Enable Gmail API:')
  console.log('   - Go to APIs & Services > Library')
  console.log('   - Search for "Gmail API"')
  console.log('   - Click "Enable"')
  console.log('')
  console.log('4. Enable Pub/Sub API:')
  console.log('   - Search for "Cloud Pub/Sub API"')
  console.log('   - Click "Enable"')
  console.log('')

  console.log('🔑 Step 2: Service Account Setup')
  console.log('================================')
  console.log('')
  console.log('1. Go to APIs & Services > Credentials')
  console.log('2. Click "Create Credentials" > "Service Account"')
  console.log('3. Fill in details:')
  console.log('   - Name: "leadsup-gmail-webhook"')
  console.log('   - Description: "LeadsUp Gmail webhook service"')
  console.log('4. Grant roles:')
  console.log('   - Pub/Sub Editor')
  console.log('   - Gmail API access')
  console.log('5. Create and download JSON key file')
  console.log('')

  console.log('📨 Step 3: Pub/Sub Topic Creation')
  console.log('==================================')
  console.log('')
  
  // Create the Google Cloud setup commands
  const setupCommands = `
# Install Google Cloud SDK if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create Pub/Sub topic for Gmail webhooks
gcloud pubsub topics create gmail-webhook-topic

# Create subscription for processing messages
gcloud pubsub subscriptions create gmail-webhook-subscription --topic=gmail-webhook-topic

# Set up push subscription to your webhook endpoint
gcloud pubsub subscriptions modify-push-config gmail-webhook-subscription \\
  --push-endpoint="https://yourdomain.com/api/webhooks/gmail"

# Grant Gmail service permission to publish to your topic
gcloud pubsub topics add-iam-policy-binding gmail-webhook-topic \\
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \\
  --role="roles/pubsub.publisher"
`

  console.log('Run these commands in your terminal:')
  console.log(setupCommands)
  
  console.log('🔐 Step 4: Environment Variables')
  console.log('================================')
  console.log('')
  console.log('Add these to your .env.local file:')
  console.log('')
  
  const envVars = `
# Gmail Pub/Sub Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_TOPIC_NAME=gmail-webhook-topic
GOOGLE_CLOUD_SUBSCRIPTION_NAME=gmail-webhook-subscription
GOOGLE_APPLICATION_CREDENTIALS=./config/service-account-key.json

# Gmail API Configuration
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# Webhook Security
GMAIL_WEBHOOK_SECRET=your-secure-random-string
WEBHOOK_DOMAIN=https://yourdomain.com
`

  console.log(envVars)
  
  console.log('📧 Step 5: Gmail Watch Setup')
  console.log('============================')
  console.log('')
  console.log('You need to set up Gmail "watch" for each email account:')
  console.log('')
  
  const watchSetup = `
# Gmail Watch API Call (run this for each email account)
POST https://gmail.googleapis.com/gmail/v1/users/me/watch
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "topicName": "projects/your-project-id/topics/gmail-webhook-topic",
  "labelIds": ["INBOX"],
  "labelFilterAction": "include"
}
`

  console.log(watchSetup)
  
  // Create service account template
  const serviceAccountTemplate = {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "your-private-key-id", 
    "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
    "client_email": "leadsup-gmail-webhook@your-project.iam.gserviceaccount.com",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/leadsup-gmail-webhook%40your-project.iam.gserviceaccount.com"
  }
  
  // Create config directory if it doesn't exist
  const configDir = path.join(process.cwd(), 'config')
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir)
  }
  
  // Write service account template
  fs.writeFileSync(
    path.join(configDir, 'service-account-key.template.json'),
    JSON.stringify(serviceAccountTemplate, null, 2)
  )
  
  console.log('✅ Created config/service-account-key.template.json')
  console.log('   Replace with your actual service account key file')
  console.log('')
  
  console.log('🧪 Step 6: Testing the Setup')
  console.log('============================')
  console.log('')
  console.log('1. Start your development server:')
  console.log('   npm run dev')
  console.log('')
  console.log('2. Use ngrok to expose your localhost:')
  console.log('   ngrok http 3000')
  console.log('   Update WEBHOOK_DOMAIN with the ngrok URL')
  console.log('')
  console.log('3. Test the webhook endpoint:')
  console.log('   curl https://your-ngrok-url.ngrok.io/api/webhooks/gmail')
  console.log('')
  console.log('4. Send a test email to your Gmail account')
  console.log('5. Check if the webhook receives the notification')
  console.log('')
  
  console.log('📋 Next Steps')
  console.log('=============')
  console.log('1. ✅ Complete Google Cloud setup')
  console.log('2. ✅ Configure environment variables') 
  console.log('3. ✅ Set up Gmail watch for your email')
  console.log('4. ✅ Test with real emails')
  console.log('5. ✅ Monitor webhook logs')
  console.log('')
  console.log('📖 Documentation:')
  console.log('- Gmail Push Notifications: https://developers.google.com/gmail/api/guides/push')
  console.log('- Cloud Pub/Sub: https://cloud.google.com/pubsub/docs/')
  console.log('')
}

// Run the setup guide
setupGmailPubSub().then(() => {
  console.log('✅ Gmail Pub/Sub setup guide complete')
  console.log('📧 Run: node scripts/setup-smtp-webhook.js for SMTP alternative')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})