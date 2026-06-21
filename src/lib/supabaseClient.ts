import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * M10.1 — Single typed Supabase client, used everywhere instead of GraphQL/
 * REST-by-hand. `src/types/database.ts` is generated (see M7.6 / `npm run
 * gen-types`) and is the binding contract for every table/RPC shape below.
 *
 * Gated by VITE_USE_MOCKS: when true (the default in dev unless explicitly
 * overridden), MSW continues to intercept fetch() calls exactly as it has
 * since M1, and this client is unused. Flipping VITE_USE_MOCKS=false is what
 * actually activates the M10 integration — see src/main.tsx.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

if (!USE_MOCKS && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  // Fail loudly at startup rather than producing confusing downstream
  // "fetch failed" errors with no indication of why.
  throw new Error(
    'VITE_USE_MOCKS=false but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill in your local or hosted Supabase project values.',
  )
}

export const supabase = createClient<Database>(
  SUPABASE_URL ?? 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY ?? 'placeholder-anon-key-mocks-active',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/**
 * Thin wrapper around supabase.rpc that throws a normal Error with the
 * Postgres error message intact, so existing UI error-handling (toasts,
 * etc.) that expects `Error` objects keeps working without each call site
 * needing to know about PostgrestError's shape.
 */
export async function callRpc<T = unknown>(
  fn: Parameters<typeof supabase.rpc>[0],
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    throw new Error(error.message, { cause: error })
  }
  return data as T
}
