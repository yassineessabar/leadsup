-- Create smtp_accounts table
CREATE TABLE IF NOT EXISTS smtp_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_user TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    imap_host TEXT,
    imap_port INTEGER,
    imap_secure BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_smtp_accounts_user_id ON smtp_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_smtp_accounts_email ON smtp_accounts(email);

-- Add comments
COMMENT ON TABLE smtp_accounts IS 'SMTP/IMAP accounts for direct email server integration';
COMMENT ON COLUMN smtp_accounts.user_id IS 'Reference to the user who owns this account';
COMMENT ON COLUMN smtp_accounts.name IS 'Display name for the account';
COMMENT ON COLUMN smtp_accounts.email IS 'Email address associated with the account';
COMMENT ON COLUMN smtp_accounts.smtp_host IS 'SMTP server hostname';
COMMENT ON COLUMN smtp_accounts.smtp_port IS 'SMTP server port (usually 25, 465, or 587)';
COMMENT ON COLUMN smtp_accounts.smtp_secure IS 'Whether to use SSL/TLS for SMTP';
COMMENT ON COLUMN smtp_accounts.smtp_user IS 'SMTP authentication username';
COMMENT ON COLUMN smtp_accounts.smtp_password IS 'SMTP authentication password';
COMMENT ON COLUMN smtp_accounts.imap_host IS 'IMAP server hostname (optional)';
COMMENT ON COLUMN smtp_accounts.imap_port IS 'IMAP server port (usually 143 or 993)';
COMMENT ON COLUMN smtp_accounts.imap_secure IS 'Whether to use SSL/TLS for IMAP';