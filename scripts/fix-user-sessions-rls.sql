-- Fix RLS policies for user_sessions table
-- This script creates the missing RLS policies that are causing session creation errors

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can read their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON user_sessions;

-- Create RLS policies for user_sessions table

-- Allow authenticated users to insert their own sessions
CREATE POLICY "Users can create their own sessions" ON user_sessions
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text::uuid);

-- Allow users to read their own sessions
CREATE POLICY "Users can read their own sessions" ON user_sessions
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text::uuid);

-- Allow users to delete their own sessions (for logout)
CREATE POLICY "Users can delete their own sessions" ON user_sessions
FOR DELETE 
TO authenticated
USING (user_id = auth.uid()::text::uuid);

-- Allow service role (backend) to manage all sessions
-- This is needed for custom authentication system
CREATE POLICY "Service role can manage all sessions" ON user_sessions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'user_sessions RLS policies created successfully! 🎉' as status;