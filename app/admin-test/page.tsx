'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AdminTest() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Admin Test Panel</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">User Status</h2>
          {user ? (
            <div>
              <p>✅ Signed in as: {user.email}</p>
              <p>User ID: {user.id}</p>
            </div>
          ) : (
            <p>❌ Not signed in</p>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Admin Status</h2>
          {profile ? (
            <div>
              {profile.is_admin ? (
                <p>✅ You are an admin!</p>
              ) : (
                <p>❌ You are not an admin</p>
              )}
            </div>
          ) : (
            <p>❌ No profile found</p>
          )}
        </div>

        {user && profile?.is_admin && (
          <div className="border p-4 rounded bg-green-50">
            <h2 className="text-xl font-semibold mb-2 text-green-800">🎉 Admin Panel Access</h2>
            <p className="text-green-700 mb-4">You have admin access! The main admin panel should work.</p>
            <button 
              onClick={() => window.location.href = '/admin'}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Go to Full Admin Panel
            </button>
          </div>
        )}

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.href = '/auth/signin'}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign In
            </button>
            <button 
              onClick={checkUser}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}