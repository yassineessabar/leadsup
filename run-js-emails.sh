#!/bin/bash
# Command line scripts to run JavaScript email sending

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-http://localhost:3001}"
USERNAME="${N8N_API_USERNAME:-admin}"
PASSWORD="${N8N_API_PASSWORD:-password}"

echo -e "${BLUE}🚀 JavaScript Email System Commands${NC}"
echo "=================================="

# Function to make authenticated API calls
call_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local body="${3:-}"
    
    local url="${API_BASE}${endpoint}"
    local auth_header="Authorization: Basic $(echo -n ${USERNAME}:${PASSWORD} | base64)"
    
    echo -e "${BLUE}📡 Calling: ${method} ${endpoint}${NC}"
    
    if [ "$method" = "POST" ] && [ -n "$body" ]; then
        curl -s -X "$method" \
             -H "$auth_header" \
             -H "Content-Type: application/json" \
             -d "$body" \
             "$url"
    else
        curl -s -X "$method" \
             -H "$auth_header" \
             -H "Content-Type: application/json" \
             "$url"
    fi
}

# Function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        python3 -m json.tool 2>/dev/null || cat
    fi
}

# 1. Check what campaigns are ready for processing
check_pending() {
    echo -e "${YELLOW}1️⃣ Checking pending campaigns...${NC}"
    
    response=$(call_api "/api/campaigns/automation/process-pending")
    echo "$response" | pretty_json
    
    # Parse response to show summary
    if command -v jq &> /dev/null; then
        campaigns=$(echo "$response" | jq -r '.data | length')
        if [ "$campaigns" -gt 0 ]; then
            contacts=$(echo "$response" | jq -r '.data[0].contacts | length')
            echo -e "${GREEN}✅ Found $campaigns campaigns with $contacts contacts ready${NC}"
        else
            echo -e "${YELLOW}⚠️ No campaigns ready for processing${NC}"
        fi
    fi
    
    echo ""
}

# 2. Send emails via JavaScript API
send_emails() {
    echo -e "${YELLOW}2️⃣ Sending emails via JavaScript API...${NC}"
    
    response=$(call_api "/api/campaigns/automation/send-emails" "POST")
    echo "$response" | pretty_json
    
    # Parse response to show summary
    if command -v jq &> /dev/null; then
        success=$(echo "$response" | jq -r '.success')
        if [ "$success" = "true" ]; then
            sent=$(echo "$response" | jq -r '.sent // 0')
            failed=$(echo "$response" | jq -r '.failed // 0')
            echo -e "${GREEN}✅ JavaScript email sending complete: $sent sent, $failed failed${NC}"
        else
            error=$(echo "$response" | jq -r '.error // "Unknown error"')
            echo -e "${RED}❌ Email sending failed: $error${NC}"
        fi
    fi
    
    echo ""
}

# 3. Compare with n8n webhook
compare_n8n() {
    echo -e "${YELLOW}3️⃣ Comparing with n8n webhook...${NC}"
    
    echo "JavaScript API:"
    send_emails
    
    echo "n8n Webhook:"
    if curl -s -X POST "https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook" > /dev/null; then
        echo -e "${GREEN}✅ n8n webhook accessible${NC}"
    else
        echo -e "${RED}❌ n8n webhook unreachable${NC}"
    fi
    
    echo ""
}

# 4. Test with dummy data (for development)
test_dummy() {
    echo -e "${YELLOW}4️⃣ Testing with dummy data...${NC}"
    
    # This would insert test data and then send emails
    echo "This would:"
    echo "1. Insert test prospects into database"
    echo "2. Create test campaign and sequences"  
    echo "3. Run email sending"
    echo "4. Show results"
    echo ""
}

# 5. Monitor sender statistics
monitor_senders() {
    echo -e "${YELLOW}5️⃣ Monitoring sender statistics...${NC}"
    
    response=$(call_api "/api/campaigns/senders/credentials")
    echo "$response" | pretty_json
    
    echo ""
}

# 6. Full email automation workflow
full_workflow() {
    echo -e "${BLUE}🔄 Running full email automation workflow...${NC}"
    echo ""
    
    check_pending
    send_emails
    monitor_senders
    
    echo -e "${GREEN}🎯 Full workflow complete!${NC}"
}

# Main command parsing
case "${1:-help}" in
    "pending"|"check")
        check_pending
        ;;
    "send"|"emails")
        send_emails
        ;;
    "compare"|"n8n")
        compare_n8n
        ;;
    "test"|"dummy")
        test_dummy
        ;;
    "monitor"|"senders")
        monitor_senders
        ;;
    "full"|"workflow")
        full_workflow
        ;;
    "help"|*)
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  pending, check     - Check campaigns ready for processing"
        echo "  send, emails       - Send emails via JavaScript API"
        echo "  compare, n8n       - Compare JavaScript API vs n8n webhook"
        echo "  test, dummy        - Test with dummy data"
        echo "  monitor, senders   - Monitor sender authentication status"
        echo "  full, workflow     - Run complete email workflow"
        echo "  help               - Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  API_BASE           - API base URL (default: http://localhost:3001)"
        echo "  N8N_API_USERNAME   - API username (default: admin)"
        echo "  N8N_API_PASSWORD   - API password (default: password)"
        echo ""
        echo "Examples:"
        echo "  $0 pending         # Check what's ready to send"
        echo "  $0 send           # Send emails now"
        echo "  $0 full           # Run complete workflow"
        echo ""
        echo "  API_BASE=https://app.leadsup.io $0 send"
        echo ""
        ;;
esac