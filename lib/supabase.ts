// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for frontend (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for backend API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface Comment {
  id: string
  username: string
  message: string
  anime_id: number
  episode_number: number
  created_at: string
}

export interface Rating {
  id: string
  username: string
  rating: number
  anime_id: number
  episode_number: number
  created_at: string
}