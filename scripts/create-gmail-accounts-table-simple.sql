-- Drop table if it exists (to fix any foreign key issues)
DROP TABLE IF EXISTS gmail_accounts;

-- Create Gmail accounts table for storing OAuth tokens and account info
CREATE TABLE gmail_accounts (
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

-- Create indexes for faster lookups
CREATE INDEX idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX idx_gmail_accounts_email ON gmail_accounts(email);