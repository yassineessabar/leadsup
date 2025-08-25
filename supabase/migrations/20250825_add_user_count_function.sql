-- Add function to get total user count from users table
-- This function can be called by the service role to get accurate user count

CREATE OR REPLACE FUNCTION get_total_user_count()
RETURNS integer
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM users;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_total_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_user_count() TO service_role;