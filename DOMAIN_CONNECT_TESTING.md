# Domain Connect Testing Documentation

## Overview
This document explains how to test and verify the Auto Domain Connect functionality for LeadsUp.

## Current Status
✅ **API Endpoints Working**: The domain connect check endpoints are functional
⚠️ **Auto Setup**: Currently defaults to manual setup for all domains
🔧 **Needs Implementation**: Direct API integrations with registrars

## Test Results Summary

### Tested Domains
- **leadsup.io**: Namecheap (Manual setup required - Namecheap doesn't support Domain Connect)
- **example.com**: Unknown registrar (Manual setup)
- All test domains currently require manual DNS configuration

## How to Test Domain Connect

### 1. Run the Test Suite
```bash
node test-domain-connect.js
```

This will test:
- Domain nameserver detection
- Registrar identification
- Domain Connect API checking
- DNS record application simulation

### 2. Test with Real Domains
```bash
# Test a specific domain
curl -X POST http://localhost:3000/api/domain-connect/check \
  -H "Content-Type: application/json" \
  -d '{"domain": "yourdomain.com"}'
```

### 3. Check Registrar Support
The system can detect these registrars from nameservers:
- **GoDaddy**: `domaincontrol.com`, `godaddy.com`
- **Namecheap**: `registrar-servers.com` (No Domain Connect support)
- **Google Domains**: `googledomains.com`
- **Cloudflare**: `cloudflare.com`
- **AWS Route53**: `awsdns`
- **1&1 IONOS**: `1and1.com`, `ionos.com`

## Implementing Auto Domain Connect

### For Supported Registrars

#### 1. GoDaddy Integration
```javascript
// Required: GoDaddy API credentials
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

// API endpoint
const url = `https://api.godaddy.com/v1/domains/${domain}/records`;

// Headers
const headers = {
  'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
  'Content-Type': 'application/json'
};

// Add DNS records
const records = [
  { type: 'TXT', name: '@', data: 'v=spf1 include:sendgrid.net ~all', ttl: 3600 },
  { type: 'CNAME', name: 's1._domainkey', data: 's1.domainkey.u30435661.wl250.sendgrid.net', ttl: 3600 },
  { type: 'MX', name: 'reply', data: 'mx.sendgrid.net', priority: 10, ttl: 3600 }
];
```

#### 2. Cloudflare Integration
```javascript
// Required: Cloudflare API token
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Get zone ID first
const zonesUrl = `https://api.cloudflare.com/client/v4/zones?name=${domain}`;

// Headers
const headers = {
  'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
  'Content-Type': 'application/json'
};

// Add DNS records to zone
const recordsUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
```

#### 3. AWS Route53 Integration
```javascript
// Required: AWS credentials
const AWS = require('aws-sdk');
const route53 = new AWS.Route53({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Get hosted zone ID
const zones = await route53.listHostedZonesByName({ DNSName: domain }).promise();

// Create record set
const params = {
  HostedZoneId: zoneId,
  ChangeBatch: {
    Changes: [
      {
        Action: 'CREATE',
        ResourceRecordSet: {
          Name: domain,
          Type: 'TXT',
          TTL: 300,
          ResourceRecords: [{ Value: '"v=spf1 include:sendgrid.net ~all"' }]
        }
      }
    ]
  }
};
```

## DNS Records Required

For email functionality, these DNS records need to be configured:

### 1. SPF Record (Email Authorization)
```
Type: TXT
Host: @
Value: v=spf1 include:sendgrid.net ~all
TTL: 3600
```

### 2. DKIM Records (Email Signing)
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u30435661.wl250.sendgrid.net
TTL: 3600

Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u30435661.wl250.sendgrid.net
TTL: 3600
```

### 3. MX Record (Reply Handling)
```
Type: MX
Host: reply
Value: mx.sendgrid.net
Priority: 10
TTL: 3600
```

### 4. DMARC Record (Optional but Recommended)
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io
TTL: 3600
```

## Testing Verification

### 1. Check DNS Propagation
```bash
# Check SPF record
dig TXT yourdomain.com

# Check DKIM record
dig CNAME s1._domainkey.yourdomain.com

# Check MX record
dig MX reply.yourdomain.com
```

### 2. Verify with SendGrid
```bash
curl -X GET "https://api.sendgrid.com/v3/whitelabel/domains" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

## Environment Variables Required

Add these to your `.env` file for full functionality:

```env
# GoDaddy API
GODADDY_API_KEY=your_godaddy_api_key
GODADDY_API_SECRET=your_godaddy_api_secret

# Cloudflare API
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# AWS Route53
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Google Domains (OAuth2)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Security Considerations

1. **API Credentials**: Never expose API credentials in client-side code
2. **Rate Limiting**: Implement rate limiting for domain check endpoints
3. **Validation**: Always validate domain ownership before making DNS changes
4. **Audit Logging**: Log all DNS modification attempts
5. **Error Handling**: Gracefully handle API failures with fallback to manual setup

## Next Steps for Full Implementation

1. **Add OAuth2 Flow**: For registrars that require OAuth (Google Domains)
2. **Implement Webhooks**: For verification callbacks
3. **Add Progress Tracking**: Show DNS propagation status
4. **Create Admin Dashboard**: For monitoring domain setups
5. **Add Retry Logic**: For failed DNS record applications
6. **Implement Caching**: Cache registrar detection results

## Troubleshooting

### Common Issues

1. **"Manual setup required" for all domains**
   - This is the current default behavior
   - Auto setup requires registrar API credentials

2. **Cannot detect registrar**
   - Domain may use custom nameservers
   - Registrar not in detection list

3. **API authentication fails**
   - Check API credentials in environment variables
   - Verify API permissions/scopes

4. **DNS records not propagating**
   - DNS propagation can take up to 48 hours
   - Use shorter TTL values for faster updates

## Support

For questions or issues:
- Email: weleadsup@gmail.com
- Documentation: https://docs.leadsup.io