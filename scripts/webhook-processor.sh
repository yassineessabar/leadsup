#!/bin/bash
# /usr/local/bin/webhook-processor.sh
# SMTP to HTTP webhook forwarder

# Read email from stdin
EMAIL_CONTENT=$(cat)

# Extract headers and body
FROM=$(echo "$EMAIL_CONTENT" | grep "^From:" | head -1)
TO=$(echo "$EMAIL_CONTENT" | grep "^To:" | head -1) 
SUBJECT=$(echo "$EMAIL_CONTENT" | grep "^Subject:" | head -1)
DATE=$(echo "$EMAIL_CONTENT" | grep "^Date:" | head -1)

# Send to webhook endpoint
curl -X POST "https://yourdomain.com/api/webhooks/smtp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SMTP_WEBHOOK_SECRET" \
  -d "{
    \"from\": \"$FROM\",
    \"to\": \"$TO\",
    \"subject\": \"$SUBJECT\",
    \"date\": \"$DATE\",
    \"raw_email\": \"$(echo "$EMAIL_CONTENT" | base64 -w 0)\"
  }"
