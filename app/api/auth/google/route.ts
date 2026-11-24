import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeAuthCookieOptions } from '@/lib/supabase/cookie-options';

export const dynamic = 'force-dynamic';

/**
 * Server-initiated Google OAuth PKCE route.
 * Sets the PKCE code-verifier cookie directly on the HTTP response on the exact same
 * origin/host that /api/auth/callback will receive, preventing PKCE verifier mismatch.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publicKey) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  const isHttps = request.nextUrl.protocol === 'https:';
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<NextResponse['cookies']['set']>[2];
  }[] = [];

  const supabase = createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<NextResponse['cookies']['set']>[2];
        }[]
      ) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    const msg = encodeURIComponent(error?.message ?? 'Could not start Google OAuth.');
    return NextResponse.redirect(`${origin}/login?error=oauth_start_failed&detail=${msg}`);
  }

  const response = NextResponse.redirect(data.url);
  for (const c of pendingCookies) {
    response.cookies.set(
      c.name,
      c.value,
      normalizeAuthCookieOptions(c.options, isHttps, c.value)
    );
  }
  return response;
}
