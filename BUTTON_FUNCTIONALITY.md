# Button Functionality - Python Script Integration

## Two Separate Buttons in Campaign Contacts Tab

### 1. "Find Profiles" Button (Blue Outline)
**What it does:**
- Runs `python find_profiles.py` with the form fields
- Command executed: `python find_profiles.py "fitness" "Sydney" "Retail" 1 --campaign-id {campaignId} --user-id {userId}`

**Purpose:**
- Searches LinkedIn for profiles matching the criteria
- Saves found profiles to `public.profiles` table
- Does NOT attempt to find emails
- Good for building a prospect list first

### 2. "Enrich Emails" Button (Green)
**What it does:**
- Runs `python get_emails.py`
- Command executed: `python get_emails.py`

**Purpose:**
- Reads existing profiles from the database
- Uses FinalScout to find email addresses
- Opens contact details for profiles with emails
- Saves enriched contacts to `public.contacts` table
- Marks profiles as enriched

## Workflow

### Typical Usage:
1. **First**: Click "Find Profiles" to discover LinkedIn profiles
2. **Then**: Click "Enrich Emails" to get email addresses for those profiles

### Auto-trigger on Campaign Creation:
- When a campaign is created with keyword/location/industry, it automatically runs "Find Profiles" in the background
- User can then manually run "Enrich Emails" when ready

## Form Fields Used

The "Find Profiles" button uses these form fields:
- **Keyword**: Search term (e.g., "fitness")
- **Location**: Geographic location (e.g., "Sydney") 
- **Industry**: Industry filter (e.g., "Retail")
- **Max Pages**: Number of search result pages (default: 1)

The "Enrich Emails" button doesn't need form fields - it works on existing profiles in the database.

## Real-time Updates

Both buttons show:
- Live progress updates
- Profile count as they're found
- Contact count as emails are enriched
- Status changes (running/completed/failed)

## Error Handling

- Scripts timeout after reasonable periods
- Failed operations update campaign status to 'failed'
- User sees toast notifications for all status changes
- "Stop" button available while running

## Database Impact

- **Find Profiles**: Adds rows to `profiles` table
- **Enrich Emails**: Adds rows to `contacts` table and updates `profiles.enriched = true`