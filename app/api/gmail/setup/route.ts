import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Create Gmail accounts table if it doesn't exist
    const { error } = await supabaseServer.rpc('exec_sql', {
      sql: `
        -- Create Gmail accounts table for storing OAuth tokens and account info
        CREATE TABLE IF NOT EXISTS gmail_accounts (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL,
          email text NOT NULL,
          name text,
          access_token text NOT NULL,
          refresh_token text,
          expires_at timestamp with time zone NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          
          -- Ensure one Gmail account per email per user
          UNIQUE(user_id, email)
        );

        -- Create indexes for faster lookups
        CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_gmail_accounts_email ON gmail_accounts(email);
      `
    })

    if (error) {
      console.error('Database setup error:', error)
      return NextResponse.json(
        { error: 'Failed to setup database table' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Gmail accounts table created successfully' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup Gmail integration' },
      { status: 500 }
    )
  }
}