#!/bin/bash

echo "🧪 Testing Sequence Progression"
echo "==============================="

echo "1. Test API locally:"
curl -sS -X GET 'http://localhost:3001/api/campaigns/automation/process-pending' \
  -u 'admin:password' | jq '.data[0].contacts | length'

echo ""
echo "2. Full API response:"
curl -sS -X GET 'http://localhost:3001/api/campaigns/automation/process-pending' \
  -u 'admin:password' | jq '.'

echo ""
echo "3. Test n8n webhook:"
curl -X POST 'https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook'

echo ""
echo "4. Test production API:"
curl -sS -X GET 'https://app.leadsup.io/api/campaigns/automation/process-pending' \
  -u 'admin:Integral23..' | jq '.'