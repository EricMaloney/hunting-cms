import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!(url && key && !url.includes('placeholder') && key !== 'placeholder')
}

/**
 * Returns the Supabase admin client, lazily initialised.
 * Throws only when called, not at import/module-load time.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isConfigured()) {
    throw new Error(
      'Supabase is not configured yet. Fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file.'
    )
  }

  _client = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _client
}

/**
 * Supabase server admin client proxy.
 * Lazily initialised — safe to import even before env vars are set.
 * Use ONLY in API routes and Server Components. Never expose to the browser.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

/**
 * Helper to get a signed URL for a private storage object.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data) {
    console.error('Error creating signed URL:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Helper to upload a file to Supabase storage.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await getSupabaseAdmin().storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  })

  if (error) {
    return { url: null, error: error.message }
  }

  const { data } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
