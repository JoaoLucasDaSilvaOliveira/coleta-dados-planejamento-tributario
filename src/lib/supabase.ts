import { createClient } from '@supabase/supabase-js'
import { runtimeConfig } from './config'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  runtimeConfig.VITE_SUPABASE_URL,
  runtimeConfig.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  },
)
