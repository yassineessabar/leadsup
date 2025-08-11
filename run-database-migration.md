# Database Migration Guide

## Issue: Keywords, Location, Industry Not Being Saved

If your campaigns are not saving keywords, location, and industry fields, it means the database migration hasn't been run yet.

## ✅ Enhanced API with Detailed Logging

The progressive campaign creation API now includes:
- **Detailed logging** to show exactly what's happening
- **Smart fallback** that tries to add fields even if initial insert fails
- **Clear error messages** when migration is needed

## 🔍 How to Check What's Happening

When you create a campaign, check your server console logs for:

### ✅ **If Migration is Complete:**
```
🔍 Keywords received in API: ["marketing", "sales", "automation"]
💾 Campaign data being saved: { keywords: [...], industry: "Technology", location: "New York" }
✅ Campaign saved to database: { id: "...", keywords: [...], industry: "Technology", location: "New York" }
```

### ⚠️ **If Migration is Missing:**
```
🔍 Keywords received in API: ["marketing", "sales", "automation"]
💾 Campaign data being saved: { keywords: [...], industry: "Technology", location: "New York" }
❌ Database error: column "keywords" of relation "campaigns" does not exist
🔄 Retrying with basic campaign fields only...
✅ Basic campaign created, now trying to add additional fields...
⚠️ Could not add additional fields: column "keywords" of relation "campaigns" does not exist
💡 Please run the database migration to enable all campaign fields:
   psql [connection-string] -f database-migration-ultra-simple.sql
```

## 🛠️ How to Run Database Migration

### Option 1: Using psql (Recommended)
```bash
# Connect to your database and run the migration
psql "your-connection-string" -f database-migration-ultra-simple.sql
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database-migration-ultra-simple.sql`
4. Run the SQL

### Option 3: Copy-Paste SQL Commands
```sql
-- Add columns to campaigns table
ALTER TABLE campaigns ADD COLUMN company_name TEXT;
ALTER TABLE campaigns ADD COLUMN website TEXT;
ALTER TABLE campaigns ADD COLUMN no_website BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN language TEXT DEFAULT 'English';
ALTER TABLE campaigns ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ADD COLUMN main_activity TEXT;
ALTER TABLE campaigns ADD COLUMN location TEXT;
ALTER TABLE campaigns ADD COLUMN industry TEXT;
ALTER TABLE campaigns ADD COLUMN product_service TEXT;
ALTER TABLE campaigns ADD COLUMN goals TEXT;

-- Create campaign_ai_assets table
CREATE TABLE campaign_ai_assets (
  id BIGSERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  icps JSONB,
  personas JSONB,
  pain_points JSONB,
  value_propositions JSONB,
  email_sequences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes and security
CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);
ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_ai_assets_policy" ON campaign_ai_assets
USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
```

## ✅ After Migration

Once the migration is complete:
1. **Create a new campaign** with keywords, industry, and location
2. **Check server logs** - you should see successful save messages
3. **Go to Contact tab** - keywords should appear in Contact Scrapping section
4. **Verify in database** - campaign record should have all fields populated

## 🔧 Troubleshooting

### If migration fails with "column already exists":
This is normal - it means some columns were already added. The migration script handles this gracefully.

### If you still don't see fields after migration:
1. Restart your development server
2. Clear browser cache
3. Create a new campaign (existing campaigns may not have the fields)
4. Check server console logs for any remaining errors

## 📞 Need Help?
The enhanced API will tell you exactly what's happening via console logs. If you're still having issues, share the console output when creating a campaign.