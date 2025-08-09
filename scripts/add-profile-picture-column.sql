-- Add profile_picture column to gmail_accounts table
ALTER TABLE gmail_accounts 
ADD COLUMN IF NOT EXISTS profile_picture text;

-- Add a comment to the column
COMMENT ON COLUMN gmail_accounts.profile_picture IS 'URL to the user Gmail profile picture from Google OAuth';