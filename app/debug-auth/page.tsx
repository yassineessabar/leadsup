'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function DebugAuth() {
  const [authState, setAuthState] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session:', session)
      console.log('Session error:', sessionError)

      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User:', user)
      console.log('User error:', userError)

      setAuthState({
        session,
        user,
        sessionError,
        userError
      })

      // If we have a user, check their profile
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        console.log('Profile:', profileData)
        console.log('Profile error:', profileError)
        
        setProfile({
          data: profileData,
          error: profileError
        })
      }
    } catch (error) {
      console.error('Debug error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading authentication debug...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Session Status</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(authState?.session, null, 2)}
          </pre>
          {authState?.sessionError && (
            <p className="text-red-600 mt-2">Session Error: {authState.sessionError.message}</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">User Status</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(authState?.user, null, 2)}
          </pre>
          {authState?.userError && (
            <p className="text-red-600 mt-2">User Error: {authState.userError.message}</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Profile Status</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(profile?.data, null, 2)}
          </pre>
          {profile?.error && (
            <p className="text-red-600 mt-2">Profile Error: {profile.error.message}</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Admin Status</h2>
          {profile?.data ? (
            <div>
              <p><strong>Is Admin:</strong> {profile.data.is_admin ? '✅ YES' : '❌ NO'}</p>
              <p><strong>User ID:</strong> {profile.data.user_id}</p>
            </div>
          ) : (
            <p className="text-yellow-600">No profile data available</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <div className="space-x-4">
            <button
              onClick={checkAuth}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Auth State
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Try Admin Panel
            </button>
            <button
              onClick={() => window.location.href = '/auth/signin'}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}