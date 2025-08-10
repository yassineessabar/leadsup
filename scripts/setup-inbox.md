# Setup Inbox Database Table

The inbox functionality requires a database table to store email messages from campaigns. Follow these steps to set it up:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `scripts/create-inbox-table.sql`

## Option 2: Using Command Line

```bash
# If you have psql installed and configured
psql -h your-supabase-host -U postgres -d postgres -f scripts/create-inbox-table.sql
```

## Option 3: Manual Setup

Copy and paste the SQL from `scripts/create-inbox-table.sql` into your Supabase SQL editor.

## What This Creates

- **inbox_emails table**: Stores all email messages from campaigns
- **Indexes**: For optimal query performance
- **Sample data**: A few test emails to verify functionality
- **Triggers**: Automatic timestamp updates

## Features Enabled

Once the table is created, the inbox will support:

✅ **Real message storage** instead of sample data  
✅ **Campaign filtering** - filter by specific campaigns  
✅ **Folder organization** - inbox, sent, drafts, etc.  
✅ **Status management** - lead, interested, won, etc.  
✅ **Search functionality** - search across all messages  
✅ **Message actions** - reply, forward, archive, delete  

## Verification

After running the script, test the inbox:

1. Go to `/?tab=inbox` 
2. You should see sample messages with campaign context
3. Try filtering by different campaigns and statuses
4. Verify message actions work properly

## Troubleshooting

If you see errors about missing tables, make sure:
- The SQL script ran successfully
- Your user has proper database permissions
- The campaigns table exists (required for foreign key)

The inbox will gracefully fall back to sample data if the table doesn't exist, but real functionality requires the database table.