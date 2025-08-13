-- Create missing database functions for sender accounts

-- Function to set default sender (ensures only one default per domain)
CREATE OR REPLACE FUNCTION set_default_sender(sender_id UUID)
RETURNS VOID AS $$
DECLARE
  target_domain_id UUID;
BEGIN
  -- Get the domain_id for the sender
  SELECT domain_id INTO target_domain_id FROM sender_accounts WHERE id = sender_id;
  
  -- Remove default from all other senders in this domain
  UPDATE sender_accounts 
  SET is_default = FALSE 
  WHERE domain_id = target_domain_id AND id != sender_id;
  
  -- Set this sender as default
  UPDATE sender_accounts 
  SET is_default = TRUE 
  WHERE id = sender_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get default sender for a domain
CREATE OR REPLACE FUNCTION get_default_sender(target_domain_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sa.id, sa.email, sa.display_name
  FROM sender_accounts sa
  WHERE sa.domain_id = target_domain_id 
    AND sa.is_default = TRUE 
    AND sa.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'Missing database functions created successfully! 📧' as status;