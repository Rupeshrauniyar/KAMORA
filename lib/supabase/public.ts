import 'server-only';
import { createClient } from '@supabase/supabase-js';

function getPublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isPublicSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getPublicKey();
  return Boolean(
    url &&
      key &&
      !url.includes('your-project-ref') &&
      !key.includes('your-supabase') &&
      !key.includes('sb_publishable_your_key')
  );
}

let cachedPublicClient: ReturnType<typeof createClient> | null = null;

/**
 * Cookie-free read-only Supabase client for public catalog/content queries.
 * Does NOT call Next.js cookies(), allowing ISR & unstable_cache for sub-50ms navigation.
 */
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getPublicKey();
  if (!url || !key) {
    throw new Error('Public Supabase environment variables are not configured.');
  }
  if (!cachedPublicClient) {
    cachedPublicClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedPublicClient;
}
