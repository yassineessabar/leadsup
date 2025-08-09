import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch Microsoft 365 accounts for the current user with graceful column handling
    let accounts = []
    let error = null

    try {
      // Try with the full set of columns first
      const result = await supabaseServer
        .from('microsoft365_accounts')
        .select('id, email, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      accounts = result.data
      error = result.error
    } catch (e) {
      console.log('Full column query failed, trying fallback')
      error = e
    }

    // If the main query failed, try with minimal columns
    if (error) {
      console.log('Trying fallback query with basic columns only')
      const result = await supabaseServer
        .from('microsoft365_accounts')
        .select('id, email, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (result.error) {
        console.error('Error fetching Microsoft 365 accounts:', result.error)
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
      }
      
      // Add default values for missing columns
      accounts = (result.data || []).map(account => ({
        ...account,
        name: account.email?.split('@')[0] || 'Microsoft 365 Account',
        updated_at: account.created_at
      }))
    }

    return NextResponse.json(accounts || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Delete the account
    const { error } = await supabaseServer
      .from('microsoft365_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting Microsoft 365 account:', error)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}