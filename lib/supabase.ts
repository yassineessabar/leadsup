import { createClient } from "@supabase/supabase-js"

// Singleton pattern for client-side Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null
let supabaseServerClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables")
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}

// Server-side client with service role permissions (bypasses RLS)
export const getSupabaseServerClient = () => {
  if (!supabaseServerClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase server environment variables")
    }
    
    supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  }
  return supabaseServerClient
}

export const supabase = getSupabaseClient()
export const supabaseServer = getSupabaseServerClient()
