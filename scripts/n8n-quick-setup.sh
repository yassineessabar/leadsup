#!/bin/bash

# N8N Quick Setup Script for Email Capture

echo "🚀 N8N EMAIL CAPTURE QUICK SETUP"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
echo ""

# Check if N8N is already running
if docker ps | grep -q n8n; then
    echo -e "${YELLOW}⚠️  N8N container already running${NC}"
    echo "Skipping installation..."
    N8N_EXISTS=true
else
    N8N_EXISTS=false
fi

if [ "$N8N_EXISTS" = false ]; then
    echo -e "${BLUE}Step 1: Installing N8N${NC}"
    echo "----------------------"
    
    # Set up N8N credentials
    read -p "Enter N8N admin username (default: admin): " N8N_USER
    N8N_USER=${N8N_USER:-admin}
    
    read -sp "Enter N8N admin password: " N8N_PASS
    echo ""
    
    # Start N8N container
    echo ""
    echo "Starting N8N container..."
    docker run -d \
        --name n8n \
        -p 5678:5678 \
        -v n8n_data:/home/node/.n8n \
        -e N8N_BASIC_AUTH_ACTIVE=true \
        -e N8N_BASIC_AUTH_USER=$N8N_USER \
        -e N8N_BASIC_AUTH_PASSWORD=$N8N_PASS \
        --restart always \
        n8nio/n8n
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ N8N installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install N8N${NC}"
        exit 1
    fi
    
    # Wait for N8N to start
    echo "Waiting for N8N to start..."
    sleep 5
fi

echo ""
echo -e "${BLUE}Step 2: N8N Access Information${NC}"
echo "------------------------------"
echo -e "${GREEN}N8N Dashboard:${NC} http://localhost:5678"

if [ "$N8N_EXISTS" = false ]; then
    echo -e "${GREEN}Username:${NC} $N8N_USER"
    echo -e "${GREEN}Password:${NC} (the one you just entered)"
fi

echo ""
echo -e "${BLUE}Step 3: Import Workflow${NC}"
echo "-----------------------"
echo "1. Open N8N: http://localhost:5678"
echo "2. Create new workflow (click + button)"
echo "3. Click ⋮ menu → Import from File"
echo "4. Use the workflow JSON from: docs/n8n-email-webhook.json"
echo "5. Save and Activate the workflow"
echo ""
read -p "Press Enter after importing the workflow..."

echo ""
echo -e "${BLUE}Step 4: Get Your Webhook URL${NC}"
echo "----------------------------"
echo "Your N8N webhook URL is:"
echo -e "${YELLOW}http://localhost:5678/webhook/email-webhook${NC}"
echo ""
echo "For production, use your server URL:"
echo -e "${YELLOW}https://your-server.com/webhook/email-webhook${NC}"
echo ""

echo -e "${BLUE}Step 5: Test the Webhook${NC}"
echo "------------------------"
echo "Testing N8N webhook..."
echo ""

# Test the webhook
curl -X POST http://localhost:5678/webhook/email-webhook \
    -H "Content-Type: application/json" \
    -d '{
        "from": "test@example.com",
        "to": "essabar.yassine@gmail.com",
        "subject": "N8N Setup Test",
        "text": "This is a test email from N8N setup script"
    }' \
    --silent \
    --output /dev/null \
    --write-out "HTTP Status: %{http_code}\n"

echo ""
echo -e "${BLUE}Step 6: Email Provider Options${NC}"
echo "------------------------------"
echo ""
echo -e "${YELLOW}Option A: Gmail Forwarding (Free)${NC}"
echo "1. Gmail Settings → Forwarding"
echo "2. Add forwarding to a script that POSTs to N8N"
echo ""
echo -e "${YELLOW}Option B: Mailgun (1000 free/month)${NC}"
echo "1. Sign up at mailgun.com"
echo "2. Add route to forward to N8N webhook"
echo ""
echo -e "${YELLOW}Option C: Zapier Email Parser (Free tier)${NC}"
echo "1. Sign up at parser.zapier.com"
echo "2. Forward emails to parser"
echo "3. Set webhook to N8N"
echo ""

echo -e "${GREEN}✅ N8N SETUP COMPLETE!${NC}"
echo "====================="
echo ""
echo "Quick Commands:"
echo "--------------"
echo "View N8N logs:     docker logs n8n"
echo "Stop N8N:          docker stop n8n"
echo "Start N8N:         docker start n8n"
echo "Test webhook:      node scripts/n8n-test-webhook.js"
echo "Monitor emails:    node scripts/monitor-real-response.js"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Configure your email provider to forward to N8N"
echo "2. Test with real emails"
echo "3. Check LeadsUp inbox for captured emails"
echo ""
echo -e "${GREEN}🎉 Your email capture system is ready!${NC}"