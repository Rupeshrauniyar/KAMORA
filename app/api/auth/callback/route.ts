import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizeAuthCookieOptions } from '@/lib/supabase/cookie-options';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error_description') || searchParams.get('error');
  const requestedNext = searchParams.get('next');

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_provider_error&detail=${encodeURIComponent(oauthError)}`
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !url || !publicKey) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${encodeURIComponent(
        'Missing authorization code or Supabase configuration.'
      )}`
    );
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('[GET /api/auth/callback] exchangeCodeForSession failed:', error?.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&detail=${encodeURIComponent(
        error?.message ?? 'Could not complete Google sign-in.'
      )}`
    );
  }

  await ensureUserProfile(data.user);

  // If an authorized admin signs in with Google (e.g. kamoraind@gmail.com) and no specific page was requested, go to /admin
  const isAdmin = isAuthorizedAdminEmail(data.user.email, data.user.email_confirmed_at);
  const defaultDest = isAdmin ? '/admin' : '/account';
  const rawNext =
    requestedNext && requestedNext !== '/account'
      ? requestedNext
      : isAdmin
      ? '/admin'
      : requestedNext ?? defaultDest;
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : defaultDest;

  const response = NextResponse.redirect(`${origin}${safeNext}`);
  for (const c of pendingCookies) {
    response.cookies.set(
      c.name,
      c.value,
      normalizeAuthCookieOptions(c.options, isHttps, c.value)
    );
  }
  return response;
}
