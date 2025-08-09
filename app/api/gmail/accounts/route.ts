import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'

export async function GET(request: NextRequest) {
  try {
    // Get current user ID from session
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Try to get connected Gmail accounts for the user
    console.log('Fetching Gmail accounts for user:', userId)
    
    const { data: accounts, error } = await supabaseServer
      .from('gmail_accounts')
      .select('id, email, name, profile_picture, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      // Check if table doesn't exist
      if (error.message?.includes('relation "gmail_accounts" does not exist') || 
          error.message?.includes('relation "public.gmail_accounts" does not exist')) {
        console.log('Gmail accounts table does not exist. Please run the database migration.')
        return NextResponse.json(
          { error: 'Gmail accounts table not found. Database setup required.' },
          { status: 503 }
        )
      }
      
      // Check if profile_picture column doesn't exist - fallback to basic query
      if (error.message?.includes('column gmail_accounts.profile_picture does not exist')) {
        console.log('Profile picture column not found, falling back to basic query')
        const { data: accounts, error: fallbackError } = await supabaseServer
          .from('gmail_accounts')
          .select('id, email, name, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (fallbackError) {
          console.error('Fallback database error:', fallbackError)
          return NextResponse.json(
            { error: 'Failed to fetch accounts' },
            { status: 500 }
          )
        }
        
        console.log('Found Gmail accounts (no profile pics):', accounts?.length || 0)
        return NextResponse.json(accounts || [])
      }
      
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      )
    }
    
    console.log('Found Gmail accounts:', accounts?.length || 0)

    return NextResponse.json(accounts || [])
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}