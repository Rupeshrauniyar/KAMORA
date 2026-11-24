import { createBrowserClient } from '@supabase/ssr';

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseBrowserConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  return Boolean(
    url &&
      key &&
      !url.includes('your-project-ref') &&
      !key.includes('your-supabase') &&
      !key.includes('sb_publishable_your_key')
  );
}

let browserClientSingleton: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Singleton browser Supabase client with durable 30-day cookie persistence
 * and automatic token refresh so users stay signed in across reloads & tabs.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();

  if (!url || !key) {
    throw new Error(
      'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) are not configured.'
    );
  }

  if (browserClientSingleton) return browserClientSingleton;

  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';

  browserClientSingleton = createBrowserClient(url, key, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: isHttps,
      maxAge: THIRTY_DAYS_SECONDS,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClientSingleton;
}
