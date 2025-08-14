# Python Scraping Integration

## Overview
This integration allows the Node.js application to execute Python scripts that scrape LinkedIn profiles and enrich them with email addresses using FinalScout.

## Components Created

### 1. **Scraping Service** (`lib/scraping-service.ts`)
- Orchestrates Python script execution
- Manages scraping job lifecycle
- Updates campaign status in Supabase
- Provides progress tracking

### 2. **API Endpoint** (`app/api/campaigns/[id]/scraping/route.ts`)
- **POST**: Start scraping for a campaign
- **GET**: Get scraping status and progress
- **DELETE**: Stop ongoing scraping

### 3. **Real-time Updates Hook** (`hooks/use-scraping-updates.tsx`)
- Subscribes to Supabase real-time updates
- Monitors profiles and contacts tables
- Provides live progress updates to UI

### 4. **UI Integration** (Updated `components/campaign-dashboard.tsx`)
- "Start Scraping" button in Contacts tab
- Real-time progress display
- Status indicators (idle/running/completed/failed)

### 5. **Auto-trigger on Campaign Creation** (Updated `app/api/campaigns/create/route.ts`)
- Automatically starts scraping when a new campaign is created
- Only triggers if campaign has keyword, location, and industry

## Database Changes Required

Run this SQL in your Supabase SQL editor:

```sql
-- Add scraping status columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS scraping_status TEXT DEFAULT 'idle' 
  CHECK (scraping_status IN ('idle', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS scraping_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_scraping_status ON campaigns(scraping_status);
```

## Python Scripts Integration

The system expects two Python scripts in the `python/` directory:

### 1. `find_profiles.py`
```bash
python3 find_profiles.py <keyword> <location> <industry> <max_pages> \
  --campaign-id <UUID> --user-id <UUID>
```
- Scrapes LinkedIn profiles based on search criteria
- Saves profiles to `public.profiles` table
- Marks profiles with campaign_id and user_id

### 2. `get_emails.py`
```bash
python3 get_emails.py --campaign-id <UUID> --user-id <UUID>
```
- Reads non-enriched profiles from database
- Uses FinalScout to find emails
- Opens Contacts modal for detailed information
- Saves enriched contacts to `public.contacts` table
- Marks profiles as enriched

## Workflow

### Automatic Trigger (Campaign Creation)
1. User creates campaign with keyword, location, industry
2. System automatically starts scraping in background
3. Python scripts run sequentially:
   - `find_profiles.py` discovers LinkedIn profiles
   - `get_emails.py` enriches profiles with emails
4. UI updates in real-time as contacts are found

### Manual Trigger (Contacts Tab)
1. User navigates to Campaign → Contacts tab
2. Fills in scraping criteria (keyword, location, industry)
3. Clicks "Start Scraping" button
4. Same process as automatic trigger

## Real-time Updates

The UI subscribes to Supabase real-time events:
- Profile insertions/updates in `profiles` table
- Contact insertions in `contacts` table  
- Campaign status updates in `campaigns` table

Progress is displayed showing:
- Total profiles found
- Profiles enriched with emails
- Total contacts created

## Environment Variables

Ensure these are set in your `.env` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Testing

1. Create a new campaign with keyword, location, and industry
2. Check if scraping starts automatically
3. Navigate to Contacts tab to see progress
4. Verify contacts appear in real-time
5. Test manual "Start Scraping" button
6. Test "Stop Scraping" functionality

## Error Handling

- Scripts timeout after 10 minutes
- Failed scripts update campaign status to 'failed'
- Errors are logged to console
- User sees toast notifications for status changes

## Security Considerations

- Python scripts run with environment variables passed
- No shell injection possible (using spawn with args array)
- Campaign ownership verified before operations
- Rate limiting should be implemented in Python scripts

## Future Enhancements

1. Add queue system for multiple campaigns
2. Implement retry logic for failed enrichments
3. Add scheduling for periodic scraping
4. Provide detailed error messages to UI
5. Add export functionality for scraped data
6. Implement scraping limits per user/plan