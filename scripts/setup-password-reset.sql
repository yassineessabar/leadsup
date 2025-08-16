-- Setup password reset tokens table with proper permissions

-- Drop existing table if it exists (for fresh setup)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for performance
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Disable RLS for this table since it's only accessed by server-side code
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON password_reset_tokens TO postgres;
GRANT ALL ON password_reset_tokens TO service_role;

-- Optional: Create a cleanup function to remove expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_reset_tokens() TO service_role;