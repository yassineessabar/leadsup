-- Add SendGrid integration fields to sender_accounts table
-- This enables automatic sender identity creation and tracking

-- First check if sender_accounts table exists
DO $$ 
BEGIN
    -- Add sendgrid_sender_id field if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'sendgrid_sender_id'
    ) THEN
        ALTER TABLE sender_accounts ADD COLUMN sendgrid_sender_id TEXT;
        COMMENT ON COLUMN sender_accounts.sendgrid_sender_id IS 'SendGrid verified sender identity ID';
    END IF;
    
    -- Add sendgrid_status field if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'sendgrid_status'
    ) THEN
        ALTER TABLE sender_accounts ADD COLUMN sendgrid_status TEXT DEFAULT 'pending';
        COMMENT ON COLUMN sender_accounts.sendgrid_status IS 'SendGrid sender verification status: pending, verified, failed';
    END IF;
    
    -- Add sendgrid_created_at field if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'sendgrid_created_at'
    ) THEN
        ALTER TABLE sender_accounts ADD COLUMN sendgrid_created_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN sender_accounts.sendgrid_created_at IS 'When SendGrid sender identity was created';
    END IF;
    
    -- Add sendgrid_error field if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'sendgrid_error'
    ) THEN
        ALTER TABLE sender_accounts ADD COLUMN sendgrid_error TEXT;
        COMMENT ON COLUMN sender_accounts.sendgrid_error IS 'Error message if SendGrid setup failed';
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sender_accounts_sendgrid_status ON sender_accounts(sendgrid_status);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_sendgrid_sender_id ON sender_accounts(sendgrid_sender_id);