import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeAuthCookieOptions } from '@/lib/supabase/cookie-options';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-allowlist';

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publicKey || url.includes('your-project-ref')) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', request.nextUrl.pathname);
      loginUrl.searchParams.set('reason', 'supabase_not_configured');
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Never intercept /api/auth/* routes (prevents racing with OAuth PKCE code_verifier cookies)
  if (pathname.startsWith('/api/auth/')) {
    return supabaseResponse;
  }

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/account');
  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith('sb-') &&
        c.name.includes('auth-token') &&
        !c.name.includes('code-verifier')
    );

  // Fast-path: anonymous visitors on public pages skip unnecessary auth round-trip
  if (!isProtected && !hasAuthCookie) {
    return supabaseResponse;
  }

  const isHttps = request.nextUrl.protocol === 'https:';
  let response = supabaseResponse;

  const supabase = createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Parameters<typeof response.cookies.set>[2];
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(
            name,
            value,
            normalizeAuthCookieOptions(options, isHttps, value)
          )
        );
      },
    },
  });

  // Refreshes expired access tokens silently via refresh token cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith('/account') && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const allowlisted = isAuthorizedAdminEmail(user.email, user.email_confirmed_at);

    if (!allowlisted) {
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!adminRecord) {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = '/';
        homeUrl.searchParams.set('auth', 'forbidden');
        return NextResponse.redirect(homeUrl);
      }
    }
  }

  return response;
}
