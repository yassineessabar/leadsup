-- Create Gmail accounts table for storing OAuth tokens and account info
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  profile_picture text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure one Gmail account per email per user
  UNIQUE(user_id, email)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own Gmail accounts
CREATE POLICY "Users can view their own Gmail accounts"
  ON gmail_accounts FOR SELECT
  USING (user_id IN (SELECT user_id FROM user_sessions WHERE session_token = current_setting('request.cookies.session', true)::text));

-- Policy: Users can insert their own Gmail accounts
CREATE POLICY "Users can insert their own Gmail accounts"
  ON gmail_accounts FOR INSERT
  WITH CHECK (user_id IN (SELECT user_id FROM user_sessions WHERE session_token = current_setting('request.cookies.session', true)::text));

-- Policy: Users can update their own Gmail accounts
CREATE POLICY "Users can update their own Gmail accounts"
  ON gmail_accounts FOR UPDATE
  USING (user_id IN (SELECT user_id FROM user_sessions WHERE session_token = current_setting('request.cookies.session', true)::text));

-- Policy: Users can delete their own Gmail accounts
CREATE POLICY "Users can delete their own Gmail accounts"
  ON gmail_accounts FOR DELETE
  USING (user_id IN (SELECT user_id FROM user_sessions WHERE session_token = current_setting('request.cookies.session', true)::text));

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_email ON gmail_accounts(email);