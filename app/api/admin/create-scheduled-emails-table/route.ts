import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Create the scheduled_emails table if it doesn't exist
    const { data, error } = await supabase.rpc('create_scheduled_emails_table', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS scheduled_emails (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          campaign_id UUID NOT NULL,
          contact_id UUID NOT NULL,
          step INTEGER NOT NULL,
          subject TEXT NOT NULL,
          scheduled_date TIMESTAMPTZ NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paused', 'cancelled', 'failed')),
          sent_at TIMESTAMPTZ NULL,
          error_message TEXT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          CONSTRAINT fk_scheduled_emails_campaign 
            FOREIGN KEY (campaign_id) 
            REFERENCES campaigns(id) 
            ON DELETE CASCADE,
            
          CONSTRAINT fk_scheduled_emails_contact 
            FOREIGN KEY (contact_id) 
            REFERENCES contacts(id) 
            ON DELETE CASCADE
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_id ON scheduled_emails(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_contact_id ON scheduled_emails(contact_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_date ON scheduled_emails(scheduled_date);
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_step ON scheduled_emails(step);

        -- Create a composite index for common queries
        CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_status_date 
          ON scheduled_emails(campaign_id, status, scheduled_date);

        -- Add trigger for updated_at
        CREATE OR REPLACE FUNCTION update_scheduled_emails_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER IF NOT EXISTS trigger_scheduled_emails_updated_at
          BEFORE UPDATE ON scheduled_emails
          FOR EACH ROW
          EXECUTE FUNCTION update_scheduled_emails_updated_at();
      `
    })

    if (error) {
      console.error('Error creating scheduled_emails table:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('✅ Successfully created scheduled_emails table and indexes')
    return NextResponse.json({ 
      success: true, 
      message: 'Scheduled emails table created successfully' 
    })

  } catch (error) {
    console.error('❌ Error in create scheduled emails table endpoint:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}