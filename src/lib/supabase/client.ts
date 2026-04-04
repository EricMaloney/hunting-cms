import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Returns the Supabase browser client, lazily initialised.
 * Throws only when called, not at import/module-load time.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL to your .env.local file.')
  }
  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder') {
    throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.')
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })

  return _client
}

/**
 * Supabase browser client proxy.
 * Lazily initialised — safe to import before env vars are set.
 * Use in Client Components only.
 */
export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
