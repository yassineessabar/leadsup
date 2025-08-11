#!/bin/bash

# SendGrid Quick Setup Script
# This script helps you quickly set up SendGrid Inbound Parse

echo "🚀 SENDGRID QUICK SETUP"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Prerequisites Check${NC}"
echo "----------------------------"
echo "✓ SendGrid account (https://signup.sendgrid.com)"
echo "✓ Domain name you control"
echo "✓ Access to DNS settings"
echo ""

read -p "Do you have all prerequisites? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete prerequisites first."
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Enter Your Information${NC}"
echo "-------------------------------"
read -p "Enter your domain (e.g., example.com): " DOMAIN
read -p "Enter subdomain for email replies (e.g., reply): " SUBDOMAIN
read -p "Enter your app URL (e.g., https://myapp.vercel.app): " APP_URL

FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"
WEBHOOK_URL="${APP_URL}/api/webhooks/sendgrid"

echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "----------------------"
echo "📧 Email Domain: ${FULL_DOMAIN}"
echo "🔗 Webhook URL: ${WEBHOOK_URL}"
echo "📨 Emails to: anything@${FULL_DOMAIN}"
echo ""

echo -e "${BLUE}Step 3: DNS Configuration${NC}"
echo "-------------------------"
echo "Add this MX record to your DNS:"
echo ""
echo -e "${YELLOW}Type: MX${NC}"
echo -e "${YELLOW}Host: ${SUBDOMAIN}${NC}"
echo -e "${YELLOW}Priority: 10${NC}"
echo -e "${YELLOW}Value: mx.sendgrid.net${NC}"
echo ""
echo "Press Enter after adding DNS records..."
read

echo ""
echo -e "${BLUE}Step 4: SendGrid Configuration${NC}"
echo "------------------------------"
echo "1. Log into SendGrid: https://app.sendgrid.com"
echo "2. Go to Settings → Inbound Parse"
echo "3. Click 'Add Host & URL'"
echo "4. Enter these values:"
echo ""
echo -e "${YELLOW}Subdomain: ${SUBDOMAIN}${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}Destination URL: ${WEBHOOK_URL}${NC}"
echo ""
echo "5. Check these options:"
echo "   ✓ POST the raw, full MIME message"
echo "   ✓ Check incoming emails for spam"
echo ""
echo "Press Enter after configuring SendGrid..."
read

echo ""
echo -e "${BLUE}Step 5: Environment Variables${NC}"
echo "-----------------------------"
echo "Add these to your .env.local:"
echo ""
echo -e "${YELLOW}# SendGrid Configuration"
echo "SENDGRID_PARSE_DOMAIN=${FULL_DOMAIN}"
echo "WEBHOOK_DOMAIN=${APP_URL}${NC}"
echo ""

echo -e "${BLUE}Step 6: Test Your Setup${NC}"
echo "-----------------------"
echo ""
echo "Testing DNS..."
dig +short MX ${FULL_DOMAIN}
echo ""

echo "To test the complete flow:"
echo "1. Send an email to: test@${FULL_DOMAIN}"
echo "2. Run: node scripts/monitor-real-response.js"
echo "3. Check your LeadsUp inbox"
echo ""

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=================="
echo ""
echo "Quick Test Commands:"
echo "--------------------"
echo "# Check DNS:"
echo "dig MX ${FULL_DOMAIN}"
echo ""
echo "# Test webhook:"
echo "curl -X GET ${WEBHOOK_URL}"
echo ""
echo "# Monitor emails:"
echo "node scripts/monitor-real-response.js"
echo ""
echo "📧 Send test email to: test@${FULL_DOMAIN}"
echo ""