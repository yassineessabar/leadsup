# 🔧 Database Migration Troubleshooting Guide

## Common Issues and Solutions

### ❌ Error: "column already exists"
```
ERROR: column "company_name" of relation "campaigns" already exists
```
**Solution:** This is normal! It means the column was already added previously. Continue with the rest of the migration.

### ❌ Error: "relation already exists"  
```
ERROR: relation "campaign_ai_assets" already exists
```
**Solution:** The table was already created. Skip the CREATE TABLE statement and continue.

### ❌ Error: "syntax error at or near IF"
```
ERROR: syntax error at or near "IF"
```
**Solution:** Your PostgreSQL version doesn't support `IF NOT EXISTS` for that object type. Use the **ultra-simple migration** instead.

### ❌ Error: "policy already exists"
```
ERROR: policy "campaign_ai_assets_policy" for table "campaign_ai_assets" already exists
```
**Solution:** The policy was already created. This is safe to ignore.

## 🚀 Recommended Migration Steps

### Step 1: Use Ultra-Simple Migration (Safest)
```sql
-- Copy contents of: database-migration-ultra-simple.sql
-- Paste into Supabase SQL Editor
-- Run the entire script
-- Ignore "already exists" errors
```

### Step 2: If Ultra-Simple Fails, Try Manual Steps
Run each command individually:

```sql
-- Add columns one by one
ALTER TABLE campaigns ADD COLUMN company_name TEXT;
ALTER TABLE campaigns ADD COLUMN website TEXT;
ALTER TABLE campaigns ADD COLUMN main_activity TEXT;
-- ... continue with other columns

-- Create table
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

-- Create index
CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);

-- Enable RLS
ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "campaign_ai_assets_policy" 
ON campaign_ai_assets
USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
```

### Step 3: Verify Migration Success
Run this query to check if everything was created:

```sql
-- Check campaigns table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('company_name', 'website', 'main_activity');

-- Check if campaign_ai_assets table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'campaign_ai_assets';
```

Expected results:
- Should see `company_name`, `website`, `main_activity` columns
- Should see `campaign_ai_assets` table

## 🩺 Testing the Feature

After migration, test the AI campaign feature:

1. **Start your app**: `npm run dev`
2. **Create a campaign** through the UI
3. **Fill in company details** including main activity
4. **Click "Next"** and watch for AI generation
5. **Check server logs** for success messages

### Expected Log Messages
```
🤖 Generating AI assets for campaign...
💾 Saving AI assets to database...  
✅ AI assets saved successfully
```

### If AI Generation Fails
The feature has fallbacks:
- ✅ Works without OpenAI API key (uses sample data)
- ✅ Works without campaign_ai_assets table (memory only)
- ✅ Works with basic campaigns table (saves basic info)

## 🆘 Still Having Issues?

### Quick Test: Skip Migration Entirely
The feature is designed to work even without the migration:
1. Don't run any migration
2. Test creating a campaign
3. It will use fallback sample data
4. Campaign will still be created with basic fields

### Manual Verification
```sql
-- Test basic campaign creation
INSERT INTO campaigns (user_id, name, type, status) 
VALUES ('test-user-id', 'Test Campaign', 'Sequence', 'Draft');

-- If this works, the core functionality is fine
```

### Supabase-Specific Issues
- Make sure you're running SQL in the **SQL Editor**, not the Table Editor
- Use **Service Role Key** if you get permission errors
- Check **Row Level Security** settings if policies fail

## 📞 Feature Status Without Migration

Even without the full migration, you get:
- ✅ Campaign creation (basic fields)
- ✅ AI asset generation (in memory)
- ✅ Frontend display of AI assets
- ✅ Complete user experience
- ❌ AI assets not persisted to database (regenerated each time)

The migration just adds persistence and enhanced campaign metadata!