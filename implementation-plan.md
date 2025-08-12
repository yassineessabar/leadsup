# Domain Management Implementation Plan

## Phase 1: Backend API Foundation (Week 1)

### Database Schema
```sql
-- Domains table
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  domain VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255), -- e.g., 'reply' for reply.client.com
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed
  verification_type VARCHAR(50) DEFAULT 'manual', -- manual, cloudflare, godaddy
  dns_provider VARCHAR(100),
  
  -- DNS Configuration
  spf_record TEXT,
  dkim_record TEXT,
  mx_record TEXT,
  verification_token VARCHAR(255),
  
  -- Statistics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_rejected INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  
  -- Metadata
  is_test_domain BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  last_checked_at TIMESTAMP,
  
  UNIQUE(domain, user_id)
);

-- Domain verification logs
CREATE TABLE domain_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  verification_type VARCHAR(50),
  status VARCHAR(50), -- success, failed, pending
  error_message TEXT,
  dns_records_checked JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campaign senders (extend existing)
ALTER TABLE campaign_senders 
ADD COLUMN domain_id UUID REFERENCES domains(id),
ADD COLUMN sender_domain VARCHAR(255);
```

### API Endpoints Structure
```
/api/domains/
├── GET     /              # List user domains
├── POST    /              # Add new domain
├── GET     /:id           # Get domain details
├── PUT     /:id           # Update domain
├── DELETE  /:id           # Remove domain
├── POST    /:id/verify    # Manual verification
├── POST    /:id/auto-setup # Automated DNS setup
└── GET     /:id/dns-check # Check DNS propagation
```

## Phase 2: Manual DNS Setup Flow (Week 2)

### DNS Setup Wizard Component
```typescript
// components/dns-setup-wizard.tsx
interface DNSRecord {
  id: string;
  type: 'TXT' | 'MX' | 'CNAME';
  name: string;
  value: string;
  priority?: number;
  purpose: string;
  required: boolean;
}

interface DNSSetupWizardProps {
  domain: string;
  onComplete: () => void;
  onCancel: () => void;
}
```

### Features:
- Auto-detect DNS provider from WHOIS
- Provider-specific setup instructions
- Copy-to-clipboard for DNS records
- Real-time DNS propagation checking
- Video tutorials per provider
- Progress tracking

## Phase 3: Automated Setup (Week 3-4)

### Cloudflare Integration
```typescript
// lib/dns-providers/cloudflare.ts
export class CloudflareProvider {
  async createZone(domain: string): Promise<string>;
  async addRecord(zoneId: string, record: DNSRecord): Promise<void>;
  async verifyRecords(domain: string): Promise<VerificationResult>;
}
```

### Provider Detection
```typescript
// lib/dns-detection.ts
export async function detectDNSProvider(domain: string): Promise<DNSProvider> {
  const whoisData = await whois(domain);
  const nameservers = await getNameservers(domain);
  
  if (nameservers.includes('cloudflare')) return 'cloudflare';
  if (nameservers.includes('godaddy')) return 'godaddy';
  // ... etc
  
  return 'unknown';
}
```

## Phase 4: SendGrid Integration (Week 4)

### Domain Authentication
```typescript
// lib/sendgrid-integration.ts
export class SendGridDomainManager {
  async authenticateDomain(domain: string): Promise<AuthResult>;
  async createInboundParse(subdomain: string): Promise<void>;
  async validateDomain(domain: string): Promise<ValidationResult>;
}
```

### Reply Routing Setup
```typescript
// Automatic reply subdomain setup
const replyDomain = `reply.${clientDomain}`;
await sendgrid.createInboundParse(replyDomain, {
  url: 'https://app.leadsup.io/api/webhooks/sendgrid',
  spam_check: true,
  send_raw: true
});
```