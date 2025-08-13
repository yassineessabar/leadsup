-- Create the set_default_sender function in Supabase
-- This function ensures only one sender is default per domain

CREATE OR REPLACE FUNCTION public.set_default_sender(sender_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_domain_id UUID;
BEGIN
  -- Get the domain_id for this sender
  SELECT domain_id INTO sender_domain_id
  FROM sender_accounts
  WHERE id = sender_id;
  
  -- Check if sender exists
  IF sender_domain_id IS NULL THEN
    RAISE EXCEPTION 'Sender with ID % not found', sender_id;
  END IF;
  
  -- Unset all other defaults for this domain
  UPDATE sender_accounts
  SET is_default = false
  WHERE domain_id = sender_domain_id
    AND id != sender_id;
  
  -- Set this sender as default
  UPDATE sender_accounts
  SET is_default = true
  WHERE id = sender_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_default_sender(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_sender(UUID) TO service_role;

-- Add comment to function
COMMENT ON FUNCTION public.set_default_sender(UUID) IS 'Sets a sender account as the default for its domain, ensuring only one default per domain';