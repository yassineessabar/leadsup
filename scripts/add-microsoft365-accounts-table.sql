-- Create microsoft365_accounts table
CREATE TABLE IF NOT EXISTS microsoft365_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_microsoft365_accounts_user_id ON microsoft365_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft365_accounts_email ON microsoft365_accounts(email);
CREATE INDEX IF NOT EXISTS idx_microsoft365_accounts_expires_at ON microsoft365_accounts(expires_at);

-- Add comments
COMMENT ON TABLE microsoft365_accounts IS 'Microsoft 365 OAuth accounts for email integration';
COMMENT ON COLUMN microsoft365_accounts.user_id IS 'Reference to the user who owns this account';
COMMENT ON COLUMN microsoft365_accounts.email IS 'Microsoft 365 email address';
COMMENT ON COLUMN microsoft365_accounts.name IS 'Display name from Microsoft 365';
COMMENT ON COLUMN microsoft365_accounts.access_token IS 'OAuth access token for Microsoft Graph API';
COMMENT ON COLUMN microsoft365_accounts.refresh_token IS 'OAuth refresh token';
COMMENT ON COLUMN microsoft365_accounts.expires_at IS 'When the access token expires';